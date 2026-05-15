from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentClaims, CurrentUser, DBSession
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, claims: CurrentClaims, db: DBSession) -> User:
    """Provisions a local User row for an already-authenticated Supabase user.

    Supabase Auth handles the actual signup. The mobile client calls this after
    receiving its session JWT so we have a row to attach groups/events to.
    """
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing sub")

    import uuid as _uuid

    try:
        user_id = _uuid.UUID(str(sub))
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sub is not a UUID") from e

    existing = db.get(User, user_id)
    if existing is not None:
        return existing

    if db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        id=user_id,
        email=payload.email,
        name=payload.name,
        phone=payload.phone,
        payment_method=payload.payment_method,
        payment_number=payload.payment_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserRead)
def login(current: CurrentUser) -> User:
    """Echo of the authenticated user. Real login is done against Supabase Auth.

    The client sends its Supabase JWT; we verify it and return the local user row.
    """
    return current


@router.get("/me", response_model=UserRead)
def me(current: CurrentUser) -> User:
    return current


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, current: CurrentUser, db: DBSession) -> User:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(current, field, value)
    db.commit()
    db.refresh(current)
    return current
