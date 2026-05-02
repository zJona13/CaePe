from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Event,
    EventParticipant,
    EventStatus,
    ParticipantPaymentStatus,
)


_TWO_PLACES = Decimal("0.01")


def calculate_amount_per_person(total_budget: Decimal, n: int) -> Decimal:
    """Split total_budget across n participants, rounded to 2 decimals (HALF_UP)."""
    if n <= 0:
        raise ValueError("Number of participants must be greater than zero")
    total = Decimal(total_budget)
    return (total / Decimal(n)).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def recalculate_on_participant_change(db: Session, event_id: uuid.UUID) -> Decimal:
    """Recompute amount_per_person and propagate to every participant's amount_due."""
    event = db.get(Event, event_id)
    if event is None:
        raise ValueError("Event not found")

    n = db.execute(
        select(func.count(EventParticipant.id)).where(EventParticipant.event_id == event_id)
    ).scalar_one()

    if n == 0:
        amount = Decimal("0.00")
    else:
        amount = calculate_amount_per_person(event.total_budget, n)

    event.amount_per_person = amount
    participants = db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).scalars().all()
    for p in participants:
        p.amount_due = amount
    db.flush()
    return amount


def check_and_mark_funded(db: Session, event_id: uuid.UUID) -> bool:
    """Promote event.status to 'funded' if every participant has payment_status='paid'."""
    event = db.get(Event, event_id)
    if event is None:
        return False
    participants = db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).scalars().all()
    if not participants:
        return False
    if all(p.payment_status == ParticipantPaymentStatus.paid for p in participants):
        event.status = EventStatus.funded
        db.flush()
        return True
    return False


def build_whatsapp_message(event: Event, invite_code: str, base_url: str = "https://caepe.app") -> str:
    """Compose the share text for WhatsApp with name, date, place, per-person amount, link."""
    parts = [f"¡Te invito a *{event.name}*!"]
    if event.date:
        parts.append(f"📅 {event.date.strftime('%d/%m/%Y')}")
    if event.time:
        parts.append(f"🕒 {event.time.strftime('%H:%M')}")
    if event.location:
        parts.append(f"📍 {event.location}")
    parts.append(f"💰 S/ {event.amount_per_person} por persona")
    parts.append(f"🔗 {base_url}/e/{invite_code}")
    return "\n".join(parts)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
