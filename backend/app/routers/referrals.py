from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select

from app.config import settings
from app.deps import CurrentUser, DBSession
from app.models import Referral, ReferralStatus
from app.schemas import ReferralMe
from app.services.referrals_service import ensure_referral_code

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("/me", response_model=ReferralMe)
def referrals_me(current: CurrentUser, db: DBSession) -> ReferralMe:
    """Código del usuario, link para compartir y progreso de sus referidos."""
    code = ensure_referral_code(db, current)
    db.commit()

    counts = dict(
        db.execute(
            select(Referral.status, func.count(Referral.id))
            .where(Referral.referrer_user_id == current.id)
            .group_by(Referral.status)
        ).all()
    )
    link = f"{settings.public_web_url.rstrip('/')}/r/{code}"
    return ReferralMe(
        referral_code=code,
        link=link,
        pending=counts.get(ReferralStatus.pending, 0),
        qualified=counts.get(ReferralStatus.qualified, 0),
        rewarded=counts.get(ReferralStatus.rewarded, 0),
        reward_days=settings.referral_reward_days,
    )
