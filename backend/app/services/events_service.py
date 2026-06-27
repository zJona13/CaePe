from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Event,
    EventParticipant,
    EventStatus,
    ParticipantPaymentStatus,
    User,
)


_TWO_PLACES = Decimal("0.01")


class EventLimitReached(Exception):
    """Free user has no remaining events in the free quota nor credits left."""

    def __init__(self, events_created: int, limit: int, credits: int) -> None:
        self.events_created = events_created
        self.limit = limit
        self.credits = credits
        super().__init__("Event limit reached")


def is_premium_active(user: User, now: datetime | None = None) -> bool:
    """Premium is active purely based on premium_until (the plan column is denormalized)."""
    pu = user.premium_until
    if pu is None:
        return False
    if pu.tzinfo is None:  # SQLite devuelve datetimes naive; asumir UTC.
        pu = pu.replace(tzinfo=timezone.utc)
    return pu > (now or utcnow())


def events_created_count(db: Session, user_id: uuid.UUID) -> int:
    """Lifetime count of events created by the user as organizer."""
    return db.execute(
        select(func.count(Event.id)).where(Event.organizer_id == user_id)
    ).scalar_one()


def consume_event_allowance(db: Session, user: User) -> str:
    """Ensure the user may create one more event, consuming a credit if needed.

    Returns the allowance source: 'premium' | 'free_quota' | 'credit'.
    Raises EventLimitReached when a free user is out of quota and has no credits.
    The caller's transaction commits any credit decrement.
    """
    if is_premium_active(user):
        return "premium"
    created = events_created_count(db, user.id)
    if created < settings.free_event_limit:
        return "free_quota"
    if user.event_credits > 0:
        user.event_credits -= 1
        db.add(user)
        return "credit"
    raise EventLimitReached(created, settings.free_event_limit, user.event_credits)


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
    parts.append(f"🔗 {base_url.rstrip('/')}/events/join/{invite_code}")
    return "\n".join(parts)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
