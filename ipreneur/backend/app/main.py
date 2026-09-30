"""
iPreneur Backend — FastAPI Application Entry Point

Architecture:
  - Async FastAPI with lifespan context
  - Modular router registration
  - Middleware stack: CORS, Auth, Logging, Error handling
  - Startup: DB init
"""
import sys
import asyncio

# Playwright requires subprocess support — WindowsSelectorEventLoop (Windows default)
# does not support subprocesses; ProactorEventLoop does.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.core.config import settings
from app.db.session import engine, init_db


# ─── Logging ──────────────────────────────────────────────────────────────────
# SECURITY: loguru's default handler has diagnose=True, which dumps every frame's
# local variables into tracebacks. Those locals include API keys (e.g. the Gemini
# key inside genai_client). Reconfigure with diagnose=False so secrets never reach
# the logs. backtrace=True keeps the stack readable without printing values.
logger.remove()
logger.add(
    sys.stderr,
    level=settings.log_level,
    backtrace=True,
    diagnose=False,
)


# ─── Lifespan ─────────────────────────────────────────────────────────────────

async def _reconcile_orphaned_jobs() -> int:
    """Fail jobs that were mid-flight when the process last stopped.

    Generation runs in a detached daemon thread that does not survive a restart,
    deploy or crash. Its job row is left at "running" forever, the project stays
    "generating", and the user watches a spinner that will never resolve — with
    no way to retry, because the project is not in a state the UI offers a retry
    for. Nothing else ever revisits those rows.

    Any job still marked running at startup therefore belongs to a process that
    no longer exists. Marking it failed turns a permanent hang into a visible,
    retryable error. This does not make generation survive a restart — moving it
    onto the Celery worker is what would — but it stops a deploy from silently
    stranding whatever was in flight.
    """
    from sqlalchemy import select, update
    from app.db.session import get_db_context
    from app.models.models import Job, Project

    MSG = "Generation was interrupted by a server restart. Please try again."
    try:
        async with get_db_context() as db:
            rows = (await db.execute(
                select(Job.id, Job.project_id).where(Job.status.in_(("running", "queued")))
            )).all()
            if not rows:
                return 0
            job_ids = [r[0] for r in rows]
            project_ids = [r[1] for r in rows]

            await db.execute(
                update(Job)
                .where(Job.id.in_(job_ids))
                .values(status="failed", error=MSG, completed_at=datetime.now(timezone.utc))
            )
            # Only projects still mid-flight — never touch one that finished since.
            await db.execute(
                update(Project)
                .where(Project.id.in_(project_ids))
                .where(Project.status.in_(("analyzing", "researching", "generating")))
                .values(status="error", error_message=MSG)
            )
            await db.commit()
            return len(job_ids)
    except Exception as e:  # never let reconciliation stop the app booting
        logger.warning(f"Could not reconcile orphaned jobs: {e}")
        return 0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle."""
    logger.info(f"🚀 Starting {settings.app_name} [{settings.app_env}]")

    # Create tables in dev
    if not settings.is_production:
        await init_db()
        logger.info("✅ Database tables ensured")

    orphaned = await _reconcile_orphaned_jobs()
    if orphaned:
        logger.warning(f"⚠️  Failed {orphaned} job(s) orphaned by the previous shutdown")

    yield  # App runs here

    logger.info("🔴 Shutting down")
    await engine.dispose()


# ─── Application Factory ──────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description="AI-powered investor pitch deck generator",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware ───────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static: user-uploaded assets (logo, gallery photos) ──────────────────
    import os
    from fastapi.staticfiles import StaticFiles
    from app.services.storage import UPLOAD_DIR
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

    # ── Routers ──────────────────────────────────────────────────────────────
    from app.api.v1.routes import router as api_v1_router
    app.include_router(api_v1_router, prefix="/api/v1")

    # ── Global Exception Handler ─────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            },
        )

    # ── Health Check ─────────────────────────────────────────────────────────
    @app.get("/health", tags=["infra"])
    async def health_check():
        return {"status": "ok", "app": settings.app_name, "env": settings.app_env}

    return app


app = create_app()
