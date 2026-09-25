"""The schema-drift guard, and the SQL splitter the migration runner uses.

This exists because of a real failure: `projects.profile_id` was added to the
model but never to the deployed database. `create_all()` creates missing tables
but never alters existing ones, so every project query failed at the driver and
the dashboard sat on empty skeletons — with nothing in the logs naming the
cause. The guard turns that into one explicit line.
"""
import asyncio
import importlib.util
import os
import tempfile

import pytest
from sqlalchemy import Column, MetaData, String, Table, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.session import Base, check_schema_drift


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def sqlite_engine(monkeypatch):
    """Point the drift checker at a throwaway SQLite database."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    monkeypatch.setattr("app.db.session.engine", engine)
    yield engine
    _run(engine.dispose())
    try:
        os.unlink(path)
    except OSError:
        pass


def test_reports_no_drift_when_schema_matches(sqlite_engine, monkeypatch):
    md = MetaData()
    Table("widget", md, Column("id", String(36), primary_key=True),
          Column("name", String(50)))
    monkeypatch.setattr(Base, "metadata", md)

    async def setup():
        async with sqlite_engine.begin() as c:
            await c.run_sync(md.create_all)
        return await check_schema_drift()

    assert _run(setup()) == []


def test_reports_the_missing_column_by_name(sqlite_engine, monkeypatch):
    """The exact failure mode that broke the dashboard."""
    md = MetaData()
    Table("widget", md, Column("id", String(36), primary_key=True))
    monkeypatch.setattr(Base, "metadata", md)

    async def setup():
        async with sqlite_engine.begin() as c:
            await c.run_sync(md.create_all)
        # Now the model grows a column the database does not have — exactly what
        # adding profile_id to Project did.
        md2 = MetaData()
        Table("widget", md2, Column("id", String(36), primary_key=True),
              Column("profile_id", String(36)))
        monkeypatch.setattr(Base, "metadata", md2)
        return await check_schema_drift()

    assert _run(setup()) == ["widget.profile_id"]


def test_tables_that_do_not_exist_yet_are_not_drift(sqlite_engine, monkeypatch):
    """create_all() handles wholly-new tables; only existing ones can drift."""
    md = MetaData()
    Table("not_created_yet", md, Column("id", String(36), primary_key=True))
    monkeypatch.setattr(Base, "metadata", md)
    assert _run(check_schema_drift()) == []


def test_unreachable_database_reports_unknown_not_clean(monkeypatch):
    """A connection failure must never look like a healthy schema."""
    bad = create_async_engine("postgresql+asyncpg://u:p@127.0.0.1:1/none")
    monkeypatch.setattr("app.db.session.engine", bad)
    assert _run(check_schema_drift()) is None
    _run(bad.dispose())


# ── The migration runner's SQL splitter ───────────────────────────────────────

def _load_migrate():
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "scripts", "db", "migrate.py")
    spec = importlib.util.spec_from_file_location("migrate_mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_splitter_separates_plain_statements():
    m = _load_migrate()
    got = m.statements("CREATE TABLE a (id int);\nALTER TABLE a ADD COLUMN b int;\n")
    assert len(got) == 2


def test_splitter_keeps_dollar_quoted_blocks_whole():
    """A DO $$ ... $$ block contains semicolons and must not be split on them."""
    m = _load_migrate()
    sql = ("ALTER TABLE a ADD COLUMN b int;\n"
           "DO $$ BEGIN\n"
           "  ALTER TABLE a ADD CONSTRAINT c FOREIGN KEY (b) REFERENCES d(id);\n"
           "EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n")
    got = m.statements(sql)
    assert len(got) == 2
    assert "EXCEPTION" in got[1] and got[1].count("ALTER") == 1


def test_splitter_drops_comment_only_lines():
    m = _load_migrate()
    assert m.statements("-- just a comment\n\n") == []


def test_drift_line_never_calls_unknown_clean():
    m = _load_migrate()
    assert "UNKNOWN" in m._drift_line(None)
    assert "none" in m._drift_line([])
    assert "projects.profile_id" in m._drift_line(["projects.profile_id"])
