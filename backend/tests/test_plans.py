from __future__ import annotations


def test_seed_inserts_30_and_is_idempotent(client):
    r1 = client.post("/plans/seed")
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["inserted"] == 30
    assert body1["total"] == 30

    r2 = client.post("/plans/seed")
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["inserted"] == 0
    assert body2["total"] == 30


def test_filter_by_category_returns_only_that_category(client):
    client.post("/plans/seed")

    r = client.get("/plans", params={"category": "comida"})
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) > 0
    assert all(p["category"] == "comida" for p in plans)


def test_filter_by_price_max(client):
    client.post("/plans/seed")

    r = client.get("/plans", params={"price_max": 20})
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) > 0
    assert all(float(p["price_min"]) <= 20 for p in plans)


def test_filter_by_city(client):
    client.post("/plans/seed")

    r = client.get("/plans", params={"city": "Chiclayo"})
    assert r.status_code == 200
    assert len(r.json()) == 30

    r2 = client.get("/plans", params={"city": "Lima"})
    assert r2.status_code == 200
    assert r2.json() == []


def test_filter_combined(client):
    client.post("/plans/seed")

    r = client.get("/plans", params={"category": "comida", "price_max": 25, "city": "Chiclayo"})
    assert r.status_code == 200
    plans = r.json()
    assert len(plans) > 0
    for p in plans:
        assert p["category"] == "comida"
        assert p["city"] == "Chiclayo"
        assert float(p["price_min"]) <= 25


def test_random_returns_one_plan_in_category(client):
    client.post("/plans/seed")

    r = client.get("/plans/random", params={"category": "comida"})
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "comida"
    assert "id" in body and "name" in body


def test_random_404_when_no_match(client):
    client.post("/plans/seed")

    r = client.get("/plans/random", params={"category": "deporte", "price_max": 0})
    assert r.status_code == 404
