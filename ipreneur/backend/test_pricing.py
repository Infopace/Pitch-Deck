"""
Regression guard: a deck type hidden from the New Deck picker must stay priced.

HIDDEN_DECK_TYPES (app.decks.registry) only controls what serialize_deck_types()
and list_pricing() show — it must never make price_for() return None, since
app.api.v1.endpoints.projects._needs_payment() treats a None price as "free for
everyone". A type commented out of DECK_PRICES_INR instead of just excluded
from list_pricing() silently waives payment for every user, not just the one
billing-exempt account.
"""
from app.decks.pricing import DECK_PRICES_INR, list_pricing, price_for
from app.decks.registry import HIDDEN_DECK_TYPES


def test_hidden_but_sellable_types_keep_their_price():
    sellable_hidden = HIDDEN_DECK_TYPES - {"appendix"}
    assert sellable_hidden, "expected at least one hidden-but-sellable type to guard"
    for key in sellable_hidden:
        assert price_for(key) is not None, (
            f"{key!r} is hidden from the picker but still sellable — "
            "it must keep a price in DECK_PRICES_INR, or payment is bypassed"
        )


def test_appendix_has_no_price_by_design():
    assert price_for("appendix") is None


def test_list_pricing_excludes_hidden_types_even_though_they_are_priced():
    listed_keys = {row["key"] for row in list_pricing()}
    assert listed_keys == set(DECK_PRICES_INR) - HIDDEN_DECK_TYPES
    assert listed_keys.isdisjoint(HIDDEN_DECK_TYPES)
