from app.agents.audit.claims_auditor import audit_deck, parse_money


def _msgs(res, sev=None):
    return [f["message"] for f in res["findings"] if sev is None or f["severity"] == sev]


def test_parse_money():
    assert parse_money("$48B") == 48e9
    assert parse_money("2.4M") == 2.4e6
    assert parse_money("$1,500") == 1500
    assert parse_money("n/a") is None


def test_clean_deck_scores_100():
    td = {"market": {"tam": {"v": "$48B"}, "sam": {"v": "$9B"}, "som": {"v": "$600M"}},
          "ask": {"use": [{"l": "a", "p": 60}, {"l": "b", "p": 40}]}}
    assert audit_deck(td, ["cover", "market", "ask"])["score"] == 100


def test_use_of_funds_must_total_100():
    r = audit_deck({"ask": {"use": [{"p": 50}, {"p": 30}]}}, ["ask"])
    assert any("80%" in m for m in _msgs(r, "error"))


def test_inverted_market_funnel_is_an_error():
    r = audit_deck({"market": {"tam": {"v": "$1B"}, "sam": {"v": "$5B"}, "som": {"v": "$1M"}}}, ["market"])
    assert any("SAM is larger than TAM" in m for m in _msgs(r, "error"))


def test_arr_must_match_the_founders_figure():
    td = {"traction": {"kpis": [{"k": "$5M", "l": "ARR"}]}}
    r = audit_deck(td, ["traction"], user_inputs={"arr_usd": 2_400_000})
    assert any("founder" in m for m in _msgs(r, "error"))


def test_mrr_times_twelve_counts_as_the_founders_arr():
    td = {"traction": {"kpis": [{"k": "$2.4M", "l": "ARR"}]}}
    assert not _msgs(audit_deck(td, ["traction"], user_inputs={"mrr_usd": 200_000}), "error")


def test_invented_revenue_is_flagged_when_none_was_given():
    td = {"traction": {"kpis": [{"k": "$1.2M", "l": "ARR"}]}}
    r = audit_deck(td, ["traction"], user_inputs={})
    assert any("invented" in m for m in _msgs(r, "error"))


def test_unevidenced_certification_is_flagged_but_hedged_is_not():
    bad = audit_deck({"security": {"steps": [{"d": "SOC 2 Type II certified"}]}}, ["security"])
    ok = audit_deck({"security": {"steps": [{"d": "SOC 2 audit in progress"}]}}, ["security"])
    assert any("SOC2" in m for m in _msgs(bad, "warning"))
    assert not any("SOC2" in m for m in _msgs(ok))


def test_certification_in_founder_data_is_trusted():
    r = audit_deck({"security": {"steps": [{"d": "ISO 27001 certified"}]}}, ["security"],
                   user_inputs={"compliance_notes": "We hold ISO 27001"})
    assert not _msgs(r)


def test_placeholder_text_and_empty_slides():
    r = audit_deck({"competition": {"cols": ["Us", "Competitor 1", "Rival"], "rows": []}},
                   ["competition", "roadmap"])
    assert any("Placeholder" in m for m in _msgs(r))
    assert any("no content" in m for m in _msgs(r))


def test_pre_revenue_traction_slide_warns():
    r = audit_deck({"traction": {"kpis": []}}, ["traction"], stage="idea")
    assert any("idea" in m for m in _msgs(r, "warning"))


def test_score_floors_at_zero():
    td = {"ask": {"use": [{"p": 10}]}, "capTable": {"use": [{"p": 10}]},
          "market": {"tam": {"v": "1"}, "sam": {"v": "5"}, "som": {"v": "9"}}}
    assert audit_deck(td, ["ask", "capTable", "market"])["score"] >= 0


def test_no_competition_claim_is_flagged():
    r = audit_deck({"competition": {"headline": "We have no competition", "cols": ["a", "b", "c"]}},
                   ["competition"])
    assert any("no competition" in m for m in _msgs(r, "warning"))


def test_growth_without_a_period_is_noted():
    td = {"traction": {"kpis": [{"k": "300%", "l": "Growth"}]}}
    assert any("baseline" in m for m in _msgs(audit_deck(td, ["traction"]), "info"))
    ok = {"traction": {"kpis": [{"k": "300%", "l": "YoY growth"}]}}
    assert not any("baseline" in m for m in _msgs(audit_deck(ok, ["traction"])))


def test_weak_unit_economics_are_noted_not_blocked():
    td = {"unitEconomics": {"kpis": [{"k": "1.8x", "l": "LTV:CAC"}, {"k": "24 mo", "l": "CAC payback"}]}}
    r = audit_deck(td, ["unitEconomics"])
    assert len(_msgs(r, "info")) == 2 and not _msgs(r, "error")
