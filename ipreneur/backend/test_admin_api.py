"""Admin panel endpoints, end to end against a real SQLite database.

Covers the two things a unit test can't: that require_admin actually blocks
a non-admin caller, and that the transaction/event joins return the right
shape once a payment and a deck exist.
"""
import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def ctx(monkeypatch):
    """App wired to a throwaway SQLite file, with a plain user and an admin."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.db.session import Base
    import app.db.session as session_mod

    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    maker = async_sessionmaker(engine, expire_on_commit=False)

    import app.models.models as models  # noqa: F401 (register metadata)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _get_db():
        async with maker() as s:
            yield s

    from app.api.deps.auth import get_current_user
    from app.main import app

    async with maker() as s:
        user = models.User(id="u1", email="plain@x.com", name="Plain", hashed_password="x")
        admin = models.User(id="u2", email="admin@x.com", name="Admin", hashed_password="x", role="admin")
        s.add_all([user, admin])
        await s.commit()

    app.dependency_overrides[session_mod.get_db] = _get_db

    def as_user(u):
        app.dependency_overrides[get_current_user] = lambda: u

    class Ctx:
        def __init__(self):
            self.app = app
            self.maker = maker
            self.user = user
            self.admin = admin
            self.as_user = as_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t/api/v1") as c:
        ctx = Ctx()
        ctx.client = c
        yield ctx

    app.dependency_overrides.clear()
    await engine.dispose()
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_non_admin_is_forbidden(ctx):
    ctx.as_user(ctx.user)
    r = await ctx.client.get("/admin/overview")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_read_overview(ctx):
    ctx.as_user(ctx.admin)
    r = await ctx.client.get("/admin/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["total_users"] == 2
    assert data["revenue_inr_all_time"] == 0


@pytest.mark.asyncio
async def test_deck_creation_is_logged_and_visible_to_admin(ctx):
    ctx.as_user(ctx.user)
    r = await ctx.client.post("/projects", json={
        "name": "Deck", "deck_type": "investor", "company_url": "https://acme.com",
        "start_analysis": False,
    })
    assert r.status_code in (200, 201), r.text

    ctx.as_user(ctx.admin)
    events = (await ctx.client.get("/admin/events")).json()
    assert any(e["type"] == "deck_created" and e["user_id"] == "u1" for e in events)

    projects = (await ctx.client.get("/admin/projects")).json()["data"]
    assert any(p["name"] == "Deck" and p["user_email"] == "plain@x.com" for p in projects)


@pytest.mark.asyncio
async def test_payment_shows_up_as_a_transaction_for_the_right_user(ctx):
    async with ctx.maker() as s:
        import app.models.models as models
        credit = models.DeckCredit(
            id="c1", user_id="u1", deck_type="internal", amount_inr=399,
            razorpay_order_id="order_1", razorpay_payment_id="pay_1", status="paid",
        )
        s.add(credit)
        await s.commit()

        from app.api.v1.endpoints.billing import _record_payment
        await _record_payment(s, credit, "pay_1")
        await s.commit()

    ctx.as_user(ctx.admin)
    txns = (await ctx.client.get("/admin/transactions")).json()["data"]
    assert len(txns) == 1
    assert txns[0]["user_email"] == "plain@x.com"
    assert txns[0]["deck_type"] == "internal"
    assert txns[0]["amount_inr"] == 399

    events = (await ctx.client.get("/admin/events", params={"type": "payment_received"})).json()
    assert len(events) == 1
    assert events[0]["user_id"] == "u1"


@pytest.mark.asyncio
async def test_admin_can_patch_user_and_it_is_audited(ctx):
    ctx.as_user(ctx.admin)
    r = await ctx.client.patch("/admin/users/u1", json={"is_billing_exempt": True})
    assert r.status_code == 200
    assert r.json()["is_billing_exempt"] is True

    events = (await ctx.client.get("/admin/events", params={"type": "admin_action"})).json()
    assert any("admin@x.com" in e["summary"] for e in events)


@pytest.mark.asyncio
async def test_settings_round_trip(ctx):
    ctx.as_user(ctx.admin)
    defaults = (await ctx.client.get("/admin/settings")).json()
    assert defaults["maintenance_mode"] is False
    assert defaults["signups_enabled"] is True

    r = await ctx.client.put("/admin/settings/maintenance_mode", json={"value": True})
    assert r.status_code == 200
    assert r.json()["maintenance_mode"] is True

    r = await ctx.client.put("/admin/settings/not_a_real_key", json={"value": True})
    assert r.status_code == 400
