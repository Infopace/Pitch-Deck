"""Webhooks endpoint — Razorpay one-time payment events.

Backstops the client-driven /billing/credits/verify call: if a browser tab
closes after payment but before that call fires, Razorpay's own webhook
still confirms it here, so a paid credit is never stranded in "created".
"""
import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.models import DeckCredit

router = APIRouter()


@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Keep deck credits in step with Razorpay. Rejects anything not signed
    with the webhook secret."""
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret is not configured.")

    raw = await request.body()
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Razorpay-Signature", "")):
        raise HTTPException(status_code=400, detail="Invalid signature.")

    event = json.loads(raw)
    name = event.get("event", "")
    if name not in ("payment.captured", "order.paid"):
        return {"received": True}

    payment_entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    payment_id = payment_entity.get("id")
    if not order_id or not payment_id:
        return {"received": True}

    credit = (
        await db.execute(select(DeckCredit).where(DeckCredit.razorpay_order_id == order_id))
    ).scalar_one_or_none()
    if credit is None or credit.status == "paid" or credit.status == "consumed":
        return {"received": True}

    credit.status = "paid"
    credit.razorpay_payment_id = payment_id
    await db.commit()
    return {"received": True}
