"""One-time, per-deck-type pricing — replaces the old monthly Pro plan.

Prices are in whole rupees; Razorpay orders are created in paise
(`amount_inr * 100`). "appendix" is a supplementary, dynamically-generated
section list rather than a standalone deck a visitor sets out to buy, so it
has no price of its own and isn't sold individually.
"""
from app.decks.registry import DECK_TYPES

DECK_PRICES_INR: dict[str, int] = {
    "investor": 699,
    "gtm": 699,
    "business": 699,
    # "partnership": 699,  # hidden — see registry.HIDDEN_DECK_TYPES
    # "master": 699,       # hidden — see registry.HIDDEN_DECK_TYPES
    "general": 599,
    # "vision": 599,       # hidden — see registry.HIDDEN_DECK_TYPES
    "sales": 499,
    "product": 499,
    "demoday": 499,
    "update": 399,
    "internal": 399,
    "elevator": 399,
}


def price_for(deck_type: str) -> int | None:
    """Rupee price for a deck type, or None if it isn't sold individually."""
    return DECK_PRICES_INR.get(deck_type)


def list_pricing() -> list[dict]:
    """Deck type, label and price for every sellable deck type, cheapest last
    within each tier — this is what the landing page and billing page pricing
    tables render from, so they can never drift from what checkout charges."""
    rows = [
        {"key": key, "label": DECK_TYPES[key].label, "price_inr": price}
        for key, price in DECK_PRICES_INR.items()
        if key in DECK_TYPES
    ]
    rows.sort(key=lambda r: (-r["price_inr"], r["label"]))
    return rows
