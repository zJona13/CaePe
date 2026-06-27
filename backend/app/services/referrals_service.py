from __future__ import annotations

import secrets
import string
import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Referral, ReferralStatus, User
from app.services.billing_service import grant_premium_days
from app.services.events_service import utcnow


_ALPHABET = string.ascii_uppercase + string.digits


def generate_referral_code(db: Session, length: int = 8, max_attempts: int = 30) -> str:
    """Código alfanumérico único de 8 chars, no presente en users.referral_code."""
    for _ in range(max_attempts):
        code = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        clash = db.execute(
            select(User.id).where(User.referral_code == code)
        ).first()
        if clash is None:
            return code
    raise RuntimeError("No se pudo generar un código de referido único")


def ensure_referral_code(db: Session, user: User) -> str:
    """Garantiza que el usuario tenga referral_code; lo genera si falta."""
    if not user.referral_code:
        user.referral_code = generate_referral_code(db)
        db.add(user)
        db.flush()
    return user.referral_code


def register_referral(
    db: Session,
    *,
    referral_code: str,
    referred_user: User,
    device_hash: str | None,
) -> Referral | None:
    """Crea un referido pendiente si el código existe y no es autorreferencia.

    Idempotente: si ya existe un referido para este referred_user, no crea otro.
    """
    referrer = db.execute(
        select(User).where(User.referral_code == referral_code)
    ).scalar_one_or_none()
    if referrer is None or referrer.id == referred_user.id:
        return None

    existing = db.execute(
        select(Referral).where(Referral.referred_user_id == referred_user.id)
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    referral = Referral(
        referrer_user_id=referrer.id,
        referred_user_id=referred_user.id,
        status=ReferralStatus.pending,
        device_hash=device_hash,
    )
    db.add(referral)
    db.flush()
    return referral


def _phone_already_qualified(db: Session, referral: Referral, phone: str | None) -> bool:
    """¿El teléfono del referido ya calificó en otro referido? (anti multi-cuenta)."""
    if not phone:
        return False
    rows = db.execute(
        select(Referral.id)
        .join(User, User.id == Referral.referred_user_id)
        .where(
            Referral.id != referral.id,
            Referral.status.in_([ReferralStatus.qualified, ReferralStatus.rewarded]),
            User.phone == phone,
        )
    ).first()
    return rows is not None


def _device_already_qualified(db: Session, referral: Referral) -> bool:
    """¿El device_hash ya se usó en otro referido calificado? (anti mismo dispositivo)."""
    if not referral.device_hash:
        return False
    rows = db.execute(
        select(Referral.id).where(
            Referral.id != referral.id,
            Referral.device_hash == referral.device_hash,
            Referral.status.in_([ReferralStatus.qualified, ReferralStatus.rewarded]),
        )
    ).first()
    return rows is not None


def _rewards_in_last_year(db: Session, referrer_id: uuid.UUID) -> int:
    """Cuántas recompensas otorgó este referente en los últimos 12 meses."""
    since = utcnow() - timedelta(days=365)
    return db.execute(
        select(func.count(Referral.id)).where(
            Referral.referrer_user_id == referrer_id,
            Referral.status == ReferralStatus.rewarded,
            Referral.rewarded_at.is_not(None),
            Referral.rewarded_at >= since,
        )
    ).scalar_one()


def qualify_referrals_on_funded(db: Session, organizer_id: uuid.UUID) -> bool:
    """Llamado al fondear un evento: califica el referido del organizador.

    El referido pasa a 'qualified' (condición cumplida). Si supera el anti-abuso
    y el referente no excede el tope anual, se otorga premium y pasa a 'rewarded'.
    Devuelve True si se otorgó la recompensa.
    """
    referral = db.execute(
        select(Referral).where(
            Referral.referred_user_id == organizer_id,
            Referral.status == ReferralStatus.pending,
        )
    ).scalar_one_or_none()
    if referral is None:
        return False

    now = utcnow()
    referral.status = ReferralStatus.qualified
    referral.qualified_at = now
    db.add(referral)

    referred = db.get(User, organizer_id)
    phone = referred.phone if referred else None

    # Anti-abuso: teléfono único, device no repetido, tope anual del referente.
    if _phone_already_qualified(db, referral, phone):
        db.flush()
        return False
    if _device_already_qualified(db, referral):
        db.flush()
        return False
    if _rewards_in_last_year(db, referral.referrer_user_id) >= settings.referral_yearly_cap:
        db.flush()
        return False

    referrer = db.get(User, referral.referrer_user_id)
    if referrer is None:
        db.flush()
        return False

    grant_premium_days(referrer, settings.referral_reward_days)
    referral.status = ReferralStatus.rewarded
    referral.rewarded_at = now
    db.add(referrer)
    db.add(referral)
    db.flush()
    return True
