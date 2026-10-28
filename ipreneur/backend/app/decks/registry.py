"""
The deck-type registry — the single source of truth for what a deck IS.

Before this existed, "13 investor slides" was written down five separate times:
the generation prompt, the pydantic validators, the positional slide→section
map, the TypeScript types, and the React renderer array. They had to be edited
in lockstep and had already drifted apart (the PPTX `slides[]` sequence and the
on-screen `template_data` sequence were different orders).

Now a deck type declares its slide sequence once, here, and the prompt builder,
the validator, the PPTX renderer and the frontend all derive from it.

`sections` is the deck. Everything else — the prompt's slide plan, the
`template_data` skeleton, the legacy `slides[]` array, the positional map the
PPTX renderer uses, and the frontend's render order — is computed from it.
"""
from dataclasses import dataclass, field
from typing import Literal, Mapping, Optional, Sequence

from app.decks.sections import DEFAULT_EVIDENCE_SECTIONS, EVIDENCE_SECTIONS, SECTION_SPECS

ResearchProfile = Literal["full", "light", "none"]

DEFAULT_DECK_TYPE = "investor"
DEFAULT_DECK_FORMAT = "presenter"


@dataclass(frozen=True)
class BriefField:
    """One type-specific intake field.

    Serialised to the frontend by `GET /api/v1/deck-types`, which is what
    NewProjectPage renders its per-type fields from — so the form can never
    drift from what the prompt actually consumes.
    """
    name: str
    label: str
    type: Literal["text", "textarea", "number"] = "text"
    placeholder: str = ""
    help: str = ""
    required: bool = False


@dataclass(frozen=True)
class DeckType:
    key: str
    label: str
    description: str
    audience: str          # who is in the room — injected into the prompt
    goal: str              # what the deck must achieve
    eyebrow: str           # cover eyebrow, e.g. "Sales Presentation"
    sections: tuple[str, ...]
    research: ResearchProfile
    guidance: str = ""                       # per-type writing rules
    brief_fields: tuple[BriefField, ...] = ()
    # Fields required when the project has no website to crawl. Defaults to the
    # original rule; types whose story doesn't start from a product override it.
    manual_required: tuple[str, ...] = ("company_name", "problem_statement", "solution_description")
    # Only where the slide list genuinely differs by stage. Emphasis-only
    # differences live in STAGE_EMPHASIS instead of being faked as new slides.
    stage_overrides: dict[str, tuple[str, ...]] = field(default_factory=dict)
    # The Appendix has no fixed slide list — the spec is explicit that it
    # "should be dynamically generated from the company's available data".
    # `sections` then holds only the fixed bookends and the rest is resolved
    # from the profile at generation time.
    dynamic_sections: bool = False


# ─── The seven deck types ─────────────────────────────────────────────────────

_INVESTOR_SECTIONS = (
    "cover", "summary", "story", "probsol", "persona", "product", "galleryS", "techIp",
    "market", "segmentation", "model", "traction", "proof", "unitEconomics", "competition",
    "moat", "gtm", "financials", "roadmap", "risks", "team", "ask", "capTable", "closing",
)

# Idea/pre-revenue companies have no traction to chart. Showing an empty or
# invented growth curve is worse than not showing one — swap it for the vision
# slide, which is what actually carries a pre-product raise.
_EARLY_STAGE_SECTIONS = (
    "cover", "summary", "story", "probsol", "persona", "product", "galleryS", "techIp",
    "market", "segmentation", "model", "vision", "proof", "competition", "moat", "gtm",
    "roadmap", "risks", "team", "ask", "capTable", "closing",
)

DECK_TYPES: dict[str, DeckType] = {
    "investor": DeckType(
        key="investor",
        label="Investor / Fundraising",
        description="Raise capital from angels or VCs. Problem, market, traction, team, ask.",
        audience="professional investors evaluating this as one of hundreds of deals this quarter",
        goal="earn a second meeting by proving the market is large, the wedge is real, and this team can execute",
        eyebrow="Investor Presentation",
        sections=_INVESTOR_SECTIONS,
        research="full",
        guidance=(
            "Investors read for pattern and risk. Lead with the strongest verifiable fact.\n"
            "Numbers beat adjectives everywhere. Never soften a weakness into vagueness —\n"
            "an honest gap is survivable, a discovered exaggeration is not."
        ),
        stage_overrides={
            "idea": _EARLY_STAGE_SECTIONS,
            "pre_revenue": _EARLY_STAGE_SECTIONS,
        },
    ),

    "sales": DeckType(
        key="sales",
        label="Sales / Customer",
        description="Win a customer. Their pain, your fix, proof it works, pricing, next step.",
        audience="a prospective buyer deciding whether this is worth their budget and switching cost",
        goal="move this buyer to a pilot or a purchase decision",
        eyebrow="Sales Presentation",
        sections=(
            "cover", "probsol", "persona", "competition", "product", "galleryS", "proof",
            "roi", "unitEconomics", "security", "model", "partnerships", "roadmap",
            "closing",
        ),
        research="light",
        guidance=(
            "Write in the BUYER's language about the BUYER's problem — the company\n"
            "pitching is not the subject of this deck, the customer's outcome is.\n"
            "Every claim needs either a number or a named reference behind it.\n"
            "The competition slide here compares approaches the buyer is choosing between\n"
            "(including their current process and doing nothing), not the vendor landscape.\n"
            "Never invent a customer, logo, quote, or result."
        ),
        brief_fields=(
            BriefField("target_buyer", "Who are you pitching to?", "text",
                       "e.g. VP Ops at 200-2,000 seat logistics firms", required=True,
                       help="The more specific the buyer, the sharper the deck."),
            BriefField("buyer_pain", "What does this buyer struggle with today?", "textarea",
                       "What it costs them in time, money, or risk"),
            BriefField("case_studies", "Customer results you can cite", "textarea",
                       "e.g. Acme cut support cost 42% in 4 months",
                       help="Leave blank if you have none — we won't invent references."),
            BriefField("pricing_notes", "Pricing & packaging", "textarea",
                       "Tiers, typical deal size, what's included"),
        ),
        manual_required=("company_name", "solution_description", "target_buyer"),
    ),

    "product": DeckType(
        key="product",
        label="Product / Demo",
        description="Show the product. User, workflow, screens, differentiators, roadmap.",
        audience="users, product stakeholders, or technical evaluators who want to see the thing work",
        goal="make the product's value obvious in the first two minutes",
        eyebrow="Product Overview",
        sections=(
            "cover", "persona", "probsol", "product", "galleryS", "techIp", "security",
            "proof", "competition", "moat", "model", "traction", "roadmap", "closing",
        ),
        research="light",
        guidance=(
            "This deck is visual and concrete. Describe real screens, real flows, real\n"
            "interactions — not capabilities in the abstract. The differentiators slide\n"
            "must name what is genuinely hard to copy (data, integrations, network\n"
            "effects), not list features every competitor also has."
        ),
        brief_fields=(
            BriefField("persona_notes", "Who is the primary user?", "text",
                       "e.g. Support leads managing 10-40 agents", required=True),
            BriefField("jtbd", "What job are they hiring it to do?", "textarea",
                       "The outcome they want, in their words"),
            BriefField("demo_flow", "Key screens or flows to show", "textarea",
                       "e.g. Inbox → triage → auto-reply → reporting"),
        ),
        manual_required=("company_name", "solution_description", "persona_notes"),
    ),

    "partnership": DeckType(
        key="partnership",
        label="Partnership / Collaboration",
        description="Propose a partnership. Mutual value, model, joint GTM, economics.",
        audience="a prospective partner's BD or leadership team weighing this against other partnerships",
        goal="get to a pilot, MoU, or joint working group",
        eyebrow="Partnership Proposal",
        sections=(
            "cover", "summary", "probsol", "product", "partnerRole", "partnershipModel",
            "segmentation", "gtm", "distribution", "traction", "proof", "techIp",
            "roadmap", "ask", "closing",
        ),
        research="full",
        guidance=(
            "Address the partner as an equal, not a buyer. Every slide answers 'what's in\n"
            "it for them' at least as clearly as 'what's in it for us'. Be specific about\n"
            "what each side actually contributes and owns — vague mutual enthusiasm is the\n"
            "default failure mode of partnership decks.\n"
            "The ask slide here is the partnership commitment being requested, not a raise."
        ),
        brief_fields=(
            BriefField("partner_name", "Partner company", "text", "Who this deck is for", required=True),
            BriefField("partner_brings", "What does the partner bring?", "textarea",
                       "Distribution, brand, technology, data, install base"),
            BriefField("partnership_ask", "What are you proposing?", "textarea",
                       "e.g. Co-sell into their enterprise base, 25% rev share"),
        ),
        manual_required=("company_name", "solution_description", "partner_name"),
    ),

    "internal": DeckType(
        key="internal",
        label="Internal / Decision Memo",
        description="Get internal buy-in. Recommendation, options, plan, resources, risks.",
        audience="your own leadership team, who know the company and want the decision, not the backstory",
        goal="secure an explicit yes/no on a specific, stated decision",
        eyebrow="Internal Proposal",
        sections=("cover", "recommendation", "probsol", "summary", "product", "options", "roadmap", "ask", "risks", "closing"),
        research="none",
        guidance=(
            "Answer first. Slide two states the decision requested and its cost — everything\n"
            "after it is supporting evidence. This audience already knows the company, so\n"
            "skip market education entirely and never explain what the company does.\n"
            "Show real alternatives including doing nothing, and name real risks. The ask\n"
            "slide is budget and headcount, not investment.\n"
            "Use ONLY the initiative details the author provided — you have no web research\n"
            "for this deck and must not invent internal facts, metrics, or team names."
        ),
        brief_fields=(
            BriefField("initiative", "Initiative name", "text",
                       "e.g. Migrate billing to usage-based", required=True),
            BriefField("decision_requested", "What decision are you asking for?", "textarea",
                       "e.g. Approve $420K and 3 engineers for two quarters", required=True),
            BriefField("problem_context", "What's the problem or opportunity?", "textarea",
                       "Why this matters now, with numbers if you have them"),
            BriefField("options_considered", "Alternatives you evaluated", "textarea",
                       "Other approaches, and why you rejected them"),
            BriefField("resources_needed", "Budget & headcount required", "text",
                       "e.g. $420K, 3 engineers, 2 quarters"),
            BriefField("risks_notes", "Known risks", "textarea",
                       "What could go wrong, and what you'd do about it"),
        ),
        manual_required=("company_name", "initiative", "decision_requested"),
    ),

    "update": DeckType(
        key="update",
        label="Investor Update",
        description="Report to existing investors. Metrics, wins, challenges, asks, outlook.",
        audience="your existing investors, who already believe in the company and want the truth",
        goal="keep investors informed and get specific help",
        eyebrow="Investor Update",
        sections=("cover", "period", "traction", "wins", "roadmap", "market", "team", "closing"),
        research="none",
        guidance=(
            "These readers already own equity — they need signal, not persuasion. Report\n"
            "movement against the last period, name what is going badly as plainly as what\n"
            "is going well, and make the asks specific enough to act on today.\n"
            "Use ONLY the founder-supplied period figures. If a prior-period number was not\n"
            "given, show the current number without a comparison — never estimate, project,\n"
            "or back-fill a metric in an update. A wrong number here is a governance problem."
        ),
        brief_fields=(
            BriefField("period", "Reporting period", "text", "e.g. Q1 2026 or March 2026", required=True),
            BriefField("prior_metrics", "Last period's key numbers", "textarea",
                       "So we can show direction of travel, not just levels"),
            BriefField("wins", "Wins this period", "textarea",
                       "Customers closed, launches, hires, milestones"),
            BriefField("challenges", "Challenges & where you need help", "textarea",
                       "Be specific — named roles, named types of intro"),
        ),
        manual_required=("company_name", "period"),
    ),

    "vision": DeckType(
        key="vision",
        label="Vision / Mission",
        description="Align people on the long game. Vision, principles, pillars, horizons.",
        audience="employees, candidates, or long-term stakeholders who need to believe in the direction",
        goal="make the long-term direction memorable and worth committing to",
        eyebrow="Vision & Strategy",
        sections=("cover", "vision", "summary", "values", "pillars", "roadmap", "traction", "closing"),
        research="full",
        guidance=(
            "This deck carries conviction, not analysis. Fewer words, bigger ideas, longer\n"
            "horizon. State claims about how the world is changing and back each with a\n"
            "real figure. Principles must name the tradeoffs they force; pillars must name\n"
            "what has to be true for each bet to pay off. Avoid every phrase that would\n"
            "survive being pasted into another company's vision deck."
        ),
        brief_fields=(
            BriefField("vision_statement", "Your long-term vision", "textarea",
                       "Where does the world end up if you succeed?", required=True),
            BriefField("horizon", "Time horizon", "text", "e.g. By 2030"),
            BriefField("principles", "Operating principles or values", "textarea",
                       "The ones that actually change decisions here"),
        ),
        manual_required=("company_name", "vision_statement"),
    ),

    # ─── The spec's deck types (Phase 3) ──────────────────────────────────────
    # general / elevator / demoday are pure section lists over the existing
    # catalogue — no new models, renderers or React. That is the payoff of
    # keeping section keys separable from renderers (see sections.py).

    "general": DeckType(
        key="general",
        label="General / Company Overview",
        description="The foundational company story. Problem, solution, market, model, team.",
        audience="a mixed room — investors, partners, candidates — meeting the company for the first time",
        goal="make the company understandable and credible in twelve slides",
        eyebrow="Company Overview",
        sections=(
            "cover", "summary", "story", "probsol", "persona", "product", "galleryS",
            "market", "model", "traction", "proof", "competition", "moat", "gtm",
            "roadmap", "team", "vision", "ask", "risks", "closing",
        ),
        research="full",
        guidance=(
            "This is the default deck: broad, balanced, no single axe to grind.\n"
            "Assume the reader knows nothing about the company and little about the\n"
            "industry. Explain the problem before the product, and the market before\n"
            "the ask. Nothing here should require prior context to follow."
        ),
    ),

    "elevator": DeckType(
        key="elevator",
        label="Elevator / Five Slides",
        description="Five slides. Hook, problem, product, proof, ask — nothing else.",
        audience="someone giving this ninety seconds before deciding whether to give it more",
        goal="earn the next conversation, not close anything",
        eyebrow="Elevator Pitch",
        sections=("cover", "probsol", "product", "traction", "closing"),
        research="light",
        guidance=(
            "Five slides is a severe constraint and the whole point — the spec is\n"
            "explicit that this must not be a compressed investor deck. Carry ONE idea\n"
            "per slide and pick only the single strongest fact available for each.\n"
            "If a number is not genuinely impressive, leave it out rather than padding:\n"
            "a sparse elevator deck beats a cluttered one every time."
        ),
    ),

    "demoday": DeckType(
        key="demoday",
        label="Demo Day",
        description="A ten-minute stage pitch. Hook, pain, product, market, proof, ask.",
        audience="a demo-day audience watching twenty pitches in a row, from a distance",
        goal="be the one pitch the room still remembers at the end of the day",
        eyebrow="Demo Day",
        sections=("cover", "probsol", "persona", "product", "market",
                  "traction", "competition", "team", "ask", "closing"),
        research="full",
        guidance=(
            "Built for a stage, not a desk. Momentum and memorability beat completeness:\n"
            "the spec is explicit that a Demo Day deck is NOT a compressed investor deck.\n"
            "Short declarative headlines, one number per slide, no dense tables — a back\n"
            "row cannot read them. Put the detail in speaker_notes."
        ),
        stage_overrides={"idea": ("cover", "probsol", "persona", "product", "market",
                                  "vision", "competition", "team", "ask", "closing"),
                         "pre_revenue": ("cover", "probsol", "persona", "product", "market",
                                         "vision", "competition", "team", "ask", "closing")},
    ),

    "gtm": DeckType(
        key="gtm",
        label="Go-to-Market",
        description="How you reach, convert and keep customers. ICP, channels, funnel, economics.",
        audience="a commercial leader or investor judging whether this company can actually distribute",
        goal="show that growth is a repeatable system, not a series of lucky deals",
        eyebrow="Go-to-Market Plan",
        sections=(
            "cover", "summary", "market", "persona", "segmentation", "positioning",
            "messaging", "acquisition", "channels", "salesMotion", "funnel",
            "distribution", "partnerships", "unitEconomics", "proof", "traction",
            "scalePlan", "operations", "roadmap", "risks", "team", "closing",
        ),
        research="full",
        guidance=(
            "The spec's core GTM story is: market → ICP → positioning → acquisition →\n"
            "sales → conversion → economics → channels → scale. Every claim about a\n"
            "channel needs either a real number or an explicit label as a hypothesis.\n"
            "An untested channel presented as a proven one is the failure mode here."
        ),
    ),

    "business": DeckType(
        key="business",
        label="Business Plan",
        description="How the company operates, earns and scales. Model, sales, ops, financials.",
        audience="an operator, lender, or board member asking how this business actually works",
        goal="show a coherent, funded, executable operating plan",
        eyebrow="Business Plan",
        sections=(
            "cover", "summary", "probsol", "persona", "product", "model", "segmentation",
            "positioning", "salesMotion", "gtm", "funnel", "channels", "traction", "proof",
            "unitEconomics", "financials", "ask", "operations", "partnerships", "competition",
            "team", "roadmap", "risks", "scalePlan", "closing",
        ),
        research="full",
        guidance=(
            "The spec draws the line clearly: the investor deck asks 'should I invest?',\n"
            "the business deck asks 'how does this company work, grow, operate and\n"
            "scale?'. Weight the operating system — model, pricing, sales process,\n"
            "funnel, operations, partnerships — and go light on cap table, financing\n"
            "history and investment thesis.\n\n"
            "Executive Summary: open from the founder's stated business purpose (in the\n"
            "deck brief below) — the headline or lead must say why this business exists,\n"
            "not only what it sells.\n\n"
            "Financials: project exactly 5 fiscal years of revenue in series[], using a\n"
            "fixed 15-17% year-on-year growth rate applied to the most recent real figure\n"
            "(or a reasonable estimated base if pre-revenue) — pick one specific rate in\n"
            "that band and state it in sub, e.g. 'Revenue, ₹ Cr — projected at 16% YoY\n"
            "growth'. Use this fixed band regardless of any founder-reported month-on-month\n"
            "growth figure; that number may still appear on the traction slide, but must\n"
            "not change this slide's growth assumption.\n\n"
            "The Ask here is an operating-capital requirement, not an investor pitch: state\n"
            "the amount the business needs and break it down into a use-of-funds split\n"
            "totalling 100%, built from the founder's own allocation notes in the deck\n"
            "brief when given, framed as 'what the business needs to run and grow', never\n"
            "as 'what we are raising from investors'."
        ),
        brief_fields=(
            BriefField("business_purpose", "What's the core purpose of this business?", "textarea",
                       "The deeper why behind it, beyond making money", required=True,
                       help="Anchors the Executive Summary — why this business exists, not just what it sells."),
            BriefField("fund_use_notes", "How will you use the funds this plan calls for?", "textarea",
                       "e.g. ₹2 Cr total — 40% product, 30% hiring, 20% marketing, 10% working capital",
                       help="Drives the funding ask slide's amount and allocation breakdown."),
        ),
    ),

    "master": DeckType(
        key="master",
        label="Extended / Master",
        description="The complete company record. Every section, for reuse and reference.",
        audience="a reader who wants the whole picture and will skim to the parts they care about",
        goal="be the single source of truth every shorter deck is cut from",
        eyebrow="Company Master Deck",
        sections=("cover", "summary", "story", "probsol", "persona", "product",
                  "techIp", "security", "market", "model", "traction",
                  "unitEconomics", "gtm", "salesMotion", "operations",
                  "partnerships", "competition", "moat", "financials",
                  "ask", "capTable", "roadmap", "risks", "team", "closing"),
        research="full",
        guidance=(
            "This is the reference document the other decks are selections from, so\n"
            "completeness beats brevity — but never at the cost of inventing content.\n"
            "A section with no real information should say plainly that the data is not\n"
            "yet available rather than being filled with plausible-sounding text.\n"
            "Because it will be read rather than presented, each slide must stand alone."
        ),
    ),

    "appendix": DeckType(
        key="appendix",
        label="Appendix / Evidence",
        description="The evidence behind every claim. Workings, sources and supporting data.",
        audience="a diligence reader checking the claims made in the main deck",
        goal="make every important claim traceable to its source, method and period",
        eyebrow="Appendix",
        # Bookends only — the A-slides between them are resolved from the
        # company's available data (see `resolve_appendix_sections`).
        sections=("cover", "closing"),
        research="light",
        dynamic_sections=True,
        guidance=(
            "The Appendix is the evidence layer for the whole deck: where the main deck\n"
            "states a result, this shows how it was reached. Lead each slide with the\n"
            "claim it supports, then the method, inputs, source and period.\n"
            "Every figure carries its provenance. Estimates and unverified data are\n"
            "labelled as such, and a field the data cannot support is left empty —\n"
            "never filled. Completeness is not the goal; traceability is."
        ),
        manual_required=("company_name",),
    ),
}


# Emphasis-only stage differences — same slides, different weighting.
STAGE_EMPHASIS: dict[str, str] = {
    "idea": (
        "STAGE — IDEA: there is no product or traction yet. Do not imply either exists. "
        "Weight goes on the problem's severity, why this team, and why now."
    ),
    "pre_revenue": (
        "STAGE — PRE-REVENUE: built but not yet monetised. Show validation signals "
        "(pilots, waitlist, LOIs) as exactly what they are; never present them as revenue."
    ),
    "pre_seed": (
        "STAGE — PRE-SEED: investors are buying the team and the insight. Weight the "
        "problem, the wedge, and founder-market fit. Early traction is a bonus, not the case."
    ),
    "seed": (
        "STAGE — SEED: show early product-market-fit evidence — retention, usage depth, "
        "and the first repeatable acquisition channel. Retention is the single most "
        "diagnostic metric here; show it only if the founder supplied it."
    ),
    "series_a": (
        "STAGE — SERIES A: the case rests on repeatability. Weight unit economics, "
        "CAC payback, cohort retention, and the proof that growth is a system not a streak."
    ),
    "series_b": (
        "STAGE — SERIES B: the case is scale and efficiency. Weight net revenue retention, "
        "margin structure, competitive moat, and the path to category leadership."
    ),
    "growth": (
        "STAGE — GROWTH: weight durable margins, market share, expansion motions, "
        "and a credible line to profitability or exit."
    ),
    "bootstrapped": (
        "STAGE — BOOTSTRAPPED: capital efficiency IS the story. Weight revenue per employee, "
        "profitability, and how far the company got without outside money."
    ),
}


FORMAT_GUIDANCE: dict[str, str] = {
    "presenter": (
        "FORMAT — PRESENTER-LED: a person will narrate these slides. Keep on-slide text "
        "minimal and let each slide carry ONE idea. Headlines are short and declarative. "
        "Put the supporting detail, the caveats, and the numbers to quote into "
        "speaker_notes — that is where the depth belongs, not on the slide."
    ),
    "standalone": (
        "FORMAT — STANDALONE / READ-ONLY: this deck will be read with nobody presenting it. "
        "Every slide must be fully self-explanatory. Write complete sentences, state the "
        "context a presenter would otherwise supply, and never rely on narration to connect "
        "two slides. Fuller body copy is correct here."
    ),
}


# ─── Resolution helpers ───────────────────────────────────────────────────────

def get_deck_type(key: Optional[str]) -> DeckType:
    """Return the deck type for `key`, falling back to the investor deck."""
    return DECK_TYPES.get(key or DEFAULT_DECK_TYPE, DECK_TYPES[DEFAULT_DECK_TYPE])


#: Hard ceiling on a generated Appendix — beyond this the output no longer fits
#: the model's token budget, and the A20+ "additional evidence" tail is a
#: reference register rather than slides anyone reads.
MAX_APPENDIX_SLIDES = 24


def resolve_appendix_sections(group_fill: Optional[Mapping[str, int]] = None) -> tuple[str, ...]:
    """The Appendix slide sequence, built from what the company has told us.

    `group_fill` maps profile group → number of parameters filled. A slide is
    included when any of its groups has data; with no profile at all (`None`),
    the default evidence set is used so the deck is never an empty shell.
    Order follows the spec's A1..A20 order, not fill order.
    """
    if group_fill is None:
        picked = [k for k in EVIDENCE_SECTIONS if k in DEFAULT_EVIDENCE_SECTIONS]
    else:
        picked = [
            k for k, (_b, _l, _p, groups) in EVIDENCE_SECTIONS.items()
            if any(group_fill.get(g, 0) > 0 for g in groups)
        ]
        # The sources register is only meaningful alongside other evidence.
        if "evSources" in picked and len(picked) == 1:
            picked = []
        if not picked:
            picked = [k for k in EVIDENCE_SECTIONS if k in DEFAULT_EVIDENCE_SECTIONS]
    picked = picked[: MAX_APPENDIX_SLIDES - 2]
    return ("cover", *picked, "closing")


def profile_group_fill(values) -> dict[str, int]:
    """Count filled parameters per profile group, for `resolve_appendix_sections`."""
    from app.profile.parameters import PARAMETERS
    out: dict[str, int] = {}
    for name in values:
        p = PARAMETERS.get(name)
        if p is not None:
            out[p.group] = out.get(p.group, 0) + 1
    return out


def resolve_sections(
    deck_type: Optional[str],
    *,
    stage: Optional[str] = None,
    group_fill: Optional[Mapping[str, int]] = None,
) -> tuple[str, ...]:
    """The ordered section list for this deck, after any stage override.

    This is THE slide sequence — the prompt, the validator, the PPTX renderer
    and the frontend all read it. Persist the result on the deck (see
    `MasterDeckResult.slide_order`) so a generated deck keeps rendering in its
    original order even if this registry later changes.
    """
    dt = get_deck_type(deck_type)
    if dt.dynamic_sections:
        return resolve_appendix_sections(group_fill)
    if stage and stage in dt.stage_overrides:
        return dt.stage_overrides[stage]
    return dt.sections


def sections_for_stored_deck(
    deck_type: Optional[str],
    slide_order: Optional[Sequence[str]],
    template_data: Optional[dict],
) -> tuple[str, ...]:
    """The slide sequence to re-render an ALREADY-GENERATED deck with.

    Precedence:
      1. the order the deck recorded at generation time — always authoritative;
      2. otherwise the registry order, filtered to the sections this deck
         actually has content for;
      3. otherwise the registry order.

    Step 2 matters because deck types get longer over time. The investor deck
    grew from 13 sections to 24; a deck generated before `slide_order` was
    persisted has no content for the 11 added sections, so re-rendering it
    against today's registry would emit eleven blank slides.
    """
    if slide_order:
        return tuple(slide_order)
    default = resolve_sections(deck_type)
    if template_data:
        present = tuple(k for k in default if k == "cover" or template_data.get(k))
        if len(present) > 1:
            return present
    return default


def section_by_slide_number(sections: Sequence[str]) -> dict[int, str]:
    """Map 1-based slide position → section key.

    Replaces the hand-maintained positional map. `cover` is excluded because it
    draws on the top-level passthrough keys rather than a section of its own.
    """
    return {
        i: key
        for i, key in enumerate(sections, start=1)
        if SECTION_SPECS.get(key) and SECTION_SPECS[key].model is not None
    }


def stage_emphasis(stage: Optional[str]) -> str:
    return STAGE_EMPHASIS.get(stage or "", "")


def format_guidance(deck_format: Optional[str]) -> str:
    return FORMAT_GUIDANCE.get(deck_format or DEFAULT_DECK_FORMAT, FORMAT_GUIDANCE[DEFAULT_DECK_FORMAT])


def required_manual_fields(deck_type: Optional[str]) -> tuple[str, ...]:
    """Fields a no-website project must supply for this deck type."""
    return get_deck_type(deck_type).manual_required


#: The shared intake form's fields, each mapped to the catalogue parameter it
#: feeds. The form shows a field only when that parameter is relevant to the
#: chosen deck type, so an Investor Update is never asked for a raise amount and
#: a Sales deck is never asked for ARR. Founders are not listed: the form gates
#: them on the deck having a team slide, which is the stricter rule.
INTAKE_FIELD_PARAMS: dict[str, str] = {
    # The no-website story
    "industry": "industry",
    "problem_statement": "problem_statement",
    "solution_description": "solution_statement",
    "target_customer": "ideal_customer_profile",
    "traction_notes": "pilots",
    "competitor_notes": "direct_competitors",
    # Framing
    "funding_stage": "funding_stage",
    "business_model": "business_model",
    # Numbers
    "arr_usd": "arr",
    "mrr_usd": "mrr",
    "total_customers": "customers",
    "monthly_active_users": "active_users",
    "ask_amount_usd": "amount_raising",
    "round_type": "amount_raising",
    "founded_year": "founded_year",
    "team_size": "team_size",
    "growth_rate_mom_pct": "revenue_growth",
    "churn_rate_pct": "churn",
    "cac_usd": "cac",
    "ltv_usd": "ltv",
    "nrr_pct": "nrr",
}

#: Revenue figures a company at these stages does not have yet. The form hides
#: them rather than inviting an invented ARR — the same stages whose investor
#: deck swaps the traction slide for the vision slide.
NO_REVENUE_STAGES = ("idea", "pre_revenue")
REVENUE_INTAKE_FIELDS = frozenset({
    "arr_usd", "mrr_usd", "growth_rate_mom_pct", "churn_rate_pct",
    "cac_usd", "ltv_usd", "nrr_pct",
})


def intake_fields_for(deck_type: Optional[str]) -> list[dict]:
    """The shared intake fields this deck type asks for, with their relevance.

    Driven by the relevance table, with two overrides it cannot see: a field the
    type cannot be created without is always asked, and so is the stage on a
    type whose slide list changes with it.
    """
    from app.profile.relevance import param_relevance

    dt = get_deck_type(deck_type)
    out = []
    for name, param in INTAKE_FIELD_PARAMS.items():
        rel = param_relevance(dt.key, param)
        if name in dt.manual_required:
            rel = "R"
        elif name == "funding_stage" and dt.stage_overrides and rel == "N":
            rel = "C"
        if rel == "N":
            continue
        out.append({
            "name": name,
            "relevance": rel,
            "hidden_at_stages": list(NO_REVENUE_STAGES) if name in REVENUE_INTAKE_FIELDS else [],
        })
    return out


def parameter_groups_for(deck_type: Optional[str], *, stage: Optional[str] = None) -> list[dict]:
    """Which profile groups this deck consumes, with their relevance.

    Imported lazily: `app.profile` imports nothing from `app.decks`, but this
    keeps the dependency one-way at module-import time too, so the deck
    registry stays usable in isolation (the drift-guard tests rely on that).
    """
    from app.profile.parameters import PARAMETER_GROUPS
    from app.profile.relevance import relevance_for

    out = []
    for key, group in PARAMETER_GROUPS.items():
        rel = relevance_for(deck_type, key, stage=stage)
        if rel == "N":
            continue
        out.append({"key": key, "label": group.label, "relevance": rel,
                    "param_count": len(group.params)})
    return out


def serialize_deck_types() -> list[dict]:
    """Registry as JSON for `GET /api/v1/deck-types` — drives the intake form."""
    out = []
    for dt in DECK_TYPES.values():
        out.append({
            "key": dt.key,
            "label": dt.label,
            "description": dt.description,
            "eyebrow": dt.eyebrow,
            "slide_count": len(resolve_appendix_sections(None)) if dt.dynamic_sections else len(dt.sections),
            "research": dt.research,
            "supports_stages": bool(dt.stage_overrides) or dt.key == "investor",
            # What a no-website project must supply instead of a crawl. The
            # intake form drives its own validation off this, so the two can't
            # disagree about what is required.
            "manual_required": list(dt.manual_required),
            "dynamic_sections": dt.dynamic_sections,
            "parameter_groups": parameter_groups_for(dt.key),
            # Which of the shared form's fields this type uses — the form hides
            # the rest instead of asking every deck for every number.
            "intake_fields": intake_fields_for(dt.key),
            "brief_fields": [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.type,
                    "placeholder": f.placeholder,
                    "help": f.help,
                    "required": f.required,
                }
                for f in dt.brief_fields
            ],
        })
    return out
