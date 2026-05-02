from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.events_service import calculate_amount_per_person


def _create_group(client, headers, name: str = "G") -> dict:
    r = client.post("/groups", json={"name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_calculate_amount_per_person_exact():
    assert calculate_amount_per_person(Decimal("100"), 4) == Decimal("25.00")


def test_calculate_amount_per_person_rounds_half_up():
    # 100 / 3 = 33.3333... → 33.33 with HALF_UP at 2 decimals
    assert calculate_amount_per_person(Decimal("100"), 3) == Decimal("33.33")


def test_calculate_amount_per_person_zero_raises():
    with pytest.raises(ValueError):
        calculate_amount_per_person(Decimal("100"), 0)


def test_create_event_with_participants_assigns_amount(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"], "Crew")

    payload = {
        "group_id": group["id"],
        "name": "Cevichazo",
        "date": "2026-06-15",
        "total_budget": "120.00",
        "participants": [
            {"name": "Ana"},
            {"name": "Luis"},
            {"name": "Mia"},
            {"name": "Beto"},
        ],
    }
    r = client.post("/events", json=payload, headers=organizer["headers"])

    assert r.status_code == 201, r.text
    body = r.json()
    assert Decimal(body["amount_per_person"]) == Decimal("30.00")
    assert body["status"] == "draft"
    assert len(body["participants"]) == 4
    for p in body["participants"]:
        assert Decimal(p["amount_due"]) == Decimal("30.00")
        assert p["payment_status"] == "pending"


def test_get_event_is_public(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    payload = {
        "group_id": group["id"],
        "name": "Cine",
        "total_budget": "60.00",
        "participants": [{"name": "A"}, {"name": "B"}],
    }
    event = client.post("/events", json=payload, headers=organizer["headers"]).json()

    r = client.get(f"/events/{event['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "Cine"


def test_patch_event_budget_recalculates_amounts(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    payload = {
        "group_id": group["id"],
        "name": "Karaoke",
        "total_budget": "100.00",
        "participants": [{"name": "A"}, {"name": "B"}, {"name": "C"}, {"name": "D"}],
    }
    event = client.post("/events", json=payload, headers=organizer["headers"]).json()
    assert Decimal(event["amount_per_person"]) == Decimal("25.00")

    r = client.patch(
        f"/events/{event['id']}",
        json={"total_budget": "200.00"},
        headers=organizer["headers"],
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert Decimal(body["amount_per_person"]) == Decimal("50.00")
    for p in body["participants"]:
        assert Decimal(p["amount_due"]) == Decimal("50.00")


def test_funded_transition_when_last_participant_pays(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    payload = {
        "group_id": group["id"],
        "name": "Pollada",
        "total_budget": "60.00",
        "participants": [{"name": "A"}, {"name": "B"}, {"name": "C"}],
    }
    event = client.post("/events", json=payload, headers=organizer["headers"]).json()
    pids = [p["id"] for p in event["participants"]]

    # First two paid → still active/draft
    for pid in pids[:2]:
        r = client.patch(
            f"/events/{event['id']}/participants/{pid}/payment",
            json={"payment_status": "paid"},
            headers=organizer["headers"],
        )
        assert r.status_code == 200
    detail = client.get(f"/events/{event['id']}").json()
    assert detail["status"] != "funded"

    # Third one paid → funded automatically
    r = client.patch(
        f"/events/{event['id']}/participants/{pids[2]}/payment",
        json={"payment_status": "paid"},
        headers=organizer["headers"],
    )
    assert r.status_code == 200
    detail = client.get(f"/events/{event['id']}").json()
    assert detail["status"] == "funded"


def test_manual_payment_sets_paid_at(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Bowling",
            "total_budget": "40.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=organizer["headers"],
    ).json()
    pid = event["participants"][0]["id"]

    r = client.patch(
        f"/events/{event['id']}/participants/{pid}/payment",
        json={"payment_status": "paid"},
        headers=organizer["headers"],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["payment_status"] == "paid"
    assert body["paid_at"] is not None


def test_share_message_returns_text_with_invite_code(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Anticuchos",
            "date": "2026-06-20",
            "location": "Parque Principal",
            "total_budget": "80.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=organizer["headers"],
    ).json()

    r = client.post(f"/events/{event['id']}/share-message", headers=organizer["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert "Anticuchos" in body["message"]
    assert "Parque Principal" in body["message"]
    assert "40.00" in body["message"]  # 80/2
    assert isinstance(body["invite_code"], str) and len(body["invite_code"]) == 8
    assert body["invite_code"] in body["message"]


def test_payment_status_summary(client, make_user):
    organizer = make_user(email="org@example.com")
    group = _create_group(client, organizer["headers"])
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Heladería",
            "total_budget": "40.00",
            "participants": [{"name": "A"}, {"name": "B"}, {"name": "C"}, {"name": "D"}],
        },
        headers=organizer["headers"],
    ).json()
    pid = event["participants"][0]["id"]
    client.patch(
        f"/events/{event['id']}/participants/{pid}/payment",
        json={"payment_status": "paid"},
        headers=organizer["headers"],
    )

    r = client.get(f"/events/{event['id']}/payment-status", headers=organizer["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 4
    assert body["paid"] == 1
    assert body["pending"] == 3
    assert body["completion_rate"] == 0.25


def test_non_organizer_cannot_patch(client, make_user):
    organizer = make_user(email="org@example.com")
    other = make_user(email="other@example.com")
    group = _create_group(client, organizer["headers"])
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "X",
            "total_budget": "20.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=organizer["headers"],
    ).json()

    r = client.patch(
        f"/events/{event['id']}",
        json={"total_budget": "40.00"},
        headers=other["headers"],
    )
    assert r.status_code == 403
