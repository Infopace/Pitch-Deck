"""Which parameters each deck type actually needs — the spec's R/C/O/A/N map.

The document asks for "the R / C / O / A / N mapping for every parameter across
all 9 deck types" but never defines the letters. Read here as:

    R  Required      the deck is materially weaker without it
    C  Conditional   required only when a condition holds (stage, model, …)
    O  Optional      used if present, never asked for up front
    A  Auto-derived  computed from other parameters, never asked
    N  Not applicable this deck never uses it

Declared at GROUP level with per-parameter overrides. At 14 deck types × 49
groups that is a table a person can actually read and maintain; 14 × 924 would
not be, and would drift within a week.

This module is also where the spec's conditional rules live, rather than being
scattered through the prompt:

  * pre-revenue (docx lines 172, 540, 1695, 1880) — revenue parameters drop to
    Conditional and validation signals (pilots, LOIs, POCs, usage) rise to
    Required, so a pre-revenue founder is never asked to invent an ARR.
  * GTM by stage (docx lines 4853-4875) — early decks want ICP, positioning and
    acquisition hypotheses; growth decks want CAC, LTV, payback and cohorts.
"""
from dataclasses import dataclass, field
from typing import Literal, Optional

from app.profile.parameters import PARAMETER_GROUPS, PARAMETERS

Relevance = Literal["R", "C", "O", "A", "N"]

DEFAULT_RELEVANCE: Relevance = "N"


@dataclass(frozen=True)
class DeckRelevance:
    """One deck type's view of the catalogue. Anything unlisted is N."""
    required: tuple[str, ...] = ()
    conditional: tuple[str, ...] = ()
    optional: tuple[str, ...] = ()
    #: Groups this deck consumes but only for evidence/appendix purposes.
    evidence: tuple[str, ...] = field(default_factory=tuple)

    def of(self, group: str) -> Relevance:
        if group in self.required:
            return "R"
        if group in self.conditional:
            return "C"
        if group in self.optional or group in self.evidence:
            return "O"
        return DEFAULT_RELEVANCE


# ── Reusable group bundles ────────────────────────────────────────────────────

_IDENTITY = ("company_identity", "contact_and_closing")
_STORY = ("problem", "solution", "customer_icp")
_NARRATIVE = _IDENTITY + _STORY + ("product", "market_opportunity")
_COMMERCIAL = ("business_model", "traction_and_validation", "unit_economics")
_GTM_CORE = ("go_to_market", "positioning", "messaging", "acquisition_strategy",
             "marketing_channels", "sales_funnel", "distribution_strategy",
             "customer_segmentation", "customer_retention_and_expansion")
_EVIDENCE = ("evidence_and_diligence", "evidence_metadata", "customer_research",
             "market_research")
_DILIGENCE = ("financials", "financial_statements", "financial_forecast",
              "fundraising", "cap_table_and_ownership", "legal_and_corporate",
              "risks_and_mitigation", "cohort_and_retention_data",
              "customer_breakdown")


RELEVANCE: dict[str, DeckRelevance] = {
    # ── Fundraising ──────────────────────────────────────────────────────────
    "investor": DeckRelevance(
        required=_NARRATIVE + ("founder_and_team", "traction_and_validation",
                               "business_model", "competition", "fundraising"),
        conditional=("unit_economics", "financials", "moat_defensibility",
                     "roadmap_and_milestones", "cap_table_and_ownership",
                     "risks_and_mitigation"),
        optional=("go_to_market", "technology_and_ip", "partnerships_and_ecosystem",
                  "company_story_origin", "strategy_and_objectives"),
        evidence=_EVIDENCE,
    ),
    "update": DeckRelevance(
        required=("company_identity", "traction_and_validation", "contact_and_closing"),
        conditional=("unit_economics", "financials", "roadmap_and_milestones"),
        optional=("founder_and_team", "market_opportunity", "risks_and_mitigation"),
    ),
    "demoday": DeckRelevance(
        required=_NARRATIVE + ("founder_and_team", "traction_and_validation",
                               "business_model", "competition", "fundraising"),
        conditional=("moat_defensibility", "unit_economics"),
        optional=("roadmap_and_milestones", "company_story_origin"),
    ),
    "elevator": DeckRelevance(
        required=("company_identity", "problem", "solution", "customer_icp",
                  "product", "contact_and_closing"),
        conditional=("traction_and_validation", "market_opportunity"),
        optional=("competition", "founder_and_team", "business_model"),
    ),

    # ── Sales & GTM ──────────────────────────────────────────────────────────
    "sales": DeckRelevance(
        required=("company_identity", "problem", "solution", "product",
                  "customer_icp", "business_model", "contact_and_closing"),
        conditional=("competition", "evidence_and_diligence", "unit_economics"),
        optional=("roadmap_and_milestones", "security_and_compliance",
                  "technology_and_ip", "customer_research"),
    ),
    "gtm": DeckRelevance(
        required=("company_identity", "customer_icp", "market_opportunity") + _GTM_CORE,
        conditional=("unit_economics", "sales", "sales_process",
                     "geographic_expansion", "gtm_operations", "traction_and_validation"),
        optional=("business_model", "partnerships_and_ecosystem",
                  "competition", "roadmap_and_milestones"),
    ),
    "product": DeckRelevance(
        required=("company_identity", "problem", "solution", "product",
                  "customer_icp", "contact_and_closing"),
        conditional=("technology_and_ip", "product_architecture",
                     "ai_ml_conditional", "security_and_compliance"),
        optional=("competition", "roadmap_and_milestones", "business_model",
                  "traction_and_validation", "customer_research"),
    ),
    "partnership": DeckRelevance(
        required=("company_identity", "solution", "product",
                  "partnerships_and_ecosystem", "contact_and_closing"),
        conditional=("distribution_strategy", "go_to_market", "business_model",
                     "traction_and_validation"),
        optional=("market_opportunity", "customer_icp", "technology_and_ip",
                  "moat_defensibility"),
    ),

    # ── Company ──────────────────────────────────────────────────────────────
    "general": DeckRelevance(
        required=_NARRATIVE + ("business_model", "competition", "founder_and_team"),
        conditional=("traction_and_validation", "roadmap_and_milestones", "fundraising"),
        optional=("company_story_origin", "go_to_market", "moat_defensibility"),
    ),
    "business": DeckRelevance(
        required=_NARRATIVE + _COMMERCIAL + ("sales", "go_to_market",
                                             "operations", "founder_and_team",
                                             "fundraising"),
        conditional=("sales_funnel", "sales_process", "financials",
                     "partnerships_and_ecosystem", "strategy_and_objectives",
                     "roadmap_and_milestones", "risks_and_mitigation"),
        optional=("competition", "moat_defensibility", "geographic_expansion",
                  "distribution_strategy", "marketing_channels"),
    ),
    "vision": DeckRelevance(
        required=("company_identity", "problem", "solution",
                  "strategy_and_objectives", "contact_and_closing"),
        conditional=("company_story_origin", "roadmap_and_milestones",
                     "market_opportunity"),
        optional=("founder_and_team", "traction_and_validation", "moat_defensibility"),
    ),
    "master": DeckRelevance(
        # The superset — everything the catalogue holds is in play.
        required=_NARRATIVE + _COMMERCIAL + ("founder_and_team", "competition"),
        conditional=tuple(
            k for k in PARAMETER_GROUPS
            if k not in set(_NARRATIVE + _COMMERCIAL + ("founder_and_team", "competition"))
        ),
    ),

    # ── Internal ─────────────────────────────────────────────────────────────
    "internal": DeckRelevance(
        required=("company_identity", "problem", "strategy_and_objectives",
                  "risks_and_mitigation"),
        conditional=("financials", "operations", "roadmap_and_milestones"),
        optional=("traction_and_validation", "competition", "unit_economics"),
    ),

    # ── Reference ────────────────────────────────────────────────────────────
    "appendix": DeckRelevance(
        # Nothing is required: the Appendix renders whatever evidence exists.
        conditional=tuple(PARAMETER_GROUPS),
        evidence=_EVIDENCE + _DILIGENCE,
    ),
}


# ── Stage conditionals (the spec's pre-revenue rule) ──────────────────────────

#: Groups whose value depends on the company having revenue.
REVENUE_GROUPS = ("unit_economics", "financials", "financial_statements",
                  "financial_forecast", "cohort_and_retention_data")

#: What replaces them before there is revenue.
VALIDATION_GROUPS = ("evidence_and_diligence", "customer_research",
                     "traction_and_validation")

PRE_REVENUE_STAGES = {"idea", "pre_revenue", "pre_seed"}

#: Individual revenue parameters that must never be *required* pre-revenue —
#: asking is what produces invented numbers.
REVENUE_PARAMS = ("revenue", "arr", "mrr", "revenue_growth", "gross_margin",
                  "ebitda", "net_income", "cac_payback", "ltv_cac",
                  "net_revenue_retention", "churn")


def relevance_for(
    deck_type: Optional[str],
    group: str,
    *,
    stage: Optional[str] = None,
) -> Relevance:
    """Relevance of one parameter GROUP for one deck type, after stage rules."""
    dr = RELEVANCE.get(deck_type or "", None)
    if dr is None:
        return DEFAULT_RELEVANCE
    base = dr.of(group)

    if stage in PRE_REVENUE_STAGES:
        # Never demand revenue data from a company that has none…
        if group in REVENUE_GROUPS and base == "R":
            return "C"
        # …and lean harder on the evidence that stands in for it.
        if group in VALIDATION_GROUPS and base in ("C", "O"):
            return "R"
    return base


#: The parameters that genuinely block a deck when their group is Required.
#:
#: A group's relevance describes the GROUP — whether this deck draws on it at
#: all. It must not cascade to every parameter inside: "Company Identity is
#: Required" does not mean a founder has to supply all eighteen of its fields
#: before they can generate anything. Letting it cascade made `readiness` demand
#: 289 fields for an investor deck, which is not a product anyone would use.
#:
#: So Required is an explicit, deliberately short list — the facts a deck is
#: genuinely unusable without. Everything else in a Required group is
#: Conditional: surfaced in the form, used whenever present, never blocking.
CORE_REQUIRED: frozenset[str] = frozenset({
    # identity & story
    "company_name", "one_line_description",
    "problem_statement", "customer_pain",
    "solution_statement", "core_value_proposition",
    "ideal_customer_profile",
    "product_name", "product_description",
    # commercial
    "market_category", "tam",
    "business_model", "revenue_model",
    # people
    "founder_names",
    # fundraising decks only — gated by their group's relevance
    "funding_stage", "amount_raising", "use_of_funds",
    # gtm decks only
    "gtm_strategy", "acquisition_channels", "positioning_statement",
    # closing
    "contact_person", "email",
})


def param_relevance(
    deck_type: Optional[str],
    param_name: str,
    *,
    stage: Optional[str] = None,
) -> Relevance:
    """Relevance of a single parameter.

    Derived from its group's relevance, then narrowed: only parameters in
    CORE_REQUIRED can actually be Required, and the pre-revenue rule can still
    demote a revenue figure below that.
    """
    p = PARAMETERS.get(param_name)
    if p is None:
        return DEFAULT_RELEVANCE
    if p.derived_from:
        return "A"                       # computed, never asked for
    base = relevance_for(deck_type, p.group, stage=stage)
    if base == "R" and param_name not in CORE_REQUIRED:
        return "C"
    if stage in PRE_REVENUE_STAGES and param_name in REVENUE_PARAMS and base == "R":
        return "C"
    return base


def groups_for_deck(
    deck_type: Optional[str],
    *,
    stage: Optional[str] = None,
    include: tuple[Relevance, ...] = ("R", "C", "O"),
) -> tuple[str, ...]:
    """Group keys this deck consumes, in catalogue order."""
    return tuple(
        key for key in PARAMETER_GROUPS
        if relevance_for(deck_type, key, stage=stage) in include
    )


def required_groups(deck_type: Optional[str], *, stage: Optional[str] = None) -> tuple[str, ...]:
    return groups_for_deck(deck_type, stage=stage, include=("R",))
