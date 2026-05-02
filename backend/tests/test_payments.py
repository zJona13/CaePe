from __future__ import annotations

import io


def _setup(client, make_user):
    organizer = make_user(email="org@example.com")
    group = client.post(
        "/groups", json={"name": "Crew"}, headers=organizer["headers"]
    ).json()
    event = client.post(
        "/events",
        json={
            "group_id": group["id"],
            "name": "Pizza",
            "total_budget": "40.00",
            "participants": [{"name": "A"}, {"name": "B"}],
        },
        headers=organizer["headers"],
    ).json()
    return organizer, event


def test_upload_proof_creates_pending_payment(client, make_user):
    organizer, event = _setup(client, make_user)
    pid = event["participants"][0]["id"]

    file_bytes = io.BytesIO(b"fake-image-bytes")
    r = client.post(
        "/payments/upload-proof",
        data={
            "event_id": event["id"],
            "participant_id": pid,
            "amount": "20.00",
        },
        files={"file": ("yape.png", file_bytes, "image/png")},
        headers=organizer["headers"],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["proof_image_url"] == "placeholder://yape.png"
    assert body["amount"] == "20.00"


def test_upload_proof_works_without_file(client, make_user):
    organizer, event = _setup(client, make_user)
    pid = event["participants"][1]["id"]

    r = client.post(
        "/payments/upload-proof",
        data={
            "event_id": event["id"],
            "participant_id": pid,
            "amount": "20.00",
        },
        headers=organizer["headers"],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["proof_image_url"] is None


def test_confirm_payment_marks_participant_paid_and_funds_event(client, make_user):
    organizer, event = _setup(client, make_user)
    p1 = event["participants"][0]["id"]
    p2 = event["participants"][1]["id"]

    payment_1 = client.post(
        "/payments/upload-proof",
        data={"event_id": event["id"], "participant_id": p1, "amount": "20.00"},
        headers=organizer["headers"],
    ).json()
    payment_2 = client.post(
        "/payments/upload-proof",
        data={"event_id": event["id"], "participant_id": p2, "amount": "20.00"},
        headers=organizer["headers"],
    ).json()

    r1 = client.patch(
        f"/payments/{payment_1['id']}/confirm", headers=organizer["headers"]
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "confirmed"

    detail_partial = client.get(f"/events/{event['id']}").json()
    assert detail_partial["status"] != "funded"

    r2 = client.patch(
        f"/payments/{payment_2['id']}/confirm", headers=organizer["headers"]
    )
    assert r2.status_code == 200

    detail_funded = client.get(f"/events/{event['id']}").json()
    assert detail_funded["status"] == "funded"


def test_non_organizer_cannot_confirm(client, make_user):
    organizer, event = _setup(client, make_user)
    other = make_user(email="other@example.com")
    pid = event["participants"][0]["id"]

    payment = client.post(
        "/payments/upload-proof",
        data={"event_id": event["id"], "participant_id": pid, "amount": "20.00"},
        headers=organizer["headers"],
    ).json()

    r = client.patch(f"/payments/{payment['id']}/confirm", headers=other["headers"])
    assert r.status_code == 403
