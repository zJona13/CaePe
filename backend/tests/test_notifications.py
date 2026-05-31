from __future__ import annotations


def _group_and_token(client, make_user):
    organizer = make_user(email="org@example.com")
    group = client.post("/groups", json={"name": "Crew"}, headers=organizer["headers"]).json()
    return organizer, group


def test_register_token_creates_and_is_idempotent(client, make_user):
    user = make_user(email="a@example.com")
    body = {"token": "ExponentPushToken[abc123]", "platform": "android"}

    r1 = client.post("/notifications/register-token", json=body, headers=user["headers"])
    assert r1.status_code == 201, r1.text
    assert r1.json()["token"] == body["token"]

    # Re-registrar el mismo token no duplica ni falla.
    r2 = client.post("/notifications/register-token", json=body, headers=user["headers"])
    assert r2.status_code == 201, r2.text
    assert r2.json()["token"] == body["token"]


def test_unregister_token(client, make_user):
    user = make_user(email="b@example.com")
    body = {"token": "ExponentPushToken[del]", "platform": "ios"}
    client.post("/notifications/register-token", json=body, headers=user["headers"])

    r = client.post("/notifications/unregister-token", json=body, headers=user["headers"])
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True


def test_send_reminder_counts_pending_participants(client, make_user):
    organizer, group = _group_and_token(client, make_user)
    member = make_user(email="member@example.com")
    # El miembro se une al grupo.
    client.post(f"/groups/join/{group['invite_code']}", headers=member["headers"])

    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Pizza",
            "total_budget": "40.00",
            "member_user_ids": [member["sub"]],
        },
        headers=organizer["headers"],
    ).json()

    # organizer + member, ambos pendientes y con user_id.
    r = client.post(
        "/notifications/send-reminder",
        params={"event_id": event["id"]},
        headers=organizer["headers"],
    )
    assert r.status_code == 200, r.text
    assert r.json()["notified"] == 2


def test_send_reminder_only_organizer(client, make_user):
    organizer, group = _group_and_token(client, make_user)
    intruder = make_user(email="intruder@example.com")
    event = client.post(
        "/events",
        json={"group_id": group["id"], "name": "Cine", "total_budget": "30.00"},
        headers=organizer["headers"],
    ).json()

    r = client.post(
        "/notifications/send-reminder",
        params={"event_id": event["id"]},
        headers=intruder["headers"],
    )
    assert r.status_code == 403, r.text
