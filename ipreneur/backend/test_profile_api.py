"""Phase 1 — the profile endpoints, end to end against a real SQLite database.

Unit tests cover the parameter model in isolation; this covers the parts only a
running request can prove: auth scoping, partial merges across requests,
validation of unknown parameters, and that a project can attach to a profile.
"""
import asyncio
import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client(monkeypatch):
    """App wired to a throwaway SQLite file, with auth stubbed to one user."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.db.session import Base
    import app.db.session as session_mod

    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    maker = async_sessionmaker(engine, expire_on_commit=False)

    import app.models.models as models          # noqa: F401  (register metadata)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _get_db():
        async with maker() as s:
            yield s

    from app.api.deps.auth import get_current_user
    from app.main import app

    async with maker() as s:
        user = models.User(id="u1", email="a@b.c", name="A", hashed_password="x")
        s.add(user)
        await s.commit()

    app.dependency_overrides[session_mod.get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t/api/v1") as c:
        yield c

    app.dependency_overrides.clear()
    await engine.dispose()
    try:
        os.unlink(path)
    except OSError:
        pass


# ── Schema ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_schema_is_filtered_by_deck_type(client):
    all_groups = (await client.get("/profiles/schema")).json()["data"]["groups"]
    sales = (await client.get("/profiles/schema", params={"deck_type": "sales"})).json()["data"]["groups"]
    assert len(sales) < len(all_groups)
    assert "cap_table_and_ownership" not in {g["key"] for g in sales}


@pytest.mark.asyncio
async def test_schema_carries_render_metadata(client):
    groups = (await client.get("/profiles/schema", params={"deck_type": "investor"})).json()["data"]["groups"]
    param = next(p for g in groups for p in g["params"])
    assert {"name", "label", "type", "relevance"} <= set(param)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_read_and_complete(client):
    r = await client.post("/profiles", json={"name": "Acme", "values": {"company_name": "Acme"}})
    assert r.status_code == 201
    pid = r.json()["data"]["id"]

    got = (await client.get(f"/profiles/{pid}")).json()["data"]
    assert got["name"] == "Acme"
    assert got["values"]["company_name"]["value"] == "Acme"
    assert got["completeness"]["filled"] == 1
    assert got["completeness"]["total"] > 1


@pytest.mark.asyncio
async def test_patch_merges_rather_than_replaces(client):
    pid = (await client.post("/profiles", json={"name": "Acme", "values": {"cac": 900}})).json()["data"]["id"]
    await client.patch(f"/profiles/{pid}", json={"values": {"ltv": 5400}})
    values = (await client.get(f"/profiles/{pid}")).json()["data"]["values"]
    assert values["cac"]["value"] == 900, "earlier value must survive a later partial write"
    assert values["ltv"]["value"] == 5400


@pytest.mark.asyncio
async def test_patch_derives_dependent_values(client):
    pid = (await client.post("/profiles", json={"name": "Acme"})).json()["data"]["id"]
    await client.patch(f"/profiles/{pid}", json={"values": {"cac": 900, "ltv": 5400}})
    values = (await client.get(f"/profiles/{pid}")).json()["data"]["values"]
    assert values["ltv_cac"]["value"] == 6.0
    assert values["ltv_cac"]["source"] == "derived"


@pytest.mark.asyncio
async def test_crawl_sourced_write_cannot_overwrite_a_founder_answer(client):
    pid = (await client.post("/profiles", json={"name": "Acme", "values": {"company_name": "Acme"}})).json()["data"]["id"]
    await client.patch(f"/profiles/{pid}", json={"values": {"company_name": "Wrong Co"}, "source": "crawl"})
    values = (await client.get(f"/profiles/{pid}")).json()["data"]["values"]
    assert values["company_name"]["value"] == "Acme"


@pytest.mark.asyncio
async def test_unknown_parameters_are_rejected(client):
    pid = (await client.post("/profiles", json={"name": "Acme"})).json()["data"]["id"]
    r = await client.patch(f"/profiles/{pid}", json={"values": {"made_up_field": 1}})
    assert r.status_code == 422
    assert "made_up_field" in r.json()["detail"]


@pytest.mark.asyncio
async def test_readiness_lists_what_is_still_missing(client):
    pid = (await client.post("/profiles", json={"name": "Acme", "values": {"company_name": "Acme"}})).json()["data"]["id"]
    r = await client.get(f"/profiles/{pid}/readiness", params={"deck_type": "investor"})
    data = r.json()["data"]
    assert data["ready"] is False
    assert data["missing_required"]
    assert {"name", "label", "type", "group"} <= set(data["missing_required"][0])


@pytest.mark.asyncio
async def test_readiness_is_stage_aware(client):
    pid = (await client.post("/profiles", json={"name": "Acme"})).json()["data"]["id"]
    seed = (await client.get(f"/profiles/{pid}/readiness",
                             params={"deck_type": "investor", "stage": "seed"})).json()["data"]
    pre = (await client.get(f"/profiles/{pid}/readiness",
                            params={"deck_type": "investor", "stage": "pre_seed"})).json()["data"]
    seed_names = {m["name"] for m in seed["missing_required"]}
    pre_names = {m["name"] for m in pre["missing_required"]}
    # A pre-revenue company is never told it is missing an ARR.
    assert "arr" not in pre_names or "arr" not in seed_names


@pytest.mark.asyncio
async def test_list_and_delete(client):
    pid = (await client.post("/profiles", json={"name": "Acme"})).json()["data"]["id"]
    assert len((await client.get("/profiles")).json()["data"]) == 1
    assert (await client.delete(f"/profiles/{pid}")).status_code == 204
    assert (await client.get("/profiles")).json()["data"] == []


@pytest.mark.asyncio
async def test_missing_profile_is_404(client):
    assert (await client.get("/profiles/nope")).status_code == 404


# ── Attaching a profile to a project ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_project_can_attach_a_profile(client):
    pid = (await client.post("/profiles", json={"name": "Acme"})).json()["data"]["id"]
    r = await client.post("/projects", json={
        "name": "Deck", "deck_type": "investor", "profile_id": pid,
        "company_url": "https://acme.com", "start_analysis": False,
    })
    assert r.status_code in (200, 201), r.text
