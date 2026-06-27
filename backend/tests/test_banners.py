from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.models import AppBanner, BannerAudience, User


def _add_banner(db, **kw):
    b = AppBanner(image_url=kw.pop("image_url", "https://img.test/a.png"), **kw)
    db.add(b)
    db.commit()
    return b


def test_banners_returns_active_ordered_by_priority(client, db_session, make_user):
    _add_banner(db_session, title="low", priority=1)
    _add_banner(db_session, title="high", priority=10)
    _add_banner(db_session, title="off", priority=5, is_active=False)

    u = make_user(email="viewer@example.com")
    r = client.get("/banners", headers=u["headers"])
    assert r.status_code == 200, r.text
    titles = [b["title"] for b in r.json()]
    assert titles == ["high", "low"]


def test_banners_hides_expired_and_future(client, db_session, make_user):
    now = datetime.now(timezone.utc)
    _add_banner(db_session, title="expired", ends_at=now - timedelta(days=1))
    _add_banner(db_session, title="future", starts_at=now + timedelta(days=1))
    _add_banner(db_session, title="current")

    u = make_user(email="viewer2@example.com")
    titles = [b["title"] for b in client.get("/banners", headers=u["headers"]).json()]
    assert titles == ["current"]


def test_free_only_banner_hidden_for_premium(client, db_session, make_user):
    _add_banner(db_session, title="for_free", audience=BannerAudience.free_only)
    _add_banner(db_session, title="for_all", audience=BannerAudience.all)

    u = make_user(email="premiumviewer@example.com")
    user = db_session.get(User, uuid.UUID(u["sub"]))
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=30)
    db_session.add(user)
    db_session.commit()

    titles = [b["title"] for b in client.get("/banners", headers=u["headers"]).json()]
    assert titles == ["for_all"]


def test_banners_public_without_auth(client, db_session):
    _add_banner(db_session, title="public")
    r = client.get("/banners")
    assert r.status_code == 200
    assert [b["title"] for b in r.json()] == ["public"]
