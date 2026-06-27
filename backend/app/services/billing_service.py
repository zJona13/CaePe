from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy.orm import Session

from app.billing_catalog import (
    PREMIUM_PRICE,
    PREMIUM_TITLE,
    CreditPack,
)
from app.config import settings
from app.models import BillingKind, BillingPayment, BillingStatus, User
from app.services.events_service import is_premium_active, utcnow


def create_credit_payment(db: Session, user: User, pack: CreditPack) -> BillingPayment:
    """Crea un billing_payment(pending) para un pack de créditos."""
    bp = BillingPayment(
        user_id=user.id,
        kind=BillingKind.credits,
        pack_code=pack.code,
        amount=pack.price,
        currency=settings.currency,
        credits_granted=pack.credits,
        status=BillingStatus.pending,
    )
    db.add(bp)
    db.flush()
    return bp


def create_premium_payment(db: Session, user: User) -> BillingPayment:
    """Crea un billing_payment(pending) para un mes de premium."""
    bp = BillingPayment(
        user_id=user.id,
        kind=BillingKind.premium,
        pack_code=None,
        amount=PREMIUM_PRICE,
        currency=settings.currency,
        premium_days=settings.premium_days,
        status=BillingStatus.pending,
    )
    db.add(bp)
    db.flush()
    return bp


def payment_title(bp: BillingPayment) -> str:
    if bp.kind == BillingKind.premium:
        return f"CaePe {PREMIUM_TITLE}"
    return f"CaePe · {bp.credits_granted} créditos"


def grant_premium_days(user: User, days: int) -> None:
    """Suma días de premium acumulando sobre el saldo vigente (no sobre el pasado)."""
    now = utcnow()
    base = user.premium_until if is_premium_active(user, now) else now
    if base.tzinfo is None:
        base = base.replace(tzinfo=now.tzinfo)
    user.premium_until = base + timedelta(days=days)


def apply_approved_payment(db: Session, bp: BillingPayment, mp_payment_id: str | None) -> bool:
    """Aplica un pago aprobado de forma idempotente.

    Otorga créditos o premium según el kind. Si ya estaba aprobado, no hace nada.
    Devuelve True si en esta llamada se aplicó (para disparar notificaciones).
    """
    if bp.status == BillingStatus.approved:
        return False
    user = db.get(User, bp.user_id)
    if user is None:
        return False

    if bp.kind == BillingKind.credits:
        user.event_credits += bp.credits_granted or 0
    elif bp.kind == BillingKind.premium:
        grant_premium_days(user, bp.premium_days or settings.premium_days)

    bp.status = BillingStatus.approved
    bp.mp_payment_id = mp_payment_id or bp.mp_payment_id
    bp.confirmed_at = utcnow()
    db.add(user)
    db.add(bp)
    db.flush()
    return True


def get_payment(db: Session, payment_id: uuid.UUID) -> BillingPayment | None:
    return db.get(BillingPayment, payment_id)
