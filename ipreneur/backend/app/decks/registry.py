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
from typing import Literal, Optional, Sequence

from app.decks.sections import SECTION_SPECS

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
            "unitEconomics", "financials", "operations", "partnerships", "competition",
            "team", "roadmap", "risks", "scalePlan", "closing",
        ),
        research="full",
        guidance=(
            "The spec draws the line clearly: the investor deck asks 'should I invest?',\n"
            "the business deck asks 'how does this company work, grow, operate and\n"
            "scale?'. Weight the operating system — model, pricing, sales process,\n"
            "funnel, operations, partnerships — and go light on cap table, financing\n"
            "history and investment thesis."
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
        "and the first repeatable acquisition channel."
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


def resolve_sections(deck_type: Optional[str], *, stage: Optional[str] = None) -> tuple[str, ...]:
    """The ordered section list for this deck, after any stage override.

    This is THE slide sequence — the prompt, the validator, the PPTX renderer
    and the frontend all read it. Persist the result on the deck (see
    `MasterDeckResult.slide_order`) so a generated deck keeps rendering in its
    original order even if this registry later changes.
    """
    dt = get_deck_type(deck_type)
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
            "slide_count": len(dt.sections),
            "research": dt.research,
            "supports_stages": bool(dt.stage_overrides) or dt.key == "investor",
            # What a no-website project must supply instead of a crawl. The
            # intake form drives its own validation off this, so the two can't
            # disagree about what is required.
            "manual_required": list(dt.manual_required),
            "dynamic_sections": dt.dynamic_sections,
            "parameter_groups": parameter_groups_for(dt.key),
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
