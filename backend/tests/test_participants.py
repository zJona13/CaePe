from __future__ import annotations

from decimal import Decimal


def _bootstrap(client, make_user):
    organizer = make_user(email="org@example.com")
    group = client.post(
        "/groups", json={"name": "Crew"}, headers=organizer["headers"]
    ).json()
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Comida",
            "total_budget": "60.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=organizer["headers"],
    ).json()
    return organizer, event


def test_add_participant_recalculates_amount_for_all(client, make_user):
    organizer, event = _bootstrap(client, make_user)
    assert Decimal(event["amount_per_person"]) == Decimal("30.00")

    r = client.post(
        f"/events/{event['id']}/participants",
        json={"name": "C"},
        headers=organizer["headers"],
    )
    assert r.status_code == 201, r.text

    detail = client.get(f"/events/{event['id']}").json()
    assert Decimal(detail["amount_per_person"]) == Decimal("20.00")
    assert len(detail["participants"]) == 3
    for p in detail["participants"]:
        assert Decimal(p["amount_due"]) == Decimal("20.00")


def test_non_organizer_cannot_add_participant(client, make_user):
    organizer, event = _bootstrap(client, make_user)
    other = make_user(email="other@example.com")

    r = client.post(
        f"/events/{event['id']}/participants",
        json={"name": "Z"},
        headers=other["headers"],
    )
    assert r.status_code == 403


def test_marking_paid_then_pending_clears_paid_at(client, make_user):
    organizer, event = _bootstrap(client, make_user)
    pid = event["participants"][0]["id"]

    paid = client.patch(
        f"/events/{event['id']}/participants/{pid}/payment",
        json={"payment_status": "paid"},
        headers=organizer["headers"],
    ).json()
    assert paid["paid_at"] is not None

    pending = client.patch(
        f"/events/{event['id']}/participants/{pid}/payment",
        json={"payment_status": "pending"},
        headers=organizer["headers"],
    ).json()
    assert pending["paid_at"] is None
    assert pending["payment_status"] == "pending"


def test_unknown_participant_returns_404(client, make_user):
    organizer, event = _bootstrap(client, make_user)
    bogus = "00000000-0000-0000-0000-000000000000"

    r = client.patch(
        f"/events/{event['id']}/participants/{bogus}/payment",
        json={"payment_status": "paid"},
        headers=organizer["headers"],
    )
    assert r.status_code == 404
