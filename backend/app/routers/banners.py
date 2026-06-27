from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import or_, select

from app.deps import DBSession, OptionalUser
from app.models import AppBanner, BannerAudience
from app.schemas import BannerRead
from app.services.events_service import is_premium_active, utcnow

router = APIRouter(prefix="/banners", tags=["banners"])


@router.get("", response_model=list[BannerRead])
def list_banners(db: DBSession, current: OptionalUser) -> list[AppBanner]:
    """Banners activos vigentes, filtrados por audiencia. Premium no ve free_only."""
    now = utcnow()
    stmt = (
        select(AppBanner)
        .where(AppBanner.is_active.is_(True))
        .where(or_(AppBanner.starts_at.is_(None), AppBanner.starts_at <= now))
        .where(or_(AppBanner.ends_at.is_(None), AppBanner.ends_at >= now))
        .order_by(AppBanner.priority.desc(), AppBanner.created_at.desc())
    )
    banners = list(db.execute(stmt).scalars().all())

    premium = current is not None and is_premium_active(current)
    if premium:
        banners = [b for b in banners if b.audience != BannerAudience.free_only]
    return banners
