from __future__ import annotations


def test_create_group_returns_invite_code(client, make_user):
    user = make_user(email="alice@example.com")

    r = client.post("/groups", json={"name": "Patas del barrio"}, headers=user["headers"])

    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Patas del barrio"
    assert body["owner_id"] == user["sub"]
    assert isinstance(body["invite_code"], str)
    assert len(body["invite_code"]) == 8


def test_list_groups_only_returns_user_groups(client, make_user):
    alice = make_user(email="alice@example.com")
    bob = make_user(email="bob@example.com")

    client.post("/groups", json={"name": "G1"}, headers=alice["headers"])
    client.post("/groups", json={"name": "G2"}, headers=bob["headers"])

    r_alice = client.get("/groups", headers=alice["headers"])
    assert r_alice.status_code == 200
    names_alice = [g["name"] for g in r_alice.json()]
    assert names_alice == ["G1"]


def test_join_via_link_authenticated_creates_member(client, make_user):
    owner = make_user(email="owner@example.com")
    new_member = make_user(email="newbie@example.com")

    g = client.post("/groups", json={"name": "Salidas"}, headers=owner["headers"]).json()

    r = client.post(f"/groups/join/{g['invite_code']}", headers=new_member["headers"])

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["group_id"] == g["id"]
    assert body["user_id"] == new_member["sub"]
    assert body["role"] == "member"
    assert body["status"] == "active"


def test_join_via_link_unauthenticated_creates_guest(client, make_user):
    owner = make_user(email="owner@example.com")
    g = client.post("/groups", json={"name": "Salidas"}, headers=owner["headers"]).json()

    r = client.post(f"/groups/join/{g['invite_code']}")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["group_id"] == g["id"]
    assert body["user_id"] is None
    assert body["role"] == "guest"


def test_join_with_unknown_code_returns_404(client):
    r = client.post("/groups/join/NOTACODE")
    assert r.status_code == 404


def test_create_invite_for_group(client, make_user):
    owner = make_user(email="owner@example.com")
    g = client.post("/groups", json={"name": "X"}, headers=owner["headers"]).json()

    r = client.post(f"/groups/{g['id']}/invite", headers=owner["headers"])

    assert r.status_code == 201, r.text
    body = r.json()
    assert body["group_id"] == g["id"]
    assert body["event_id"] is None
    assert isinstance(body["invite_code"], str) and len(body["invite_code"]) == 8


def test_get_group_forbidden_for_non_member(client, make_user):
    owner = make_user(email="owner@example.com")
    stranger = make_user(email="stranger@example.com")

    g = client.post("/groups", json={"name": "Closed"}, headers=owner["headers"]).json()

    r = client.get(f"/groups/{g['id']}", headers=stranger["headers"])
    assert r.status_code == 403


def test_get_group_by_invite_is_public(client, make_user):
    owner = make_user(email="owner@example.com")
    g = client.post("/groups", json={"name": "La Collera"}, headers=owner["headers"]).json()

    # Sin headers de auth: la lectura por código debe ser pública.
    r = client.get(f"/groups/by-invite/{g['invite_code']}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == g["id"]
    assert body["name"] == "La Collera"
    assert body["members_count"] == 1  # el owner
    # No debe filtrar datos sensibles.
    assert "invite_code" not in body
    assert "owner_id" not in body


def test_get_group_by_invite_unknown_code_returns_404(client):
    r = client.get("/groups/by-invite/NOPECODE")
    assert r.status_code == 404, r.text
