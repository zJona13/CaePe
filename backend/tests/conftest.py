from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base
from app.deps import get_db
from app.main import app


TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

# No enviar push reales a Expo durante los tests.
settings.push_enabled = False


@pytest.fixture(scope="session")
def engine():
    is_sqlite = TEST_DB_URL.startswith("sqlite")
    eng = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False} if is_sqlite else {},
        poolclass=StaticPool if is_sqlite else None,
        future=True,
    )
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture()
def db_session(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        # Wipe data between tests (keep schema).
        with engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture()
def client(engine, db_session):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    def override_get_db():
        s = TestingSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def hs256_auth(monkeypatch):
    """Configure HS256 path so tests don't need JWKS."""
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-secret-key-do-not-use-in-prod", raising=False)
    monkeypatch.setattr(settings, "supabase_jwt_algorithms", "HS256", raising=False)
    monkeypatch.setattr(settings, "supabase_jwt_audience", "authenticated", raising=False)
    monkeypatch.setattr(settings, "supabase_jwt_issuer", "", raising=False)
    # supabase_url vacío → jwt_issuer derivado también queda vacío (sin verificar iss).
    monkeypatch.setattr(settings, "supabase_url", "", raising=False)
    yield


@pytest.fixture()
def make_token():
    import jwt
    import time as _time

    def _make(
        sub: str | None = None,
        email: str = "user@example.com",
        exp_offset: int = 3600,
        aud: str = "authenticated",
        secret: str | None = None,
        alg: str = "HS256",
    ):
        sub = sub or str(uuid.uuid4())
        payload = {
            "sub": sub,
            "email": email,
            "aud": aud,
            "exp": int(_time.time()) + exp_offset,
        }
        return jwt.encode(payload, secret or settings.supabase_jwt_secret, algorithm=alg)

    return _make


@pytest.fixture()
def make_user(client, make_token):
    """Provision a backend User row via /auth/me and return token + headers."""

    def _make(email: str = "user@example.com", sub: str | None = None):
        sub = sub or str(uuid.uuid4())
        token = make_token(sub=sub, email=email)
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/auth/me", headers=headers)
        assert r.status_code == 200, r.text
        return {"sub": sub, "email": email, "token": token, "headers": headers}

    return _make
