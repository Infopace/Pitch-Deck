"""Billing endpoints — per-deck-type pricing and Razorpay one-time checkout.

Each deck type is bought individually (see app.decks.pricing) rather than
bundled into a monthly plan. Buying a deck type creates a DeckCredit; once
Razorpay confirms the payment, that credit sits on the user's account until
`consume_credit` spends it on a specific project's analysis run (called from
app.api.v1.endpoints.projects, which gates both /projects?start_analysis=true
and /projects/{id}/analyze on there being an unconsumed, paid credit).
"""
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
from app.decks.pricing import list_pricing, price_for
from app.decks.registry import DECK_TYPES
from app.models.models import DeckCredit, User

router = APIRouter()

RAZORPAY_API = "https://api.razorpay.com/v1"


def _require_razorpay() -> None:
    if not (settings.razorpay_key_id and settings.razorpay_key_secret):
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


async def has_paid_credit(db: AsyncSession, user_id: str, deck_type: str) -> bool:
    """Read-only check used before creating a project, so an unpaid request
    never gets as far as inserting a row."""
    credit = (
        await db.execute(
            select(DeckCredit.id)
            .where(DeckCredit.user_id == user_id)
            .where(DeckCredit.deck_type == deck_type)
            .where(DeckCredit.status == "paid")
            .limit(1)
        )
    ).scalar_one_or_none()
    return credit is not None


async def project_already_paid(db: AsyncSession, project_id: str) -> bool:
    """True once some credit has been consumed for this project — lets a
    retry after a failed run skip paying twice for the same deck."""
    credit = (
        await db.execute(
            select(DeckCredit.id)
            .where(DeckCredit.project_id == project_id)
            .where(DeckCredit.status == "consumed")
            .limit(1)
        )
    ).scalar_one_or_none()
    return credit is not None


async def consume_credit(db: AsyncSession, user_id: str, deck_type: str, project_id: str) -> bool:
    """Spend one paid, unconsumed credit of this deck type on this project.

    Returns False (and touches nothing) if the user has no such credit —
    the caller is expected to turn that into a 402 with the price attached.
    Does not commit; the caller's own transaction covers both this and the
    analysis it's gating, so a failure after this point doesn't strand a
    spent credit against a project that never actually started.
    """
    credit = (
        await db.execute(
            select(DeckCredit)
            .where(DeckCredit.user_id == user_id)
            .where(DeckCredit.deck_type == deck_type)
            .where(DeckCredit.status == "paid")
            .order_by(DeckCredit.created_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if credit is None:
        return False
    credit.status = "consumed"
    credit.project_id = project_id
    return True


# ── Pricing ──────────────────────────────────────────────────────────────────

class PricingRow(BaseModel):
    key: str
    label: str
    price_inr: int


@router.get("/pricing", response_model=list[PricingRow])
async def get_pricing():
    """Every deck type that's sold individually, and what it costs."""
    return [PricingRow(**row) for row in list_pricing()]


# ── Credits (purchase history / invoices) ───────────────────────────────────

class CreditRow(BaseModel):
    id: str
    deck_type: str
    deck_label: str
    amount_inr: int
    status: str
    created_at: str
    project_id: str | None = None


@router.get("/credits", response_model=list[CreditRow])
async def list_credits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The current user's deck purchases, most recent first — the billing
    page's invoice list."""
    rows = (
        await db.execute(
            select(DeckCredit)
            .where(DeckCredit.user_id == current_user.id)
            .order_by(DeckCredit.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [
        CreditRow(
            id=c.id,
            deck_type=c.deck_type,
            deck_label=DECK_TYPES[c.deck_type].label if c.deck_type in DECK_TYPES else c.deck_type,
            amount_inr=c.amount_inr,
            status=c.status,
            created_at=c.created_at.isoformat(),
            project_id=c.project_id,
        )
        for c in rows
    ]


# ── Razorpay checkout (one-time order per deck type) ────────────────────────

class CreditOrderRequest(BaseModel):
    deck_type: str


class CreditOrder(BaseModel):
    order_id: str
    key_id: str
    amount: int  # paise
    currency: str = "INR"
    deck_type: str
    price_inr: int


@router.post("/credits/order", response_model=CreditOrder)
async def create_credit_order(
    body: CreditOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open a Razorpay order for one deck-type credit."""
    _require_razorpay()
    price = price_for(body.deck_type)
    if price is None:
        raise HTTPException(status_code=400, detail="That deck type isn't sold individually.")

    amount_paise = price * 100
    created = await _razorpay(
        "POST",
        "/orders",
        {
            "amount": amount_paise,
            "currency": "INR",
            "notes": {"user_id": current_user.id, "deck_type": body.deck_type},
        },
    )
    credit = DeckCredit(
        user_id=current_user.id,
        deck_type=body.deck_type,
        amount_inr=price,
        razorpay_order_id=created["id"],
        status="created",
    )
    db.add(credit)
    await db.commit()
    return CreditOrder(
        order_id=created["id"],
        key_id=settings.razorpay_key_id,
        amount=amount_paise,
        deck_type=body.deck_type,
        price_inr=price,
    )


class VerifyCreditPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifiedCredit(BaseModel):
    deck_type: str
    status: str


@router.post("/credits/verify", response_model=VerifiedCredit)
async def verify_credit_payment(
    body: VerifyCreditPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm the browser checkout result. The signature proves Razorpay —
    not just the browser — produced this payment_id for this order_id."""
    _require_razorpay()
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment could not be verified.")

    credit = (
        await db.execute(
            select(DeckCredit)
            .where(DeckCredit.razorpay_order_id == body.razorpay_order_id)
            .where(DeckCredit.user_id == current_user.id)
        )
    ).scalar_one_or_none()
    if credit is None:
        raise HTTPException(status_code=400, detail="This payment does not belong to your account.")

    credit.status = "paid"
    credit.razorpay_payment_id = body.razorpay_payment_id
    await db.commit()
    return VerifiedCredit(deck_type=credit.deck_type, status="paid")
