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


# --- Catálogo + checkout + cargo + webhook (Culqi) ---

def _mock_culqi(monkeypatch, *, paid: bool = True, error: str | None = None):
    """Mockea el servicio Culqi: is_configured=True y create_charge controlable."""
    import itertools

    from app.services import culqi_service

    monkeypatch.setattr(culqi_service, "is_configured", lambda: True)
    ids = itertools.count(1)
    if error is not None:
        def _raise(**kw):
            raise culqi_service.CulqiError("rechazo", user_message=error)
        monkeypatch.setattr(culqi_service, "create_charge", _raise)
    else:
        outcome = {"type": "venta_exitosa"} if paid else {"type": "rechazo"}
        monkeypatch.setattr(
            culqi_service,
            "create_charge",
            lambda **kw: {"id": f"chr_test_{next(ids)}", "object": "charge", "outcome": outcome},
        )


def _checkout(client, headers, pack="credits_10"):
    r = client.post("/billing/credits/checkout", json={"pack_code": pack}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["billing_payment_id"]


def _charge(client, bp_id, token="tkn_test_x"):
    return client.post("/billing/culqi/charge", json={"billing_payment_id": bp_id, "token": token})


def test_catalog_lists_packs_and_premium(client):
    r = client.get("/billing/catalog")
    assert r.status_code == 200, r.text
    body = r.json()
    codes = {p["code"] for p in body["credit_packs"]}
    assert codes == {"credits_10", "credits_25"}
    assert body["premium_price"] == "9.90"
    assert body["currency"] == "PEN"


def test_checkout_requires_culqi_configured(client, make_user, monkeypatch):
    from app.services import culqi_service

    monkeypatch.setattr(culqi_service, "is_configured", lambda: False)
    u = make_user(email="nocfg@example.com")
    r = client.post("/billing/credits/checkout", json={"pack_code": "credits_10"}, headers=u["headers"])
    assert r.status_code == 503, r.text


def test_checkout_creates_pending_and_returns_pay_url(client, make_user, db_session, monkeypatch):
    _mock_culqi(monkeypatch)
    u = make_user(email="buyer@example.com")
    r = client.post("/billing/credits/checkout", json={"pack_code": "credits_10"}, headers=u["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert "/pay?bp=" in body["init_point"]

    from app.models import BillingPayment, BillingStatus

    bp = db_session.get(BillingPayment, uuid.UUID(body["billing_payment_id"]))
    assert bp.status == BillingStatus.pending
    assert bp.credits_granted == 10


def test_public_payment_exposes_amount_in_cents(client, make_user, monkeypatch):
    _mock_culqi(monkeypatch)
    u = make_user(email="pub@example.com")
    bp_id = _checkout(client, u["headers"])
    p = client.get(f"/billing/payment/{bp_id}/public")
    assert p.status_code == 200, p.text
    body = p.json()
    assert body["amount_cents"] == 800  # S/ 8.00
    assert body["kind"] == "credits"


def test_charge_grants_credits_and_is_idempotent(client, make_user, monkeypatch):
    _mock_culqi(monkeypatch)
    u = make_user(email="buyer2@example.com")
    bp_id = _checkout(client, u["headers"], pack="credits_25")

    c = _charge(client, bp_id)
    assert c.status_code == 200, c.text
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 25

    # Re-cobrar el mismo pago no duplica (ya está approved).
    c2 = _charge(client, bp_id)
    assert c2.status_code == 200
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 25


def test_charge_rejected_returns_402(client, make_user, monkeypatch):
    _mock_culqi(monkeypatch, error="Tu tarjeta fue rechazada")
    u = make_user(email="rej@example.com")
    bp_id = _checkout(client, u["headers"])
    c = _charge(client, bp_id, token="tkn_bad")
    assert c.status_code == 402, c.text
    assert "rechaz" in c.json()["detail"].lower()
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 0


def test_premium_charge_accumulates(client, make_user, monkeypatch):
    _mock_culqi(monkeypatch)
    u = make_user(email="prem@example.com")

    def buy():
        r = client.post("/billing/premium/checkout", headers=u["headers"])
        bp_id = r.json()["billing_payment_id"]
        return _charge(client, bp_id)

    assert buy().status_code == 200
    me1 = client.get("/billing/me", headers=u["headers"]).json()
    assert me1["is_premium"] is True
    first_until = me1["premium_until"]

    assert buy().status_code == 200
    me2 = client.get("/billing/me", headers=u["headers"]).json()
    assert me2["premium_until"] > first_until


def test_webhook_grants_as_backup_and_idempotent(client, make_user, monkeypatch):
    _mock_culqi(monkeypatch)
    u = make_user(email="wh@example.com")
    bp_id = _checkout(client, u["headers"])

    # Simula que el cobro síncrono no corrió y llega el webhook de Culqi.
    from app.services import culqi_service

    charge = {
        "id": "chr_wh_1",
        "object": "charge",
        "outcome": {"type": "venta_exitosa"},
        "metadata": {"billing_payment_id": bp_id},
    }
    monkeypatch.setattr(culqi_service, "get_charge", lambda cid: charge)

    w = client.post("/billing/culqi/webhook", json={"data": {"id": "chr_wh_1"}})
    assert w.status_code == 200, w.text
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 10

    w2 = client.post("/billing/culqi/webhook", json={"data": {"id": "chr_wh_1"}})
    assert w2.status_code == 200
    assert client.get("/billing/me", headers=u["headers"]).json()["event_credits"] == 10


def test_webhook_ignores_non_charge_event(client):
    w = client.post("/billing/culqi/webhook", json={"data": {"id": "ord_123"}})
    assert w.status_code == 200
    assert w.json()["status"] == "ignored"
