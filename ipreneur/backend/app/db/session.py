"""
Async database engine and session factory.
Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite) for local dev.
"""
import asyncio
import threading
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase
from loguru import logger

from app.core.config import settings


class Base(DeclarativeBase):
    """All ORM models inherit from this base."""
    pass


# Determine database URL — fallback to SQLite if asyncpg is not available
_db_url = settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgresql://") and not _db_url.startswith("postgresql+asyncpg://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if "postgresql+asyncpg" in _db_url:
    try:
        import asyncpg  # noqa: F401
    except ImportError:
        # Fallback to SQLite for local development
        import os
        _db_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        _db_path = os.path.join(_db_dir, "ipreneur.db")
        _db_url = f"sqlite+aiosqlite:///{_db_path}"

engine = create_async_engine(
    _db_url,
    # Keep the pool well under Supabase's session-mode limit (15 total).
    # pool_size=5 + max_overflow=2 = 7 max connections — safe headroom.
    pool_size=5 if "sqlite" not in _db_url else 5,
    max_overflow=2 if "sqlite" not in _db_url else 0,
    echo=settings.app_debug,
    future=True,
    pool_pre_ping=True,
    # Supabase PgBouncer (session or transaction mode) does not support
    # prepared statements — disable the cache to avoid protocol errors.
    **({} if "sqlite" in _db_url else {"connect_args": {"prepared_statement_cache_size": 0, "statement_cache_size": 0}}),
)

AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Per-loop engines for background threads ──────────────────────────────────
# An asyncpg connection belongs permanently to the event loop that opened it.
# `engine` above is a QueuePool owned by uvicorn's loop, so a background thread
# that runs `asyncio.new_event_loop()` and then borrows a pooled connection hits
#
#     RuntimeError: ... got Future ... attached to a different loop
#
# on its first query, followed by `InternalClientError: got result for unknown
# protocol state N` — two loops driving one socket corrupts asyncpg's protocol
# state, and the poisoned connection then goes back into the shared pool where
# an ordinary request can pick it up.
#
# So each foreign loop gets its own engine, with NullPool: connections are
# opened and closed per use and never outlive the loop that created them. That
# costs a connect per query, which is irrelevant next to a minutes-long deck
# generation, and it holds zero idle Supabase connections between queries.
_loop_engines: "dict[int, tuple]" = {}
_loop_engines_lock = threading.Lock()


def _session_factory_for_current_loop() -> async_sessionmaker:
    """Session factory bound to an engine owned by the running loop.

    On uvicorn's own loop this returns the shared pooled factory unchanged, so
    the request path keeps its connection pool and nothing about it changes.
    """
    running = asyncio.get_running_loop()
    if running is _main_loop or _main_loop is None:
        return AsyncSessionFactory

    key = id(running)
    with _loop_engines_lock:
        existing = _loop_engines.get(key)
        if existing is not None:
            return existing[1]

        loop_engine = create_async_engine(
            _db_url,
            poolclass=NullPool,
            echo=settings.app_debug,
            future=True,
            **({} if "sqlite" in _db_url else {
                "connect_args": {
                    "prepared_statement_cache_size": 0,
                    "statement_cache_size": 0,
                },
            }),
        )
        factory = async_sessionmaker(
            bind=loop_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
        _loop_engines[key] = (loop_engine, factory)
        logger.info(f"🧵 Created a NullPool engine for background loop {key}")
        return factory


#: uvicorn's loop, recorded at startup by init_db(). Until then it is None and
#: every caller gets the shared factory, which is correct: nothing runs in a
#: background loop before the app has started.
_main_loop: Optional[asyncio.AbstractEventLoop] = None


async def dispose_loop_engine() -> None:
    """Dispose the current loop's engine. Call before closing a worker loop."""
    try:
        key = id(asyncio.get_running_loop())
    except RuntimeError:
        return
    with _loop_engines_lock:
        entry = _loop_engines.pop(key, None)
    if entry is not None:
        await entry[0].dispose()
        logger.info(f"🧵 Disposed background loop engine {key}")


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for non-request DB sessions (e.g. background tasks).

    Picks the factory for whichever loop is running, so the same call works on
    the request path and inside a background thread.
    """
    factory = _session_factory_for_current_loop()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for request-scoped DB sessions."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Initialise the database.

    Runs create_all to ensure all required tables exist (idempotent across both
    PostgreSQL and SQLite).
    """
    # Record uvicorn's loop so _session_factory_for_current_loop() can tell the
    # request path from a background thread's loop.
    global _main_loop
    _main_loop = asyncio.get_running_loop()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        if "sqlite" in _db_url:
            # Lightweight dev migration: create_all won't ADD columns to existing
            # tables. Add any missing project columns (SQLite dev only).
            rows = await conn.exec_driver_sql("PRAGMA table_info('projects')")
            cols = {r[1] for r in rows.fetchall()}
            _dev_add_cols = {
                "template_key": "VARCHAR(32)",
                "assets": "TEXT",  # JSONType serializes to TEXT on SQLite
            }
            for col, ddl in _dev_add_cols.items():
                if col not in cols:
                    await conn.exec_driver_sql(f"ALTER TABLE projects ADD COLUMN {col} {ddl}")

    await check_schema_drift()


async def check_schema_drift() -> Optional[list[str]]:
    """Warn loudly when the models declare a column the database lacks.

    `create_all()` creates missing TABLES but never alters existing ones, so
    adding a column to a model that is already deployed leaves the database
    behind. Every query against that model then fails at the driver — which
    surfaces to the user as an endpoint that 500s and a UI that spins forever,
    with nothing in the logs pointing at the real cause.

    This turns that into one explicit line naming the missing columns and the
    command that fixes them.

    Returns the list of missing columns, or **None** when the check could not
    run at all (database unreachable). Those are different answers and must not
    look alike: reporting "no drift" because we failed to connect is exactly the
    kind of false reassurance this function exists to remove.
    """
    from sqlalchemy import inspect as sa_inspect

    def _collect(sync_conn) -> list[str]:
        insp = sa_inspect(sync_conn)
        existing_tables = set(insp.get_table_names())
        drift: list[str] = []
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue          # create_all() handles wholly-new tables
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in have:
                    drift.append(f"{table.name}.{col.name}")
        return drift

    try:
        async with engine.connect() as conn:
            drift = await conn.run_sync(_collect)
    except Exception as exc:                      # never block startup on this
        logger.warning(f"schema drift check could not run (database unreachable): {exc}")
        return None

    if drift:
        logger.error(
            "❌ DATABASE SCHEMA IS BEHIND THE MODELS — missing column(s): "
            + ", ".join(drift)
            + "  |  Every query touching those tables will fail. Fix with: "
            "python scripts/db/migrate.py"
        )
    return drift


async def drop_db() -> None:
    """Drop all tables. Only for testing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)