from __future__ import annotations

import time
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from app.config import settings


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


_jwks_client: PyJWKClient | None = None
_jwks_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 60 * 60


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if not settings.supabase_jwks_url:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.supabase_jwks_url, cache_keys=True)
    return _jwks_client


def _decode_options() -> dict[str, Any]:
    return {
        "verify_signature": True,
        "verify_exp": True,
        "verify_aud": bool(settings.supabase_jwt_audience),
        "verify_iss": bool(settings.supabase_jwt_issuer),
    }


def _decode_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "algorithms": settings.jwt_algorithms_list,
        "leeway": settings.supabase_jwt_leeway_seconds,
    }
    if settings.supabase_jwt_audience:
        kwargs["audience"] = settings.supabase_jwt_audience
    if settings.supabase_jwt_issuer:
        kwargs["issuer"] = settings.supabase_jwt_issuer
    return kwargs


def verify_jwt(token: str) -> dict[str, Any]:
    if not token:
        raise AuthError("Missing token")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        raise AuthError(f"Invalid token header: {e}") from e

    alg = unverified_header.get("alg", "")

    try:
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise AuthError("HS256 token but SUPABASE_JWT_SECRET not configured")
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                options=_decode_options(),
                **_decode_kwargs(),
            )

        client = _get_jwks_client()
        if client is None:
            raise AuthError("JWKS not configured")

        signing_key = client.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            options=_decode_options(),
            **_decode_kwargs(),
        )
    except jwt.ExpiredSignatureError as e:
        raise AuthError("Token expired") from e
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token: {e}") from e
    except httpx.HTTPError as e:
        raise AuthError(f"JWKS fetch failed: {e}") from e
