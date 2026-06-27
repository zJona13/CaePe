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
    MPChargeRequest,
    MPChargeResult,
    PublicPaymentRead,
)
from app.services import billing_service, mercadopago_service
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
    """URL de la página de pago (en la landing) que tokeniza con Mercado Pago."""
    return f"{settings.public_web_url.rstrip('/')}/pay?bp={bp.id}"


def _start_checkout(db, bp: BillingPayment) -> CheckoutResponse:
    if not mercadopago_service.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Pagos no disponibles: falta configurar Mercado Pago.",
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
        currency=bp.currency,
        public_key=settings.mp_public_key,
        status=bp.status.value,
    )


@router.post("/charge", response_model=MPChargeResult)
def charge(payload: MPChargeRequest, db: DBSession) -> MPChargeResult:
    """Cobra un pago pendiente con el token de Mercado Pago y otorga el beneficio.

    Lo llama la página de pago web (sin JWT): recibe el token tokenizado por el
    Brick de MP y crea el pago del lado del servidor. Si queda 'approved', otorga
    créditos/premium de forma idempotente; si queda 'in_process', espera al webhook.
    """
    if not mercadopago_service.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Pagos no disponibles.")

    bp = db.get(BillingPayment, payload.billing_payment_id)
    if bp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pago no encontrado")
    if bp.status == BillingStatus.approved:
        return _result(bp, "ok", "approved")

    user = db.get(User, bp.user_id)
    email = payload.payer_email or (user.email if user else None) or "comprador@caepe.lat"

    try:
        payment = mercadopago_service.create_payment(
            token=payload.token,
            amount=bp.amount,
            email=email,
            payment_method_id=payload.payment_method_id,
            installments=payload.installments,
            issuer_id=payload.issuer_id,
            external_reference=str(bp.id),
            identification=payload.identification,
            metadata={"billing_payment_id": str(bp.id), "description": billing_service.payment_title(bp)},
        )
    except mercadopago_service.MercadoPagoError as e:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, e.user_message) from e

    mp_id = str(payment.get("id"))
    if mercadopago_service.payment_is_approved(payment):
        billing_service.apply_approved_payment(db, bp, mp_id)
        db.commit()
        return _result(bp, "ok", "approved")

    mp_status = payment.get("status")
    if mp_status in ("in_process", "pending", "authorized"):
        bp.mp_payment_id = mp_id
        db.add(bp)
        db.commit()
        return _result(bp, "pending", mp_status)

    # rejected / cancelled
    bp.status = BillingStatus.rejected
    bp.mp_payment_id = mp_id
    db.add(bp)
    db.commit()
    raise HTTPException(
        status.HTTP_402_PAYMENT_REQUIRED, mercadopago_service.rejection_message(payment)
    )


def _result(bp: BillingPayment, status_str: str, payment_status: str) -> MPChargeResult:
    return MPChargeResult(
        status=status_str,
        payment_status=payment_status,
        kind=bp.kind.value,
        credits_granted=bp.credits_granted if bp.kind == BillingKind.credits else None,
        premium_days=bp.premium_days if bp.kind == BillingKind.premium else None,
    )


@router.post("/webhook")
async def webhook(request: Request, db: DBSession) -> dict:
    """Webhook de Mercado Pago (respaldo del cobro síncrono). Idempotente por payment id.

    La firma es defensa en profundidad: la verdad la da consultar el pago en la API
    de MP con nuestro access token y otorgar solo si el external_reference apunta a un
    billing_payment nuestro.
    """
    raw = await request.body()
    body = await request.json() if raw else {}
    query = dict(request.query_params)

    topic = body.get("type") or query.get("type") or query.get("topic")
    data_id = (body.get("data") or {}).get("id") or query.get("data.id") or query.get("id")

    if topic and topic != "payment":
        return {"status": "ignored", "reason": "not a payment topic"}
    if not data_id:
        return {"status": "ignored", "reason": "missing data id"}

    if not mercadopago_service.verify_signature(
        signature_header=request.headers.get("x-signature"),
        request_id=request.headers.get("x-request-id"),
        data_id=str(data_id),
    ):
        print(
            f"[mp webhook] firma inválida o ausente (data.id={data_id}); "
            "se valida el pago contra la API de Mercado Pago"
        )

    try:
        payment = mercadopago_service.get_payment(str(data_id))
    except mercadopago_service.MercadoPagoError:
        return {"status": "ignored", "reason": "payment not found"}

    mp_payment_id = str(payment.get("id") or data_id)
    already = db.execute(
        select(BillingPayment).where(BillingPayment.mp_payment_id == mp_payment_id)
    ).scalar_one_or_none()
    if already is not None and already.status == BillingStatus.approved:
        return {"status": "ok", "detail": "already processed"}

    ref = payment.get("external_reference")
    bp = None
    if ref:
        try:
            bp = db.get(BillingPayment, uuid.UUID(str(ref)))
        except (ValueError, TypeError):
            bp = None
    if bp is None:
        return {"status": "ignored", "reason": "unknown external_reference"}

    if mercadopago_service.payment_is_approved(payment):
        billing_service.apply_approved_payment(db, bp, mp_payment_id)
        db.commit()
        return {"status": "ok", "detail": "granted"}

    if payment.get("status") in ("rejected", "cancelled"):
        bp.status = BillingStatus.rejected
        bp.mp_payment_id = mp_payment_id
        db.add(bp)
        db.commit()

    return {"status": "ok", "detail": f"status {payment.get('status')}"}
