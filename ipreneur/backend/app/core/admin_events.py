"""Writes to the append-only AdminEvent log — the admin dashboard's
notification feed and audit trail in one table.

A logging failure must never break the request that triggered it (a login,
a deck creation, a payment), so this never raises.
"""
from typing import Any, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AdminEvent, User


async def log_event(
    db: AsyncSession,
    type: str,
    *,
    user: Optional[User] = None,
    summary: str = "",
    meta: Optional[dict[str, Any]] = None,
) -> None:
    try:
        db.add(
            AdminEvent(
                type=type,
                user_id=user.id if user is not None else None,
                summary=summary,
                meta=meta,
            )
        )
        await db.flush()
    except Exception as exc:  # pragma: no cover - never let logging break the caller
        logger.warning(f"admin_events.log_event failed | type={type} | error={exc}")
