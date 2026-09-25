"""Phase 1 — the master parameter model.

Covers the catalogue's integrity, the R/C/O/A/N relevance map (including the
spec's pre-revenue rule), derived values, provenance handling and completeness.
"""
from app.profile.parameters import PARAMETER_GROUPS, PARAMETERS, params_in
from app.profile.prompt import profile_gaps_note, render_profile_for_deck
from app.profile.relevance import (
    RELEVANCE, groups_for_deck, param_relevance, relevance_for, required_groups,
)
from app.profile.values import ProfileValues, completeness, derive, missing_required


# ── Catalogue integrity ───────────────────────────────────────────────────────

def test_parameter_names_are_unique_and_resolve_to_their_group():
    for name, p in PARAMETERS.items():
        assert p.name == name
        assert p.group in PARAMETER_GROUPS, f"{name} -> unknown group {p.group}"
        assert p in PARAMETER_GROUPS[p.group].params


def test_every_group_has_parameters_and_an_ordered_key():
    orders = [g.order for g in PARAMETER_GROUPS.values()]
    assert orders == sorted(orders)
    for key, g in PARAMETER_GROUPS.items():
        assert g.key == key and g.params, key


def test_no_select_parameter_ships_an_empty_dropdown():
    for p in PARAMETERS.values():
        if p.type in ("select", "multiselect"):
            assert p.options, f"{p.name} is a {p.type} with no options"


def test_derived_parameters_reference_real_parameters():
    for p in PARAMETERS.values():
        for src in p.derived_from:
            assert src in PARAMETERS, f"{p.name} derives from unknown {src}"


def test_params_in_returns_declaration_order():
    assert params_in("unit_economics") == PARAMETER_GROUPS["unit_economics"].params


# ── Relevance ─────────────────────────────────────────────────────────────────

def test_every_deck_type_resolves_every_group():
    for deck in RELEVANCE:
        for key in PARAMETER_GROUPS:
            assert relevance_for(deck, key) in ("R", "C", "O", "A", "N")


def test_relevance_tables_only_name_real_groups():
    for deck, dr in RELEVANCE.items():
        for key in dr.required + dr.conditional + dr.optional + dr.evidence:
            assert key in PARAMETER_GROUPS, f"{deck} names unknown group {key}"


def test_unknown_deck_type_is_not_applicable():
    assert relevance_for("nope", "problem") == "N"


def test_each_deck_requires_something():
    for deck in RELEVANCE:
        if deck == "appendix":
            continue          # the Appendix renders whatever evidence exists
        assert required_groups(deck), f"{deck} requires nothing"


def test_sales_deck_does_not_reach_for_the_cap_table():
    assert relevance_for("sales", "cap_table_and_ownership") == "N"
    assert relevance_for("investor", "cap_table_and_ownership") != "N"


def test_appendix_consumes_the_whole_catalogue():
    assert len(groups_for_deck("appendix")) == len(PARAMETER_GROUPS)


# ── The spec's pre-revenue rule (docx lines 172, 540, 1695, 1880) ─────────────

def test_pre_revenue_never_requires_a_revenue_figure():
    for stage in ("idea", "pre_revenue", "pre_seed"):
        assert param_relevance("investor", "arr", stage=stage) != "R"


def test_pre_revenue_promotes_validation_evidence():
    assert relevance_for("investor", "evidence_and_diligence", stage="pre_revenue") == "R"
    assert relevance_for("investor", "evidence_and_diligence", stage="series_a") == "O"


def test_derived_parameters_are_never_asked_for():
    assert param_relevance("investor", "ltv_cac") == "A"


# ── Values, provenance and derivation ────────────────────────────────────────

def test_bare_scalars_are_accepted_as_founder_provided():
    v = ProfileValues.load({"cac": 900})
    assert v["cac"].value == 900 and v["cac"].source == "founder"


def test_provenance_round_trips():
    v = ProfileValues.load({"tam": {"value": "5B", "source": "research",
                                    "source_url": "RedSeer", "method": "bottom-up"}})
    assert v.dump()["tam"] == {"value": "5B", "source": "research",
                               "source_url": "RedSeer", "method": "bottom-up",
                               "confidence": 0.6}


def test_unknown_parameters_are_dropped_on_load():
    assert "not_a_real_param" not in ProfileValues.load({"not_a_real_param": 1})


def test_empty_values_are_not_stored():
    assert ProfileValues.load({"cac": "", "ltv": None, "tam": []}) == {}


def test_derivation_computes_ltv_cac_arr_and_runway():
    v = derive(ProfileValues.load(
        {"cac": 900, "ltv": 5400, "mrr": 100000,
         "cash_balance": 1_800_000, "monthly_burn": 150_000}))
    assert v.scalar("ltv_cac") == 6.0
    assert v.scalar("arr") == 1_200_000
    assert v.scalar("runway") == 12
    assert v["ltv_cac"].source == "derived" and v["ltv_cac"].method


def test_derivation_is_idempotent_and_never_overwrites():
    v = ProfileValues.load({"cac": 900, "ltv": 5400, "ltv_cac": 99})
    assert derive(v).scalar("ltv_cac") == 99


def test_derivation_survives_currency_formatted_strings():
    v = derive(ProfileValues.load({"cac": "$900", "ltv": "5,400"}))
    assert v.scalar("ltv_cac") == 6.0


def test_a_crawl_never_overwrites_a_founder_answer():
    v = ProfileValues.load({"company_name": {"value": "Acme", "source": "founder"}})
    v.merge({"company_name": "Acme Inc"}, source="crawl")
    assert v.scalar("company_name") == "Acme"


def test_a_founder_answer_overwrites_a_crawl():
    v = ProfileValues.load({"company_name": {"value": "Acme", "source": "crawl"}})
    v.merge({"company_name": "Acme Inc"}, source="founder")
    assert v.scalar("company_name") == "Acme Inc"
    assert v["company_name"].source == "founder"


def test_merging_an_empty_value_clears_it():
    v = ProfileValues.load({"cac": 900})
    v.merge({"cac": ""}, source="founder")
    assert "cac" not in v


# ── Completeness ──────────────────────────────────────────────────────────────

def test_completeness_skips_groups_the_deck_never_uses():
    keys = {g.key for g in completeness(ProfileValues(), "sales")}
    assert "cap_table_and_ownership" not in keys


def test_completeness_counts_filled_against_total():
    v = ProfileValues.load({"company_name": "Acme"})
    ident = next(g for g in completeness(v, "investor") if g.key == "company_identity")
    assert ident.filled == 1 and ident.total > 1
    assert "company_name" not in ident.missing_required


def test_derived_parameters_are_not_counted_as_gaps():
    assert "ltv_cac" not in missing_required(ProfileValues(), "investor")


# ── Prompt rendering ──────────────────────────────────────────────────────────

def test_prompt_tags_non_founder_provenance_but_not_founder():
    v = ProfileValues.load({
        "company_name": "Acme",
        "tam": {"value": 5_000_000_000, "source": "research", "source_url": "RedSeer"},
    })
    out = render_profile_for_deck(v, "investor")
    assert "third-party research" in out and "RedSeer" in out
    assert "Company Name: Acme" in out
    assert "Acme  [" not in out           # founder values carry no provenance tag


def test_prompt_omits_groups_this_deck_does_not_consume():
    v = ProfileValues.load({"company_name": "Acme", "founder_ownership": "60"})
    assert "Founder Ownership" not in render_profile_for_deck(v, "sales")
    assert "Founder Ownership" in render_profile_for_deck(v, "investor")


def test_prompt_is_empty_without_values():
    assert render_profile_for_deck(ProfileValues(), "investor") == ""


def test_prompt_respects_its_length_cap():
    v = ProfileValues.load({p.name: "x" * 40 for p in list(PARAMETERS.values())[:400]})
    out = render_profile_for_deck(v, "master", max_chars=2000)
    assert len(out) < 4000 and "omitted for length" in out


def test_gaps_note_names_missing_parameters():
    note = profile_gaps_note(["arr", "cac"])
    assert "Do NOT invent" in note and "ARR" in note


def test_gaps_note_is_empty_when_nothing_is_missing():
    assert profile_gaps_note([]) == ""


# ── CORE_REQUIRED (the gate the profile form and readiness use) ───────────────

def test_core_required_only_names_real_parameters():
    """A typo here silently makes a field un-requestable — `primary_channel`
    was in this set and did not exist."""
    from app.profile.relevance import CORE_REQUIRED
    unknown = sorted(n for n in CORE_REQUIRED if n not in PARAMETERS)
    assert not unknown, f"CORE_REQUIRED names parameters that do not exist: {unknown}"


def test_a_required_group_does_not_make_every_field_required():
    """Group relevance describes the group, not each parameter inside it.
    Letting it cascade demanded 289 fields for an investor deck."""
    from app.profile.relevance import relevance_for
    assert relevance_for("investor", "company_identity") == "R"
    group = PARAMETER_GROUPS["company_identity"]
    required = [p.name for p in group.params
                if param_relevance("investor", p.name) == "R"]
    assert 0 < len(required) < len(group.params) / 2


def test_required_field_count_stays_answerable():
    """A gate nobody can pass is not a gate. Guards against the 289 regression."""
    for deck in ("investor", "elevator", "sales", "gtm", "master"):
        n = len(missing_required(ProfileValues(), deck))
        assert 0 < n <= 30, f"{deck} requires {n} fields"


def test_appendix_requires_nothing():
    assert missing_required(ProfileValues(), "appendix") == []
