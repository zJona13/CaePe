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
from app.models import BillingPayment, BillingStatus, UserPlan
from app.schemas import (
    BillingCatalog,
    BillingMe,
    CheckoutResponse,
    CreditCheckoutRequest,
    CreditPackRead,
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
        currency=settings.mp_currency,
    )


def _start_checkout(db, bp: BillingPayment, current) -> CheckoutResponse:
    if not mercadopago_service.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Pagos no disponibles: falta configurar Mercado Pago.",
        )
    try:
        pref = mercadopago_service.create_preference(
            title=billing_service.payment_title(bp),
            amount=bp.amount,
            external_reference=str(bp.id),
            payer_email=current.email,
        )
    except mercadopago_service.MercadoPagoError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Error de Mercado Pago: {e}") from e

    bp.mp_preference_id = pref["id"]
    db.add(bp)
    db.commit()
    return CheckoutResponse(
        billing_payment_id=bp.id,
        preference_id=pref["id"],
        init_point=pref["init_point"],
    )


@router.post("/credits/checkout", response_model=CheckoutResponse)
def credits_checkout(
    payload: CreditCheckoutRequest, current: CurrentUser, db: DBSession
) -> CheckoutResponse:
    pack = get_credit_pack(payload.pack_code)
    if pack is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pack de créditos no encontrado")
    bp = billing_service.create_credit_payment(db, current, pack)
    return _start_checkout(db, bp, current)


@router.post("/premium/checkout", response_model=CheckoutResponse)
def premium_checkout(current: CurrentUser, db: DBSession) -> CheckoutResponse:
    bp = billing_service.create_premium_payment(db, current)
    return _start_checkout(db, bp, current)


@router.post("/webhook")
async def webhook(request: Request, db: DBSession) -> dict:
    """Notificación de Mercado Pago. Fuente de verdad de la confirmación del pago.

    Valida la firma, consulta el pago real en MP y, si está aprobado y no fue
    procesado, otorga créditos/premium de forma idempotente (por mp_payment_id).
    """
    body = await request.json() if (await request.body()) else {}
    query = dict(request.query_params)

    topic = body.get("type") or query.get("type") or query.get("topic")
    data_id = (body.get("data") or {}).get("id") or query.get("data.id") or query.get("id")

    # Solo nos interesan notificaciones de pago.
    if topic and topic != "payment":
        return {"status": "ignored", "reason": "not a payment topic"}
    if not data_id:
        return {"status": "ignored", "reason": "missing data id"}

    # Firma como defensa en profundidad, NO como bloqueo: las notificaciones IPN
    # legacy (topic=payment) no traen x-signature, y la fuente de verdad es
    # get_payment() contra la API de MP con nuestro access token (solo otorgamos
    # si el external_reference apunta a un billing_payment nuestro). Si la firma no
    # valida, lo registramos y seguimos.
    if not mercadopago_service.verify_signature(
        signature_header=request.headers.get("x-signature"),
        request_id=request.headers.get("x-request-id"),
        data_id=str(data_id),
    ):
        print(
            f"[billing webhook] firma inválida o ausente (data.id={data_id}); "
            "se continúa validando el pago contra la API de Mercado Pago"
        )

    try:
        payment = mercadopago_service.get_payment(str(data_id))
    except mercadopago_service.MercadoPagoError:
        return {"status": "ignored", "reason": "payment not found"}

    mp_payment_id = str(payment.get("id") or data_id)
    mp_status = payment.get("status")
    external_reference = payment.get("external_reference")

    # Idempotencia: si ya procesamos este mp_payment_id, no hacer nada.
    already = db.execute(
        select(BillingPayment).where(BillingPayment.mp_payment_id == mp_payment_id)
    ).scalar_one_or_none()
    if already is not None and already.status == BillingStatus.approved:
        return {"status": "ok", "detail": "already processed"}

    bp = None
    if external_reference:
        try:
            bp = db.get(BillingPayment, uuid.UUID(str(external_reference)))
        except (ValueError, TypeError):
            bp = None
    if bp is None:
        return {"status": "ignored", "reason": "unknown external_reference"}

    if mp_status == "approved":
        billing_service.apply_approved_payment(db, bp, mp_payment_id)
        db.commit()
        return {"status": "ok", "detail": "granted"}

    if mp_status in ("rejected", "cancelled"):
        bp.status = BillingStatus.rejected
        bp.mp_payment_id = mp_payment_id
        db.add(bp)
        db.commit()
        return {"status": "ok", "detail": "rejected"}

    if mp_status == "refunded":
        bp.status = BillingStatus.refunded
        db.add(bp)
        db.commit()

    return {"status": "ok", "detail": f"unhandled status {mp_status}"}
