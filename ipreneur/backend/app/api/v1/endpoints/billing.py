"""Billing endpoints — plan info and Razorpay subscription checkout."""
import hashlib
import hmac

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import Subscription, User

router = APIRouter()

RAZORPAY_API = "https://api.razorpay.com/v1"

#: Roles a paid subscription may change. Admin and enterprise accounts are set
#: by hand and must never be downgraded by a payment event.
SELF_SERVE_ROLES = {"free", "pro"}


def _require_razorpay() -> None:
    if not (settings.razorpay_key_id and settings.razorpay_key_secret and settings.razorpay_pro_plan_id):
        raise HTTPException(status_code=503, detail="Online checkout is not configured yet.")


async def _razorpay(method: str, path: str, json: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.request(
            method,
            f"{RAZORPAY_API}{path}",
            json=json,
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="The payment provider rejected the request. Try again.")
    return resp.json()


async def get_or_create_subscription(db: AsyncSession, user_id: str) -> Subscription:
    sub = (await db.execute(select(Subscription).where(Subscription.user_id == user_id))).scalar_one_or_none()
    if sub is None:
        sub = Subscription(user_id=user_id, plan="free", status="active")
        db.add(sub)
    return sub


class PlanInfo(BaseModel):
    plan: str
    projects_limit: int
    exports_limit: int
    is_active: bool


PLAN_LIMITS = {
    "free": {"projects_limit": 3, "exports_limit": 3},
    "pro": {"projects_limit": 50, "exports_limit": 50},
    "enterprise": {"projects_limit": -1, "exports_limit": -1},
    "admin": {"projects_limit": -1, "exports_limit": -1},
}


@router.get("/plan", response_model=PlanInfo)
async def get_current_plan(current_user: User = Depends(get_current_user)):
    """Get the current user's subscription plan."""
    limits = PLAN_LIMITS.get(current_user.role, PLAN_LIMITS["free"])
    return PlanInfo(
        plan=current_user.role,
        projects_limit=limits["projects_limit"],
        exports_limit=limits["exports_limit"],
        is_active=current_user.is_active,
    )


class PlanSummary(BaseModel):
    name: str
    price: str
    features: list[str]


@router.get("/plans", response_model=list[PlanSummary])
async def list_plans():
    """List available subscription plans."""
    return [
        PlanSummary(
            name="Free",
            price="$0/mo",
            features=["3 pitch decks/month", "Basic templates", "PPTX export"],
        ),
        PlanSummary(
            name="Pro",
            price="$29/mo",
            features=["50 pitch decks/month", "Premium templates", "PPTX + PDF export", "Priority AI processing"],
        ),
        PlanSummary(
            name="Enterprise",
            price="Custom",
            features=["Unlimited decks", "Custom branding", "API access", "Team collaboration", "Dedicated support"],
        ),
    ]


# ── Razorpay checkout ────────────────────────────────────────────────────────

class CheckoutSession(BaseModel):
    subscription_id: str
    key_id: str


@router.post("/checkout", response_model=CheckoutSession)
async def create_checkout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay subscription for the Pro plan and return what the
    browser checkout needs to open."""
    _require_razorpay()
    if current_user.role not in SELF_SERVE_ROLES:
        raise HTTPException(status_code=400, detail="Your plan is managed by the iPreneur team.")
    if current_user.role == "pro":
        raise HTTPException(status_code=400, detail="You are already on the Pro plan.")

    created = await _razorpay(
        "POST",
        "/subscriptions",
        {
            "plan_id": settings.razorpay_pro_plan_id,
            "total_count": 120,
            "customer_notify": 1,
            "notes": {"user_id": current_user.id, "email": current_user.email},
        },
    )
    sub = await get_or_create_subscription(db, current_user.id)
    sub.razorpay_subscription_id = created["id"]
    sub.status = "created"
    await db.commit()
    return CheckoutSession(subscription_id=created["id"], key_id=settings.razorpay_key_id)


class VerifyPayment(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


@router.post("/verify")
async def verify_payment(
    body: VerifyPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm the browser checkout result. The signature proves Razorpay
    produced it, so the plan only changes on a valid one."""
    _require_razorpay()
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{body.razorpay_payment_id}|{body.razorpay_subscription_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment could not be verified.")

    sub = await get_or_create_subscription(db, current_user.id)
    if sub.razorpay_subscription_id != body.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail="This payment does not belong to your account.")

    sub.plan = "pro"
    sub.status = "active"
    if current_user.role in SELF_SERVE_ROLES:
        current_user.role = "pro"
    await db.commit()
    return {"plan": "pro", "status": "active"}


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stop renewal. Pro access continues to the end of the paid period; the
    webhook downgrades the account when Razorpay reports it ended."""
    _require_razorpay()
    sub = (await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))).scalar_one_or_none()
    if sub is None or not sub.razorpay_subscription_id or current_user.role != "pro":
        raise HTTPException(status_code=400, detail="There is no active subscription to cancel.")
    await _razorpay("POST", f"/subscriptions/{sub.razorpay_subscription_id}/cancel", {"cancel_at_cycle_end": 1})
    sub.status = "cancelling"
    await db.commit()
    return {"status": "cancelling"}
