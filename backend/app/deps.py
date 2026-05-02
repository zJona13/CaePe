from __future__ import annotations

import uuid
from typing import Annotated, Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthError, verify_jwt
from app.db import SessionLocal
from app.models import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DBSession = Annotated[Session, Depends(get_db)]


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid Authorization header")
    return authorization.split(" ", 1)[1].strip()


def get_current_claims(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    token = _extract_bearer(authorization)
    try:
        return verify_jwt(token)
    except AuthError as e:
        print(f"Auth error: {e.message}")
        raise HTTPException(e.status_code, e.message) from e


CurrentClaims = Annotated[dict, Depends(get_current_claims)]


def get_current_user(claims: CurrentClaims, db: DBSession) -> User:
    sub = claims.get("sub")
    email = claims.get("email") or claims.get("user_metadata", {}).get("email")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing sub")
    try:
        user_id = uuid.UUID(str(sub))
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token sub is not a valid UUID") from e

    user = db.get(User, user_id)
    if user is None:
        if not email:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing email")
        user = User(id=user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_optional_user(
    db: DBSession,
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    """Resolve a User from the Authorization header if present and valid; else None.

    Used by endpoints that allow guest access (e.g. POST /groups/join/{code}).
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = verify_jwt(token)
    except AuthError:
        return None
    sub = claims.get("sub")
    email = claims.get("email") or claims.get("user_metadata", {}).get("email")
    if not sub:
        return None
    try:
        user_id = uuid.UUID(str(sub))
    except ValueError:
        return None
    user = db.get(User, user_id)
    if user is None and email:
        user = User(id=user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
