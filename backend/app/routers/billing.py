from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.deps import CurrentUser, DBSession
from app.models import UserPlan
from app.schemas import BillingMe
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
