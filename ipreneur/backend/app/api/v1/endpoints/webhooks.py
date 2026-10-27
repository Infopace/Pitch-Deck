"""Webhooks endpoint — Razorpay subscription events."""
import hashlib
import hmac
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.billing import SELF_SERVE_ROLES
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Subscription, User

router = APIRouter()

ACTIVE_EVENTS = {"subscription.activated", "subscription.charged", "subscription.resumed"}
ENDED_EVENTS = {"subscription.cancelled", "subscription.halted", "subscription.completed", "subscription.expired"}


def _ts(value) -> datetime | None:
    return datetime.fromtimestamp(value, tz=timezone.utc) if value else None


@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Keep the plan in step with Razorpay. Rejects anything not signed with
    the webhook secret."""
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret is not configured.")

    raw = await request.body()
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Razorpay-Signature", "")):
        raise HTTPException(status_code=400, detail="Invalid signature.")

    event = json.loads(raw)
    name = event.get("event", "")
    entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
    sub_id = entity.get("id")
    if not sub_id or not (name in ACTIVE_EVENTS or name in ENDED_EVENTS):
        return {"received": True}

    sub = (await db.execute(select(Subscription).where(Subscription.razorpay_subscription_id == sub_id))).scalar_one_or_none()
    if sub is None:
        return {"received": True}
    user = (await db.execute(select(User).where(User.id == sub.user_id))).scalar_one_or_none()

    if name in ACTIVE_EVENTS:
        sub.plan, sub.status = "pro", "active"
        sub.current_period_start = _ts(entity.get("current_start"))
        sub.current_period_end = _ts(entity.get("current_end"))
        if user and user.role in SELF_SERVE_ROLES:
            user.role = "pro"
    else:
        sub.plan, sub.status = "free", "ended"
        if user and user.role == "pro":
            user.role = "free"

    await db.commit()
    return {"received": True}
