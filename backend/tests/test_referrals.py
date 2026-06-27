from __future__ import annotations

import uuid


def _register(client, make_token, *, email, referral_code=None, device_hash=None, phone=None):
    """Provisiona un usuario vía /auth/register (con código de referido opcional)."""
    sub = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {make_token(sub=sub, email=email)}"}
    payload = {"email": email}
    if referral_code:
        payload["referral_code"] = referral_code
    if device_hash:
        payload["device_hash"] = device_hash
    if phone:
        payload["phone"] = phone
    r = client.post("/auth/register", json=payload, headers=headers)
    assert r.status_code in (200, 201), r.text
    return {"sub": sub, "headers": headers, "email": email}


def _fund_one_event(client, headers):
    """Crea grupo + evento de 1 participante y lo marca pagado → fondeado."""
    g = client.post("/groups", json={"name": "G"}, headers=headers)
    assert g.status_code == 201, g.text
    ev = client.post(
        "/events",
        json={"group_id": g.json()["id"], "name": "E", "total_budget": "20.00",
              "participants": [{"name": "Solo"}]},
        headers=headers,
    )
    assert ev.status_code == 201, ev.text
    event = ev.json()
    pid = event["participants"][0]["id"]
    p = client.patch(
        f"/events/{event['id']}/participants/{pid}/payment",
        json={"payment_status": "paid"},
        headers=headers,
    )
    assert p.status_code == 200, p.text
    return event


def test_referral_code_generated_on_register(client, make_token):
    a = _register(client, make_token, email="a@example.com")
    r = client.get("/referrals/me", headers=a["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["referral_code"]) == 8
    assert body["referral_code"] in body["link"]
    assert body["pending"] == 0


def test_funding_event_rewards_referrer_with_premium(client, make_token):
    a = _register(client, make_token, email="ref@example.com")
    code = client.get("/referrals/me", headers=a["headers"]).json()["referral_code"]

    b = _register(client, make_token, email="invited@example.com", referral_code=code,
                  device_hash="dev-b", phone="999000111")

    # Antes de fondear: A no es premium, referido pendiente.
    assert client.get("/billing/me", headers=a["headers"]).json()["is_premium"] is False
    assert client.get("/referrals/me", headers=a["headers"]).json()["pending"] == 1

    _fund_one_event(client, b["headers"])

    me_a = client.get("/referrals/me", headers=a["headers"]).json()
    assert me_a["rewarded"] == 1
    assert me_a["pending"] == 0
    assert client.get("/billing/me", headers=a["headers"]).json()["is_premium"] is True


def test_duplicate_device_does_not_reward_twice(client, make_token):
    a = _register(client, make_token, email="ref2@example.com")
    code = client.get("/referrals/me", headers=a["headers"]).json()["referral_code"]

    b = _register(client, make_token, email="b2@example.com", referral_code=code,
                  device_hash="same-device", phone="111")
    c = _register(client, make_token, email="c2@example.com", referral_code=code,
                  device_hash="same-device", phone="222")

    _fund_one_event(client, b["headers"])
    _fund_one_event(client, c["headers"])

    me_a = client.get("/referrals/me", headers=a["headers"]).json()
    # Solo el primero otorga recompensa; el segundo califica pero no premia.
    assert me_a["rewarded"] == 1
    assert me_a["qualified"] == 1


def test_referred_without_funding_stays_pending(client, make_token):
    a = _register(client, make_token, email="ref3@example.com")
    code = client.get("/referrals/me", headers=a["headers"]).json()["referral_code"]
    _register(client, make_token, email="invited3@example.com", referral_code=code)
    # Sin fondear ningún evento, el referido sigue pendiente y A no es premium.
    assert client.get("/referrals/me", headers=a["headers"]).json()["pending"] == 1
    assert client.get("/billing/me", headers=a["headers"]).json()["is_premium"] is False
