from __future__ import annotations

import uuid


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_me_with_valid_token_creates_and_returns_user(client, make_token):
    sub = str(uuid.uuid4())
    token = make_token(sub=sub, email="alice@example.com")

    r = client.get("/auth/me", headers=_auth_header(token))

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == sub
    assert body["email"] == "alice@example.com"


def test_me_with_invalid_token_returns_401(client):
    r = client.get("/auth/me", headers=_auth_header("not-a-jwt"))
    assert r.status_code == 401


def test_me_with_expired_token_returns_401(client, make_token):
    token = make_token(exp_offset=-60)
    r = client.get("/auth/me", headers=_auth_header(token))
    assert r.status_code == 401


def test_me_without_authorization_header_returns_401(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_register_persists_user(client, make_token):
    sub = str(uuid.uuid4())
    token = make_token(sub=sub, email="bob@example.com")

    r = client.post(
        "/auth/register",
        headers=_auth_header(token),
        json={"email": "bob@example.com", "name": "Bob", "phone": "+51999000111"},
    )

    assert r.status_code == 201
    body = r.json()
    assert body["id"] == sub
    assert body["name"] == "Bob"
