"""The Appendix deck: a slide sequence resolved from the company's own data."""
import pytest

from app.decks import DECK_TYPES, SECTION_SPECS
from app.decks.registry import (
    MAX_APPENDIX_SLIDES, profile_group_fill, resolve_appendix_sections,
    resolve_sections, serialize_deck_types,
)
from app.decks.sections import EVIDENCE_SECTIONS
from app.decks.prompt import build_generation_sections
from app.profile.values import ProfileValues


def test_appendix_is_registered_and_dynamic():
    assert DECK_TYPES["appendix"].dynamic_sections is True


def test_no_profile_gives_the_default_evidence_set():
    seq = resolve_sections("appendix")
    assert seq[0] == "cover" and seq[-1] == "closing"
    assert "evSources" in seq and len(seq) > 4


def test_only_groups_with_data_produce_slides():
    seq = resolve_appendix_sections({"market_opportunity": 3, "financial_forecast": 1,
                                     "evidence_metadata": 2})
    assert seq == ("cover", "evMarket", "evForecast", "evSources", "closing")


def test_order_follows_the_spec_not_fill_order():
    seq = resolve_appendix_sections({"roadmap_and_milestones": 9, "market_opportunity": 1})
    assert seq.index("evMarket") < seq.index("evRoadmap")


def test_sources_alone_does_not_make_an_appendix():
    seq = resolve_appendix_sections({"evidence_metadata": 5})
    assert "evMarket" in seq           # fell back to the default set


def test_an_empty_profile_falls_back_rather_than_producing_an_empty_deck():
    assert resolve_appendix_sections({}) == resolve_appendix_sections(None)


def test_everything_filled_is_capped():
    every = {g: 1 for _b, _l, _p, groups in EVIDENCE_SECTIONS.values() for g in groups}
    assert len(resolve_appendix_sections(every)) <= MAX_APPENDIX_SLIDES


def test_group_fill_counts_by_group():
    pv = ProfileValues.load({"tam": "5B", "sam": "1B", "company_name": "Acme"})
    fill = profile_group_fill(pv)
    assert fill["market_opportunity"] == 2 and fill["company_identity"] == 1


@pytest.mark.parametrize("key", sorted(EVIDENCE_SECTIONS))
def test_evidence_sections_are_overridden_by_evidence_rules(key):
    spec = SECTION_SPECS[key]
    assert "APPENDIX OVERRIDE" in spec.rules
    assert spec.model is not None and spec.label.startswith("A")


def test_every_evidence_group_exists_in_the_catalogue():
    from app.profile.parameters import PARAMETER_GROUPS
    for key, (_b, _l, _p, groups) in EVIDENCE_SECTIONS.items():
        for g in groups:
            assert g in PARAMETER_GROUPS, f"{key} names unknown group {g}"


def test_prompt_builds_for_a_resolved_appendix():
    seq = resolve_appendix_sections({"market_opportunity": 2, "financials": 1})
    blocks = build_generation_sections("appendix", seq)
    assert "A1" in blocks["slide_plan"] and blocks["slide_count"] == str(len(seq))
    assert '"evMarket"' in blocks["template_skeleton"]


def test_serialized_slide_count_reflects_the_default_appendix():
    row = next(r for r in serialize_deck_types() if r["key"] == "appendix")
    assert row["slide_count"] == len(resolve_appendix_sections(None))
    assert row["dynamic_sections"] is True
