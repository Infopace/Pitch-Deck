"""
Currency localization of the generation-prompt skeleton.

The skeleton's example numbers were all written in $ as a JSON *shape*
example. A model shown "$2.4M" right next to an instruction to write ARR in
Rupees reliably copies the example's currency over the instruction, which is
exactly what users were seeing on INR-currency decks. build_template_skeleton
must rewrite those examples to Rupees when the project's currency is INR.

Run: pytest test_deck_prompt_currency.py
"""
from app.decks.prompt import _localize_skeleton_money, build_template_skeleton
from app.decks.registry import resolve_sections


def test_usd_skeleton_is_unchanged():
    text = _localize_skeleton_money('{"k": "$2.4M", "l": "ARR"}', "USD")
    assert text == '{"k": "$2.4M", "l": "ARR"}'


def test_inr_skeleton_has_no_dollar_signs():
    text = _localize_skeleton_money('{"k": "$2.4M", "l": "ARR"}, "sub": "Revenue ($M)"', "INR")
    assert "$" not in text
    assert "₹" in text


def test_inr_skeleton_converts_the_ask_headline_placeholder():
    text = _localize_skeleton_money('"headline": "Raising $XM Series A"', "INR")
    assert text == '"headline": "Raising ₹XX Cr Series A"'


def test_inr_skeleton_rewrites_chart_axis_units():
    assert _localize_skeleton_money("Revenue ($M)", "INR") == "Revenue (₹ Cr)"
    assert _localize_skeleton_money("value delivered ($K)", "INR") == "value delivered (₹ L)"


def test_full_investor_skeleton_has_no_dollar_signs_for_inr():
    sections = resolve_sections("investor")
    inr_skeleton = build_template_skeleton(sections, "INR")
    assert "$" not in inr_skeleton


def test_full_investor_skeleton_keeps_dollars_for_usd():
    sections = resolve_sections("investor")
    usd_skeleton = build_template_skeleton(sections, "USD")
    assert "$" in usd_skeleton
