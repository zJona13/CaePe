from __future__ import annotations

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.deps import DBSession
from app.models import Plan, PlanCategory
from app.schemas import PlanRead, SeedResult
from app.seeds.plans_chiclayo import seed_plans

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=list[PlanRead])
def list_plans(
    db: DBSession,
    category: Optional[PlanCategory] = Query(default=None),
    price_min: Optional[Decimal] = Query(default=None, ge=0),
    price_max: Optional[Decimal] = Query(default=None, ge=0),
    city: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=True),
) -> list[Plan]:
    stmt = select(Plan)
    if category is not None:
        stmt = stmt.where(Plan.category == category)
    if price_max is not None:
        stmt = stmt.where(Plan.price_min <= price_max)
    if price_min is not None:
        stmt = stmt.where(Plan.price_max >= price_min)
    if city is not None:
        stmt = stmt.where(Plan.city == city)
    if is_active is not None:
        stmt = stmt.where(Plan.is_active == is_active)
    return list(db.execute(stmt).scalars().all())


@router.get("/random", response_model=PlanRead)
def random_plan(
    db: DBSession,
    category: Optional[PlanCategory] = Query(default=None),
    price_min: Optional[Decimal] = Query(default=None, ge=0),
    price_max: Optional[Decimal] = Query(default=None, ge=0),
    city: Optional[str] = Query(default=None),
) -> Plan:
    stmt = select(Plan).where(Plan.is_active.is_(True))
    if category is not None:
        stmt = stmt.where(Plan.category == category)
    if price_max is not None:
        stmt = stmt.where(Plan.price_min <= price_max)
    if price_min is not None:
        stmt = stmt.where(Plan.price_max >= price_min)
    if city is not None:
        stmt = stmt.where(Plan.city == city)
    stmt = stmt.order_by(func.random()).limit(1)
    plan = db.execute(stmt).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No plan matches the filters")
    return plan


@router.post("/seed", response_model=SeedResult, status_code=status.HTTP_200_OK)
def seed(db: DBSession) -> SeedResult:
    inserted, total = seed_plans(db)
    return SeedResult(inserted=inserted, total=total)
