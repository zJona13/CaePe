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


# --- Catálogo + checkout + webhook (Mercado Pago) ---

def _mock_mp(monkeypatch, *, approve_payment=None):
    """Mockea el servicio MP: checkout siempre crea preferencia; get_payment opcional."""
    from app.services import mercadopago_service

    monkeypatch.setattr(mercadopago_service, "is_configured", lambda: True)
    monkeypatch.setattr(
        mercadopago_service,
        "create_preference",
        lambda **kw: {"id": "pref-123", "init_point": "https://mp.test/checkout/pref-123"},
    )
    if approve_payment is not None:
        monkeypatch.setattr(mercadopago_service, "get_payment", lambda pid: approve_payment(pid))


def test_catalog_lists_packs_and_premium(client):
    r = client.get("/billing/catalog")
    assert r.status_code == 200, r.text
    body = r.json()
    codes = {p["code"] for p in body["credit_packs"]}
    assert codes == {"credits_10", "credits_25"}
    assert body["premium_price"] == "9.90"
    assert body["currency"] == "PEN"


def test_credits_checkout_requires_mp_configured(client, make_user):
    u = make_user(email="nomp@example.com")
    r = client.post("/billing/credits/checkout", json={"pack_code": "credits_10"}, headers=u["headers"])
    assert r.status_code == 503, r.text


def test_credits_checkout_creates_pending_payment(client, make_user, db_session, monkeypatch):
    _mock_mp(monkeypatch)
    u = make_user(email="buyer@example.com")
    r = client.post("/billing/credits/checkout", json={"pack_code": "credits_10"}, headers=u["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["init_point"].endswith("pref-123")
    assert body["preference_id"] == "pref-123"

    from app.models import BillingPayment, BillingStatus

    bp = db_session.get(BillingPayment, uuid.UUID(body["billing_payment_id"]))
    assert bp.status == BillingStatus.pending
    assert bp.credits_granted == 10
    assert bp.mp_preference_id == "pref-123"


def test_webhook_grants_credits_and_is_idempotent(client, make_user, db_session, monkeypatch):
    u = make_user(email="buyer2@example.com")
    _mock_mp(monkeypatch)
    r = client.post("/billing/credits/checkout", json={"pack_code": "credits_25"}, headers=u["headers"])
    bp_id = r.json()["billing_payment_id"]

    payment = {
        "id": "mp-pay-1",
        "status": "approved",
        "external_reference": bp_id,
    }
    from app.services import mercadopago_service

    monkeypatch.setattr(mercadopago_service, "get_payment", lambda pid: payment)

    w = client.post("/billing/webhook", json={"type": "payment", "data": {"id": "mp-pay-1"}})
    assert w.status_code == 200, w.text
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 25

    # Segunda notificación del mismo pago → no duplica.
    w2 = client.post("/billing/webhook", json={"type": "payment", "data": {"id": "mp-pay-1"}})
    assert w2.status_code == 200
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 25


def test_webhook_grants_premium_and_accumulates(client, make_user, db_session, monkeypatch):
    u = make_user(email="prem@example.com")
    _mock_mp(monkeypatch)

    def buy_premium(ref_id):
        payment = {"id": ref_id, "status": "approved", "external_reference": ref_id}
        from app.services import mercadopago_service

        monkeypatch.setattr(mercadopago_service, "get_payment", lambda pid: payment)
        r = client.post("/billing/premium/checkout", headers=u["headers"])
        bp_id = r.json()["billing_payment_id"]
        payment["external_reference"] = bp_id
        return client.post("/billing/webhook", json={"type": "payment", "data": {"id": bp_id}})

    # Primer mes.
    w1 = buy_premium("ref1")
    assert w1.status_code == 200
    me1 = client.get("/billing/me", headers=u["headers"]).json()
    assert me1["is_premium"] is True
    first_until = me1["premium_until"]

    # Segundo mes acumula sobre el saldo vigente.
    w2 = buy_premium("ref2")
    assert w2.status_code == 200
    me2 = client.get("/billing/me", headers=u["headers"]).json()
    assert me2["premium_until"] > first_until


def test_webhook_ignores_non_payment_topic(client):
    w = client.post("/billing/webhook", json={"type": "plan", "data": {"id": "x"}})
    assert w.status_code == 200
    assert w.json()["status"] == "ignored"
