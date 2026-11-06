"""One-time, per-deck-type pricing — replaces the old monthly Pro plan.

Prices are in whole rupees; Razorpay orders are created in paise
(`amount_inr * 100`). "appendix" is a supplementary, dynamically-generated
section list rather than a standalone deck a visitor sets out to buy, so it
has no price of its own and isn't sold individually.
"""
from app.decks.registry import DECK_TYPES, HIDDEN_DECK_TYPES

# Every sellable deck type keeps its real price here, even one currently
# pulled from the New Deck picker (registry.HIDDEN_DECK_TYPES) — price_for()
# backs the payment gate in app.api.v1.endpoints.projects, so a type priced
# at None reads as "free for everyone", not "temporarily hidden from the UI".
# list_pricing() below is the only place that should drop a hidden type.
DECK_PRICES_INR: dict[str, int] = {
    "investor": 699,
    "gtm": 699,
    "business": 699,
    "partnership": 699,
    "master": 699,
    "general": 599,
    "vision": 599,
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
    """Deck type, label and price for every sellable, currently-offered deck
    type, cheapest last within each tier — this is what the billing page's
    pricing table renders from. Types in HIDDEN_DECK_TYPES are left priced
    (see DECK_PRICES_INR) but excluded from this listing, the same way
    registry.serialize_deck_types() excludes them from the New Deck picker."""
    rows = [
        {"key": key, "label": DECK_TYPES[key].label, "price_inr": price}
        for key, price in DECK_PRICES_INR.items()
        if key in DECK_TYPES and key not in HIDDEN_DECK_TYPES
    ]
    rows.sort(key=lambda r: (-r["price_inr"], r["label"]))
    return rows
