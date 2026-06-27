from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.billing_catalog import (
    CREDIT_PACKS,
    PREMIUM_CODE,
    PREMIUM_PRICE,
    PREMIUM_TITLE,
    get_credit_pack,
)
from app.config import settings
from app.deps import CurrentUser, DBSession
from app.models import BillingKind, BillingPayment, BillingStatus, User, UserPlan
from app.schemas import (
    BillingCatalog,
    BillingMe,
    CheckoutResponse,
    CreditCheckoutRequest,
    CreditPackRead,
    CulqiChargeRequest,
    CulqiChargeResult,
    PublicPaymentRead,
)
from app.services import billing_service, culqi_service
from app.services.events_service import events_created_count, is_premium_active

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/me", response_model=BillingMe)
def billing_me(current: CurrentUser, db: DBSession) -> BillingMe:
    """Plan state for the paywall: remaining events, credits, premium status."""
    premium = is_premium_active(current)
    created = events_created_count(db, current.id)
    if premium:
        remaining = None
    else:
        free_remaining = max(0, settings.free_event_limit - created)
        remaining = free_remaining + current.event_credits
    return BillingMe(
        plan=UserPlan.premium if premium else UserPlan.free,
        is_premium=premium,
        premium_until=current.premium_until,
        event_credits=current.event_credits,
        events_created=created,
        free_event_limit=settings.free_event_limit,
        events_remaining=remaining,
    )


@router.get("/catalog", response_model=BillingCatalog)
def catalog() -> BillingCatalog:
    """Productos comprables: packs de créditos y premium. Público."""
    return BillingCatalog(
        credit_packs=[
            CreditPackRead(code=p.code, credits=p.credits, price=p.price, title=p.title)
            for p in CREDIT_PACKS.values()
        ],
        premium_code=PREMIUM_CODE,
        premium_price=PREMIUM_PRICE,
        premium_title=PREMIUM_TITLE,
        currency=settings.currency,
    )


def _pay_url(bp: BillingPayment) -> str:
    """URL de la página de pago (en la landing) que carga Culqi Checkout."""
    return f"{settings.public_web_url.rstrip('/')}/pay?bp={bp.id}"


def _start_checkout(db, bp: BillingPayment) -> CheckoutResponse:
    if not culqi_service.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Pagos no disponibles: falta configurar Culqi.",
        )
    db.commit()
    return CheckoutResponse(billing_payment_id=bp.id, init_point=_pay_url(bp))


@router.post("/credits/checkout", response_model=CheckoutResponse)
def credits_checkout(
    payload: CreditCheckoutRequest, current: CurrentUser, db: DBSession
) -> CheckoutResponse:
    pack = get_credit_pack(payload.pack_code)
    if pack is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pack de créditos no encontrado")
    bp = billing_service.create_credit_payment(db, current, pack)
    return _start_checkout(db, bp)


@router.post("/premium/checkout", response_model=CheckoutResponse)
def premium_checkout(current: CurrentUser, db: DBSession) -> CheckoutResponse:
    bp = billing_service.create_premium_payment(db, current)
    return _start_checkout(db, bp)


@router.get("/payment/{payment_id}/public", response_model=PublicPaymentRead)
def public_payment(payment_id: uuid.UUID, db: DBSession) -> PublicPaymentRead:
    """Datos no sensibles de un pago pendiente para la página de pago (sin auth)."""
    bp = db.get(BillingPayment, payment_id)
    if bp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pago no encontrado")
    return PublicPaymentRead(
        id=bp.id,
        kind=bp.kind.value,
        title=billing_service.payment_title(bp),
        amount=bp.amount,
        amount_cents=culqi_service.to_cents(bp.amount),
        currency=bp.currency,
        public_key=settings.culqi_public_key,
        status=bp.status.value,
    )


@router.post("/culqi/charge", response_model=CulqiChargeResult)
def culqi_charge(payload: CulqiChargeRequest, db: DBSession) -> CulqiChargeResult:
    """Cobra un pago pendiente con el token de Culqi y otorga el beneficio.

    Lo llama la página de pago web (sin JWT): recibe el token tokenizado por
    Culqi Checkout y crea el cargo del lado del servidor. Si el cargo es exitoso,
    otorga créditos/premium de forma idempotente.
    """
    if not culqi_service.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Pagos no disponibles.")

    bp = db.get(BillingPayment, payload.billing_payment_id)
    if bp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pago no encontrado")
    if bp.status == BillingStatus.approved:
        return _charge_result(bp, "ok")

    user = db.get(User, bp.user_id)
    email = (user.email if user else None) or "comprador@caepe.lat"

    try:
        charge = culqi_service.create_charge(
            token=payload.token,
            amount=bp.amount,
            email=email,
            metadata={"billing_payment_id": str(bp.id)},
        )
    except culqi_service.CulqiError as e:
        bp.status = BillingStatus.rejected
        db.add(bp)
        db.commit()
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, e.user_message) from e

    if not culqi_service.charge_is_paid(charge):
        bp.status = BillingStatus.rejected
        db.add(bp)
        db.commit()
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "El pago no fue aprobado.")

    billing_service.apply_approved_payment(db, bp, str(charge.get("id")))
    db.commit()
    return _charge_result(bp, "ok")


def _charge_result(bp: BillingPayment, status_str: str) -> CulqiChargeResult:
    return CulqiChargeResult(
        status=status_str,
        kind=bp.kind.value,
        credits_granted=bp.credits_granted if bp.kind == BillingKind.credits else None,
        premium_days=bp.premium_days if bp.kind == BillingKind.premium else None,
    )


@router.post("/culqi/webhook")
async def culqi_webhook(request: Request, db: DBSession) -> dict:
    """Webhook de Culqi (respaldo del cobro síncrono). Idempotente por charge id.

    La firma es defensa en profundidad: la verdad la da consultar el cargo en la
    API de Culqi con nuestra secret key y otorgar solo si el metadata apunta a un
    billing_payment nuestro.
    """
    raw = await request.body()
    if not culqi_service.verify_signature(
        signature_header=request.headers.get("x-culqi-signature"),
        raw_body=raw,
    ):
        print("[culqi webhook] firma inválida o ausente; se valida contra la API de Culqi")

    event = await request.json() if raw else {}
    # El cuerpo trae el objeto del evento; el cargo puede venir en 'data' o plano.
    obj = event.get("data") or event
    charge_id = obj.get("id") if isinstance(obj, dict) else None
    if not charge_id or not str(charge_id).startswith("chr_"):
        return {"status": "ignored", "reason": "not a charge event"}

    try:
        charge = culqi_service.get_charge(str(charge_id))
    except culqi_service.CulqiError:
        return {"status": "ignored", "reason": "charge not found"}

    # Idempotencia por charge id (reutilizamos la columna mp_payment_id).
    already = db.execute(
        select(BillingPayment).where(BillingPayment.mp_payment_id == str(charge_id))
    ).scalar_one_or_none()
    if already is not None and already.status == BillingStatus.approved:
        return {"status": "ok", "detail": "already processed"}

    ref = (charge.get("metadata") or {}).get("billing_payment_id")
    bp = None
    if ref:
        try:
            bp = db.get(BillingPayment, uuid.UUID(str(ref)))
        except (ValueError, TypeError):
            bp = None
    if bp is None:
        return {"status": "ignored", "reason": "unknown billing_payment"}

    if culqi_service.charge_is_paid(charge):
        billing_service.apply_approved_payment(db, bp, str(charge_id))
        db.commit()
        return {"status": "ok", "detail": "granted"}

    return {"status": "ok", "detail": "charge not paid"}
