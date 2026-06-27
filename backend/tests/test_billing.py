from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.models import User


def _create_group(client, headers, name: str = "G") -> dict:
    r = client.post("/groups", json={"name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _create_event(client, headers, group_id: str, name: str = "E"):
    return client.post(
        "/events",
        json={
            "group_id": group_id,
            "name": name,
            "total_budget": "40.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=headers,
    )


def test_billing_me_defaults_to_free(client, make_user):
    u = make_user(email="free@example.com")
    r = client.get("/billing/me", headers=u["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["plan"] == "free"
    assert body["is_premium"] is False
    assert body["event_credits"] == 0
    assert body["events_created"] == 0
    assert body["free_event_limit"] == 5
    assert body["events_remaining"] == 5


def test_free_user_blocked_after_five_events(client, make_user):
    u = make_user(email="org@example.com")
    g = _create_group(client, u["headers"])
    for i in range(5):
        assert _create_event(client, u["headers"], g["id"], f"E{i}").status_code == 201

    r = _create_event(client, u["headers"], g["id"], "E6")
    assert r.status_code == 402, r.text
    detail = r.json()["detail"]
    assert detail["code"] == "event_limit_reached"
    assert detail["limit"] == 5
    assert detail["events_created"] == 5

    me = client.get("/billing/me", headers=u["headers"]).json()
    assert me["events_created"] == 5
    assert me["events_remaining"] == 0


def test_credit_allows_one_extra_event(client, make_user, db_session):
    u = make_user(email="org@example.com")
    g = _create_group(client, u["headers"])
    for i in range(5):
        assert _create_event(client, u["headers"], g["id"], f"E{i}").status_code == 201

    # Otorgar 1 crédito directamente en la DB (simula compra confirmada).
    user = db_session.get(User, uuid.UUID(u["sub"]))
    user.event_credits = 1
    db_session.add(user)
    db_session.commit()

    # El 6to evento ahora pasa, consumiendo el crédito.
    assert _create_event(client, u["headers"], g["id"], "E6").status_code == 201
    me = client.get("/billing/me", headers=u["headers"]).json()
    assert me["event_credits"] == 0
    assert me["events_created"] == 6

    # Sin créditos otra vez → vuelve a bloquear.
    assert _create_event(client, u["headers"], g["id"], "E7").status_code == 402


def test_premium_user_has_unlimited_events(client, make_user, db_session):
    u = make_user(email="premium@example.com")
    user = db_session.get(User, uuid.UUID(u["sub"]))
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=30)
    db_session.add(user)
    db_session.commit()

    g = _create_group(client, u["headers"])
    for i in range(7):
        assert _create_event(client, u["headers"], g["id"], f"E{i}").status_code == 201

    me = client.get("/billing/me", headers=u["headers"]).json()
    assert me["is_premium"] is True
    assert me["plan"] == "premium"
    assert me["events_remaining"] is None


def test_expired_premium_is_treated_as_free(client, make_user, db_session):
    u = make_user(email="expired@example.com")
    user = db_session.get(User, uuid.UUID(u["sub"]))
    user.premium_until = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.add(user)
    db_session.commit()

    me = client.get("/billing/me", headers=u["headers"]).json()
    assert me["is_premium"] is False
    assert me["events_remaining"] == 5
