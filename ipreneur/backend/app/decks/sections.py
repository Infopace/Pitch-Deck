"""
The section catalogue — every slide section any deck type can use.

A deck is an ordered list of SECTION KEYS (see `registry.py`). This module maps
each key to the four things the rest of the system needs:

  model     — the pydantic model that validates that section's `template_data`
  renderer  — the frontend renderer id that draws it (TemplatedDeck.tsx)
  layout    — the legacy `slides[]` layout hint the PPTX renderer dispatches on
  skeleton  — the JSON snippet injected into the generation prompt

A section key and its renderer are deliberately SEPARABLE. `risks` renders
through the same two-column renderer as `probsol`, `options` through the
`competition` table, `wins` through `product` cards. That is why eleven of the
fourteen new sections need no new model and no new React code — only different
prompt text. Reuse here is the reason adding a deck type is cheap.

Adding a section: add its model (or reuse one), add a SECTION_SPECS entry, and
add the matching renderer id to the frontend registry in
`frontend/src/components/workspace/deckTemplates/deckTypes.ts`. The test in
`backend/tests/test_deck_registry.py` fails if a key is referenced but missing.
"""
from dataclasses import dataclass, field
from typing import Optional

from pydantic import BaseModel, field_validator


def _coerce_number(val):
    """Traction series / ask percentages sometimes arrive as strings ("2", "15%")."""
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        import re
        m = re.search(r"[-+]?\d*\.?\d+", val)
        if m:
            return float(m.group())
    return 0


# ─── Shared leaf models ───────────────────────────────────────────────────────

class KpiTile(BaseModel):
    k: str = ""
    l: str = ""


class ProbSolItem(BaseModel):
    k: str = ""
    t: str = ""


# ─── Section models (unchanged from the original template_schema.py) ──────────

class SummarySection(BaseModel):
    headline: str = ""
    lead: str = ""
    highlights: list[KpiTile] = []


class ProbSolSection(BaseModel):
    headline: str = ""
    sub: str = ""
    problemTitle: str = ""
    problemLead: str = ""
    solutionTitle: str = ""
    solutionLead: str = ""
    problem: list[ProbSolItem] = []
    solution: list[ProbSolItem] = []
    problemFoot: str = ""
    solutionFoot: str = ""


class ProductStep(BaseModel):
    n: str = ""
    t: str = ""
    d: str = ""
    tags: list[str] = []


class ProductSection(BaseModel):
    headline: str = ""
    sub: str = ""
    steps: list[ProductStep] = []


class MarketPoint(BaseModel):
    v: str = ""
    l: str = ""


class MarketSection(BaseModel):
    headline: str = ""
    tam: MarketPoint = MarketPoint()
    sam: MarketPoint = MarketPoint()
    som: MarketPoint = MarketPoint()
    note: str = ""


class ModelStream(BaseModel):
    t: str = ""
    d: str = ""
    v: str = ""
    vl: str = ""


class ModelTier(BaseModel):
    t: str = ""
    p: str = ""
    s: str = ""
    d: str = ""


class ModelSection(BaseModel):
    headline: str = ""
    flow: list[str] = []
    streams: list[ModelStream] = []
    tiers: list[ModelTier] = []


class TractionPoint(BaseModel):
    y: str = ""
    v: float = 0

    @field_validator("v", mode="before")
    @classmethod
    def _coerce_v(cls, val):
        return _coerce_number(val)


class TractionSection(BaseModel):
    headline: str = ""
    sub: str = ""
    series: list[TractionPoint] = []
    kpis: list[KpiTile] = []


class CompetitionRow(BaseModel):
    f: str = ""
    v: list[bool] = []


class CompetitionSection(BaseModel):
    headline: str = ""
    cols: list[str] = []
    rows: list[CompetitionRow] = []


class TeamMember(BaseModel):
    i: str = ""
    n: str = ""
    r: str = ""
    b: str = ""
    em: str = ""   # email — only when actually known, never invented
    ph: str = ""   # phone — only when actually known, never invented
    li: str = ""   # LinkedIn profile URL — only when actually known, never invented


class TeamSection(BaseModel):
    headline: str = ""
    members: list[TeamMember] = []
    advisors: str = ""


class AskItem(BaseModel):
    l: str = ""
    p: float = 0

    @field_validator("p", mode="before")
    @classmethod
    def _coerce_p(cls, val):
        return _coerce_number(val)


class AskSection(BaseModel):
    headline: str = ""
    sub: str = ""
    use: list[AskItem] = []


class ClosingSection(BaseModel):
    headline: str = ""
    sub: str = ""
    contact: str = ""
    site: str = ""


class RoadmapItem(BaseModel):
    q: str = ""
    t: str = ""
    d: str = ""


class RoadmapSection(BaseModel):
    headline: str = ""
    sub: str = ""
    items: list[RoadmapItem] = []


class GallerySlot(BaseModel):
    id: str = ""
    ph: str = ""
    span: bool = False


class GallerySection(BaseModel):
    headline: str = ""
    sub: str = ""
    slots: list[GallerySlot] = []


# ─── New section models (the only three that need new renderers) ──────────────

class ProofCase(BaseModel):
    """One customer proof point: who, what changed, by how much."""
    c: str = ""    # customer / account name
    m: str = ""    # headline metric, e.g. "-42%"
    ml: str = ""   # metric label, e.g. "support cost per ticket"
    d: str = ""    # before → after detail, 1-2 sentences
    q: str = ""    # short attributed quote (optional)


class ProofSection(BaseModel):
    headline: str = ""
    sub: str = ""
    cases: list[ProofCase] = []
    logos: list[str] = []   # customer names rendered as a text logo strip


class PersonaSection(BaseModel):
    """Who the product is for and the job they're hiring it to do."""
    headline: str = ""
    sub: str = ""
    who: str = ""       # the persona in one line
    context: str = ""   # where/when they hit this
    jobs: list[ProbSolItem] = []    # jobs to be done
    pains: list[ProbSolItem] = []   # frictions in today's workflow
    quote: str = ""     # representative user quote


class VisionSection(BaseModel):
    """The long-horizon statement — deliberately sparse, one big idea."""
    headline: str = ""      # the vision itself, set in large type
    sub: str = ""
    statement: str = ""     # the "we believe…" line
    horizon: str = ""       # e.g. "By 2030"
    proofPoints: list[KpiTile] = []


# ─── The catalogue ────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SectionSpec:
    """How one section key is validated, rendered, and prompted for.

    `model=None` means the section carries no `template_data` block of its own —
    only `cover` does that, drawing on the top-level passthrough keys.
    """
    renderer: str           # frontend renderer id
    layout: str             # legacy slides[] layout hint for the PPTX renderer
    label: str              # slide title shown in the prompt's slide plan
    prompt: str             # one-line writing instruction
    model: Optional[type[BaseModel]] = None
    skeleton: str = ""      # JSON value injected under this key in template_data
    caps: dict[str, int] = field(default_factory=dict)
    rules: str = ""         # optional detailed rules block


_MARKET_RULES = """Source TAM/SAM/SOM from the verified research where present. Every figure must be
a specific number, never blank and never "not disclosed". If research is empty,
estimate realistically from the industry -- every industry has published reports.
MUST be industry + domain + geography specific, not generic.
In the legacy slides[] entry for this slide (layout market_sizing), also fill:
  data_points -- EXACTLY 4: TAM, SAM, SOM, Market CAGR, each with label/value/sublabel,
    e.g. label 'Total Addressable Market (TAM)', value '$47B',
    sublabel 'Global quick commerce 2024, source RedSeer'.
  cards -- up to 3 company financials using founder-provided figures EXACTLY; omit any
    card the founder gave no data for, and omit cards entirely if none was given.
  bullet_points -- exactly 3 yearly projections computed from the founder's MRR/ARR and
    growth rate (Year N MRR = X * (1+G)^(12N)), each written as
    '**FY@YEAR@:** $X ARR - N customers - milestone', starting with the current year."""


# Skeletons are copied verbatim from the original hand-written prompt so the
# investor deck's generated output is byte-for-byte what it was before.
SECTION_SPECS: dict[str, SectionSpec] = {
    "cover": SectionSpec(
        renderer="cover", layout="full_bleed", label="Cover",
        prompt="title slide — company, tagline, round/eyebrow",
        model=None,
    ),

    "summary": SectionSpec(
        renderer="summary", layout="big_number", label="Executive Summary",
        prompt="one-sentence thesis, a 2-sentence elaboration, and 4 KPI tiles",
        model=SummarySection, caps={"highlights": 4},
        skeleton='{"headline": "one-sentence what the company is and why it wins", "lead": "2-sentence elaboration of the opportunity and traction", "highlights": [{"k": "$2.4M", "l": "ARR"}, {"k": "500+", "l": "Customers"}, {"k": "40%", "l": "Market CAGR"}, {"k": "$48B", "l": "TAM"}]}',
    ),

    "probsol": SectionSpec(
        renderer="probsol", layout="two_column", label="Problem & Solution",
        prompt="the pain on the left, your answer on the right — 3 items each",
        model=ProbSolSection, caps={"problem": 3, "solution": 3},
        skeleton='{"headline": "...", "sub": "one-line framing", "problemTitle": "The Problem", "problemLead": "the core pain in one bold line", "solutionTitle": "Our Solution", "solutionLead": "the differentiator in one bold line", "problem": [{"k": "Bold lead", "t": "rest of the pain point"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "solution": [{"k": "Bold lead", "t": "rest of the capability"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "problemFoot": "the cost of inaction (one line)", "solutionFoot": "the payoff (one line)"}',
        rules=(
            "problem[] and solution[] each = exactly 3 items; k = a 1-3 word bold lead, t = the rest.\n"
            "problemFoot/solutionFoot = one punchy line each. Keep this company winning in the solution column."
        ),
    ),

    "product": SectionSpec(
        renderer="product", layout="cards", label="Product",
        prompt="how it works in 3 numbered steps, each with 2-3 feature chips",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Connect", "d": "...", "tags": ["Tag A", "Tag B"]}, {"n": "02", "t": "Track", "d": "...", "tags": ["Tag A", "Tag B"]}, {"n": "03", "t": "Act", "d": "...", "tags": ["Tag A", "Tag B"]}]}',
        rules='product.steps[].n = "01","02","03"; each step has 2-3 short "tags" (feature chips).',
    ),

    "market": SectionSpec(
        renderer="market", layout="market_sizing", label="Market Opportunity",
        prompt="TAM / SAM / SOM with a bottom-up methodology note",
        model=MarketSection,
        skeleton='{"headline": "...", "tam": {"v": "$48B", "l": "..."}, "sam": {"v": "$9.2B", "l": "..."}, "som": {"v": "$640M", "l": "..."}, "note": "bottom-up methodology"}',
        rules=_MARKET_RULES,
    ),

    "model": SectionSpec(
        renderer="model", layout="cards", label="Business Model",
        prompt="revenue flow, 2 revenue streams, and 3 pricing tiers",
        model=ModelSection, caps={"streams": 3, "tiers": 3},
        skeleton='{"headline": "...", "flow": ["Customer", "Platform", "Subscription + payments", "Net revenue"], "streams": [{"t": "...", "d": "...", "v": "~70%", "vl": "of revenue"}, {"t": "...", "d": "...", "v": "~30%", "vl": "of revenue"}], "tiers": [{"t": "Starter", "p": "$499", "s": "/mo", "d": "..."}, {"t": "Growth", "p": "$1,500", "s": "/mo", "d": "..."}, {"t": "Enterprise", "p": "Custom", "s": "", "d": "..."}]}',
        rules="model.flow = 3–4 short nodes.",
    ),

    "traction": SectionSpec(
        renderer="traction", layout="big_number", label="Traction",
        prompt="a growth curve plus 4 KPI tiles — founder-provided figures exactly",
        model=TractionSection, caps={"series": 8, "kpis": 4},
        skeleton='{"headline": "...", "sub": "ARR growth ($M)", "series": [{"y": "Q1", "v": 2}, {"y": "Q2", "v": 5}, {"y": "Q3", "v": 9}, {"y": "Q4", "v": 15}], "kpis": [{"k": "$2.4M", "l": "ARR"}, {"k": "15%", "l": "MoM growth"}, {"k": "500+", "l": "Customers"}, {"k": "120%", "l": "Net retention"}]}',
        rules='traction.series[].v are NUMBERS in $M (no "$"/"M"), ascending; y = period label.',
    ),

    "competition": SectionSpec(
        renderer="competition", layout="cards", label="Competitive Landscape",
        prompt="a feature matrix against 3 named real competitors",
        model=CompetitionSection, caps={"rows": 6, "cols": 4},
        skeleton='{"headline": "...", "cols": ["This company", "Competitor 1", "Competitor 2", "Competitor 3"], "rows": [{"f": "Feature A", "v": [true, false, true, false]}, {"f": "Feature B", "v": [true, true, false, false]}, {"f": "Feature C", "v": [true, false, false, false]}, {"f": "Feature D", "v": [true, true, true, false]}, {"f": "Feature E", "v": [true, false, false, true]}]}',
        rules=(
            "competition.cols[0] = this company; rows[].v are booleans (true = has the feature),\n"
            "one boolean per column. This company (index 0) should win most rows.\n"
            "Use real, named competitors — derive them from the industry if research is empty.\n"
            'NEVER write "Not publicly disclosed" as a competitor name.'
        ),
    ),

    "roadmap": SectionSpec(
        renderer="roadmap", layout="timeline", label="Roadmap",
        prompt="4 dated future milestones",
        model=RoadmapSection, caps={"items": 4},
        skeleton='{"headline": "...", "sub": "...", "items": [{"q": "@Q1@", "t": "...", "d": "..."}, {"q": "@Q2@", "t": "...", "d": "..."}, {"q": "@Q3@", "t": "...", "d": "..."}, {"q": "@Q4@", "t": "...", "d": "..."}]}',
        rules="roadmap.items = 4 real future milestones with quarter labels, labelled exactly 'Q1', 'Q2', 'Q3', 'Q4' with no year.",
    ),

    "galleryS": SectionSpec(
        renderer="gallery", layout="cards", label="Gallery",
        prompt="5 image placeholders captioned for this company's product",
        model=GallerySection, caps={"slots": 5},
        skeleton='{"headline": "...", "sub": "one line inviting product screens / photos", "slots": [{"id": "g1", "ph": "Dashboard screenshot", "span": true}, {"id": "g2", "ph": "Mobile app"}, {"id": "g3", "ph": "Product in use"}, {"id": "g4", "ph": "Customer / press"}, {"id": "g5", "ph": "Reporting view", "span": true}]}',
        rules=(
            "galleryS.slots = exactly 5 image placeholders (ph = short caption of what image goes there,\n"
            'relevant to THIS company\'s product/industry). Set "span": true on slots 1 and 5 only.'
        ),
    ),

    "team": SectionSpec(
        renderer="team", layout="cards", label="Team",
        prompt="the real, verified people only — never invented",
        model=TeamSection, caps={"members": 4},
        skeleton='{"headline": "...", "members": [{"i": "BA", "n": "Full Name", "r": "CEO & Co-Founder", "b": "education + prior companies", "em": "", "ph": "", "li": ""}], "advisors": "Backed by ..."}',
        rules=(
            "team.members: include ONLY real people from research_data.founders. ⛔ NEVER invent names/titles/bios.\n"
            'Entries with source="founder-provided" are self-reported ground truth, not fabrication — use them directly.\n'
            'If research_data.founders is empty → members:[{"i":"","n":"Leadership","r":"Team","b":"Details available on request"}].\n'
            "em/ph/li = that person's email, phone, and LinkedIn URL — copy EXACTLY from that founder's own\n"
            "email/phone/linkedin fields in research_data.founders when present, byte for byte, never reformatted\n"
            "or guessed. If a founder's source URL is clearly their own linkedin.com/in/... profile (not the\n"
            "company page), that URL may be used as li. Otherwise leave em/ph/li as \"\" — ⛔ NEVER invent or\n"
            "infer a phone number, personal email, or LinkedIn URL for a real, named person. This is stricter\n"
            "than every other field on this slide: a fabricated bio detail is embarrassing, a fabricated contact\n"
            "detail attributed to a real person is a privacy and credibility failure."
        ),
    ),

    "ask": SectionSpec(
        renderer="ask", layout="cards", label="The Ask",
        prompt="the amount, and a use-of-funds split totalling 100%",
        model=AskSection, caps={"use": 4},
        skeleton='{"headline": "Raising $XM Series A", "sub": "...", "use": [{"l": "Engineering & product", "p": 45}, {"l": "Go-to-market", "p": 30}, {"l": "Operations", "p": 15}, {"l": "G&A", "p": 10}]}',
        rules="ask.use[].p are percentages that total 100.",
    ),

    "closing": SectionSpec(
        renderer="closing", layout="full_bleed", label="Closing",
        prompt="the closing line plus contact email and website",
        model=ClosingSection,
        skeleton='{"headline": "Let\'s build the future together", "sub": "...", "contact": "founders@company.com", "site": "company.com"}',
    ),

    # ── Sales ────────────────────────────────────────────────────────────────
    "proof": SectionSpec(
        renderer="proof", layout="cards", label="Proof & Case Studies",
        prompt="2-3 named customer outcomes, each with a hard before→after number",
        model=ProofSection, caps={"cases": 3, "logos": 6},
        skeleton='{"headline": "...", "sub": "...", "cases": [{"c": "Customer name", "m": "-42%", "ml": "support cost per ticket", "d": "what it was before → what it is now, in one or two sentences", "q": "short quote if a real one is known, else empty"}, {"c": "...", "m": "3.1x", "ml": "...", "d": "...", "q": ""}], "logos": ["Customer A", "Customer B", "Customer C"]}',
        rules=(
            "proof.cases = 2-3 entries; m = the headline number, ml = what it measures.\n"
            "Use only customers actually evidenced in the website content, research, or the\n"
            "founder's brief. If none are known, return cases:[] and logos:[] rather than\n"
            "inventing a customer — a fabricated reference is the single most damaging\n"
            "thing a sales deck can contain. Leave q empty unless a real quote was found."
        ),
    ),

    "roi": SectionSpec(
        renderer="traction", layout="big_number", label="ROI & Business Impact",
        prompt="the buyer's payback maths — a value curve plus 4 impact KPIs",
        model=TractionSection, caps={"series": 8, "kpis": 4},
        skeleton='{"headline": "...", "sub": "Cumulative value delivered ($K)", "series": [{"y": "Month 3", "v": 12}, {"y": "Month 6", "v": 38}, {"y": "Month 9", "v": 74}, {"y": "Month 12", "v": 120}], "kpis": [{"k": "4.2x", "l": "Year-one ROI"}, {"k": "3.5 mo", "l": "Payback period"}, {"k": "$180K", "l": "Annual cost avoided"}, {"k": "62%", "l": "Less manual effort"}]}',
        rules=(
            "roi is the BUYER's return, not the vendor's revenue. series[].v are NUMBERS,\n"
            "ascending, representing cumulative value to the customer; sub names the unit.\n"
            "Ground every figure in the pricing signals and the customer's own cost of the\n"
            "problem — state the assumption in the headline or sub rather than implying precision."
        ),
    ),

    # ── Product / demo ───────────────────────────────────────────────────────
    "persona": SectionSpec(
        renderer="persona", layout="two_column", label="User & Job to Be Done",
        prompt="who this is for, and the job they're hiring it to do",
        model=PersonaSection, caps={"jobs": 3, "pains": 3},
        skeleton='{"headline": "...", "sub": "...", "who": "the persona in one specific line — role, company type, scale", "context": "where and when they hit this, in one line", "jobs": [{"k": "Bold lead", "t": "the job they are trying to get done"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "pains": [{"k": "Bold lead", "t": "the friction in their current workflow"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "quote": "a representative line in the user\'s own voice, or empty if none is evidenced"}',
        rules=(
            "persona.who must name a specific role and company profile — not \"businesses\"\n"
            "or \"teams\". jobs[] are outcomes the user wants, phrased in their language;\n"
            "pains[] are frictions in the workflow they use today. 3 of each."
        ),
    ),

    # ── Partnership ──────────────────────────────────────────────────────────
    "partnerRole": SectionSpec(
        renderer="probsol", layout="two_column", label="What Each Side Brings",
        prompt="our capabilities on one side, the partner's on the other",
        model=ProbSolSection, caps={"problem": 3, "solution": 3},
        skeleton='{"headline": "...", "sub": "one line on why these two are complementary", "problemTitle": "What we bring", "problemLead": "our contribution in one bold line", "solutionTitle": "What you bring", "solutionLead": "their contribution in one bold line", "problem": [{"k": "Bold lead", "t": "a specific asset, channel, or capability we contribute"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "solution": [{"k": "Bold lead", "t": "a specific asset, channel, or capability they contribute"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "problemFoot": "what we are accountable for", "solutionFoot": "what we are asking them to own"}',
        rules=(
            "Both columns must be flattering and concrete — this is a proposal to an equal,\n"
            "not a pitch to a buyer. Name real assets (channel reach, data, install base,\n"
            "licences, engineering capacity), never generic 'expertise'."
        ),
    ),

    "partnershipModel": SectionSpec(
        renderer="model", layout="cards", label="Partnership Model",
        prompt="how the partnership actually operates and how value is shared",
        model=ModelSection, caps={"streams": 3, "tiers": 3},
        skeleton='{"headline": "...", "flow": ["Joint customer", "Co-sell motion", "Shared delivery", "Split economics"], "streams": [{"t": "...", "d": "how this revenue or value stream works", "v": "60/40", "vl": "split"}, {"t": "...", "d": "...", "v": "~30%", "vl": "of joint pipeline"}], "tiers": [{"t": "Referral", "p": "10%", "s": "of ACV", "d": "..."}, {"t": "Co-sell", "p": "25%", "s": "of ACV", "d": "..."}, {"t": "Reseller", "p": "Custom", "s": "", "d": "..."}]}',
        rules=(
            "flow = the 3–4 step mechanics of the partnership. streams = where joint value\n"
            "comes from. tiers = the engagement models on offer (referral / co-sell /\n"
            "reseller or equivalent) with their actual economics."
        ),
    ),

    "gtm": SectionSpec(
        renderer="roadmap", layout="timeline", label="Go-to-Market Together",
        prompt="the joint launch plan in 4 dated phases",
        model=RoadmapSection, caps={"items": 4},
        skeleton='{"headline": "...", "sub": "...", "items": [{"q": "Phase 1 · @Q1@", "t": "Pilot", "d": "..."}, {"q": "Phase 2 · @Q2@", "t": "...", "d": "..."}, {"q": "Phase 3 · @Q3@", "t": "...", "d": "..."}, {"q": "Phase 4 · @Q4@", "t": "...", "d": "..."}]}',
        rules="Each phase names the joint activity and which side owns it.",
    ),

    # ── Internal ─────────────────────────────────────────────────────────────
    "recommendation": SectionSpec(
        renderer="summary", layout="big_number", label="Recommendation",
        prompt="lead with the decision being asked for, then the 4 numbers that justify it",
        model=SummarySection, caps={"highlights": 4},
        skeleton='{"headline": "the recommendation as a single imperative sentence — \'Approve X to achieve Y\'", "lead": "2 sentences on what this unlocks and what it costs", "highlights": [{"k": "$420K", "l": "Investment"}, {"k": "14 mo", "l": "Payback"}, {"k": "+18%", "l": "Retention lift"}, {"k": "@Q3@", "l": "Live by"}]}',
        rules=(
            "This is an internal decision memo opening — answer first, evidence second.\n"
            "The headline must state the actual decision requested, not describe a topic."
        ),
    ),

    "options": SectionSpec(
        renderer="competition", layout="cards", label="Options Considered",
        prompt="the alternatives evaluated, scored against the criteria that matter",
        model=CompetitionSection, caps={"rows": 6, "cols": 4},
        skeleton='{"headline": "...", "cols": ["Recommended", "Alternative A", "Alternative B", "Do nothing"], "rows": [{"f": "Criterion A", "v": [true, false, true, false]}, {"f": "Criterion B", "v": [true, true, false, false]}, {"f": "Criterion C", "v": [true, false, false, false]}, {"f": "Criterion D", "v": [true, true, false, false]}, {"f": "Criterion E", "v": [true, false, true, false]}]}',
        rules=(
            "cols[0] is the recommended option; always include a genuine 'Do nothing' /\n"
            "status-quo column — a comparison without it reads as advocacy, not analysis.\n"
            "rows[] are the decision criteria (cost, speed, risk, reversibility, headcount)."
        ),
    ),

    "risks": SectionSpec(
        renderer="probsol", layout="two_column", label="Risks & Mitigations",
        prompt="the honest downside on one side, the mitigation on the other",
        model=ProbSolSection, caps={"problem": 3, "solution": 3},
        skeleton='{"headline": "...", "sub": "one line acknowledging what could go wrong", "problemTitle": "Risks", "problemLead": "the biggest exposure in one bold line", "solutionTitle": "Mitigations", "solutionLead": "how we contain it in one bold line", "problem": [{"k": "Bold lead", "t": "a specific, plausible failure mode"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "solution": [{"k": "Bold lead", "t": "the concrete mitigation, with an owner or trigger"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "problemFoot": "the risk we are knowingly accepting", "solutionFoot": "the checkpoint at which we would reverse course"}',
        rules=(
            "Name real risks with teeth — delivery slip, adoption failure, vendor lock-in,\n"
            "key-person dependency. A risk slide with only soft risks destroys the memo's\n"
            "credibility. Each mitigation pairs with the risk at the same index."
        ),
    ),

    # ── Investor update ──────────────────────────────────────────────────────
    "period": SectionSpec(
        renderer="summary", layout="big_number", label="Period Highlights",
        prompt="the reporting period and its 3-5 headline movements",
        model=SummarySection, caps={"highlights": 4},
        skeleton='{"headline": "the period\'s single most important development, in one sentence", "lead": "2 sentences framing where the business stands versus the last update", "highlights": [{"k": "$310K", "l": "MRR (+18% MoM)"}, {"k": "42", "l": "New logos"}, {"k": "11 mo", "l": "Runway"}, {"k": "94%", "l": "Gross retention"}]}',
        rules=(
            "Every highlight carries the DIRECTION of travel, not just a level —\n"
            '"$310K MRR (+18% MoM)" not "$310K MRR". Use only founder-supplied figures;\n'
            "if a prior-period number was not provided, omit the comparison rather than\n"
            "estimating it."
        ),
    ),

    "wins": SectionSpec(
        renderer="product", layout="cards", label="Wins & Challenges",
        prompt="what went well, what didn't, and where help is needed",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Wins", "d": "what actually landed this period", "tags": ["Shipped", "Closed"]}, {"n": "02", "t": "Challenges", "d": "what is genuinely hard right now", "tags": ["At risk"]}, {"n": "03", "t": "How you can help", "d": "the specific asks — intros, hiring, advice", "tags": ["Ask"]}]}',
        rules=(
            "Exactly these three cards, in this order. The challenges card must contain a\n"
            "real problem — an update that reports only wins is the one investors distrust.\n"
            "The asks card must be specific enough to act on (a named role, a named type\n"
            "of intro), never 'introductions to potential customers'."
        ),
    ),

    # ── Vision ───────────────────────────────────────────────────────────────
    "vision": SectionSpec(
        renderer="vision", layout="full_bleed", label="Vision",
        prompt="the single long-horizon idea, stated plainly and without hedging",
        model=VisionSection, caps={"proofPoints": 3},
        skeleton='{"headline": "the vision in one uncompromising sentence", "sub": "one line on why this matters now", "statement": "the \'we believe…\' conviction behind it", "horizon": "By 2030", "proofPoints": [{"k": "3.2x", "l": "the shift already underway"}, {"k": "$48B", "l": "value that relocates"}, {"k": "10 yrs", "l": "of infrastructure debt"}]}',
        rules=(
            "This slide carries one idea. The headline is a claim about the world, not a\n"
            "description of the product. proofPoints are the evidence the shift is already\n"
            "happening — each anchored to a real figure from the research."
        ),
    ),

    "values": SectionSpec(
        renderer="product", layout="cards", label="Operating Principles",
        prompt="the 3 principles that actually govern decisions here",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Principle", "d": "what it means in practice, and the tradeoff it forces", "tags": ["In practice"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules=(
            "A principle that nobody could disagree with ('we value quality') is not a\n"
            "principle. Each one must name the tradeoff it forces — what this company\n"
            "gives up in order to hold it."
        ),
    ),

    "pillars": SectionSpec(
        renderer="product", layout="cards", label="Strategic Pillars",
        prompt="the 3 bets the strategy rests on",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Pillar", "d": "the bet, and what has to be true for it to pay off", "tags": ["Bet"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules="Each pillar states the bet AND the condition that would falsify it.",
    ),

    # ── Go-to-market / business (Phase 3) ────────────────────────────────────
    # Every one of these reuses an existing model and renderer. That reuse is
    # why six new deck types need no new React code — see the module docstring.

    "positioning": SectionSpec(
        renderer="probsol", layout="two_column", label="Positioning",
        prompt="where this sits in the buyer's mind, against the alternative they would otherwise pick",
        model=ProbSolSection, caps={"problem": 3, "solution": 3},
        skeleton='{"headline": "...", "sub": "the category and who it is for", "problemTitle": "The alternative", "problemLead": "what buyers do instead today", "solutionTitle": "Our position", "solutionLead": "the one thing we are best at", "problem": [{"k": "Bold lead", "t": "a limitation of the status quo"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "solution": [{"k": "Bold lead", "t": "the claim we can defend"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "problemFoot": "who we are explicitly NOT for", "solutionFoot": "the proof behind the claim"}',
        rules=(
            "A position is a claim someone could disagree with. 'High quality' and\n"
            "'customer-focused' are not positions. Name the segment this is NOT for —\n"
            "a position that excludes nobody positions nothing."
        ),
    ),

    "messaging": SectionSpec(
        renderer="product", layout="cards", label="Messaging",
        prompt="the 3 messages that travel, each with the proof that makes it land",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Message", "d": "the claim in the buyer own words, and the proof behind it", "tags": ["Proof"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules="Each message pairs a claim with the evidence a sceptic would demand.",
    ),

    "segmentation": SectionSpec(
        renderer="competition", layout="cards", label="Customer Segments",
        prompt="the segments scored against the criteria that decide which to chase first",
        model=CompetitionSection, caps={"rows": 6, "cols": 4},
        skeleton='{"headline": "...", "cols": ["Beachhead segment", "Segment 2", "Segment 3", "Segment 4"], "rows": [{"f": "Urgency of pain", "v": [true, true, false, false]}, {"f": "Willingness to pay", "v": [true, false, true, false]}, {"f": "Ease of reach", "v": [true, false, false, false]}, {"f": "Low switching cost", "v": [true, true, false, false]}, {"f": "Reference value", "v": [true, false, true, false]}]}',
        rules=(
            "cols[0] is the beachhead — the segment being attacked first — and should\n"
            "win most rows. Rows are the criteria that actually decide sequencing."
        ),
    ),

    "acquisition": SectionSpec(
        renderer="product", layout="cards", label="Acquisition",
        prompt="the 3 motions that bring customers in, with their real economics",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Motion", "d": "how it works and what it costs to acquire through it", "tags": ["CAC", "Volume"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules="Name real motions (outbound, content, partner-led, PLG) — not 'marketing'.",
    ),

    "channels": SectionSpec(
        renderer="competition", layout="cards", label="Channels",
        prompt="channels scored on the dimensions that decide where to spend",
        model=CompetitionSection, caps={"rows": 6, "cols": 4},
        skeleton='{"headline": "...", "cols": ["Primary channel", "Channel 2", "Channel 3", "Channel 4"], "rows": [{"f": "Proven for us", "v": [true, false, false, false]}, {"f": "Scales with spend", "v": [true, true, false, false]}, {"f": "Low CAC", "v": [true, false, true, false]}, {"f": "Short payback", "v": [true, false, false, true]}, {"f": "Compounding", "v": [true, false, true, false]}]}',
        rules="cols[0] is the channel that actually works today, not the aspirational one.",
    ),

    "funnel": SectionSpec(
        renderer="roadmap", layout="timeline", label="Funnel",
        prompt="the conversion path stage by stage, with the real rate at each step",
        model=RoadmapSection, caps={"items": 4},
        skeleton='{"headline": "...", "sub": "Lead to MQL to SQL to Opportunity to Customer", "items": [{"q": "Lead → MQL", "t": "32%", "d": "what qualifies a lead, and where the rest drop"}, {"q": "MQL → SQL", "t": "44%", "d": "..."}, {"q": "SQL → Opp", "t": "51%", "d": "..."}, {"q": "Opp → Won", "t": "28%", "d": "..."}]}',
        rules=(
            "q is the stage transition, t is the conversion rate at that step.\n"
            "Use the founder's real rates where given; never invent a funnel that\n"
            "multiplies out to a number the business does not actually produce."
        ),
    ),

    "distribution": SectionSpec(
        renderer="product", layout="cards", label="Distribution",
        prompt="how the product reaches buyers — direct, partner, marketplace",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Route", "d": "who sells, who delivers, who owns the customer", "tags": ["Direct"]}, {"n": "02", "t": "...", "d": "...", "tags": ["Partner"]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules="Each route names who owns the customer relationship — that is the decision.",
    ),

    "unitEconomics": SectionSpec(
        renderer="traction", layout="big_number", label="Unit Economics",
        prompt="the per-customer maths — a payback curve plus the 4 numbers that matter",
        model=TractionSection, caps={"series": 8, "kpis": 4},
        skeleton='{"headline": "...", "sub": "Cumulative contribution per customer ($K)", "series": [{"y": "M3", "v": -2}, {"y": "M6", "v": 3}, {"y": "M12", "v": 11}, {"y": "M24", "v": 26}], "kpis": [{"k": "3.4x", "l": "LTV:CAC"}, {"k": "9 mo", "l": "CAC payback"}, {"k": "78%", "l": "Gross margin"}, {"k": "118%", "l": "Net revenue retention"}]}',
        rules=(
            "Use the founder's CAC/LTV/margin exactly where supplied and derive the\n"
            "rest from them. series[].v are NUMBERS and may start negative — the point\n"
            "of a payback curve is the crossing point. If no unit economics were\n"
            "provided, return kpis:[] rather than inventing a ratio."
        ),
    ),

    "scalePlan": SectionSpec(
        renderer="roadmap", layout="timeline", label="Scale Plan",
        prompt="how distribution scales over 4 dated phases — geography, hiring, channels",
        model=RoadmapSection, caps={"items": 4},
        skeleton='{"headline": "...", "sub": "...", "items": [{"q": "@Q1@", "t": "Phase", "d": "what expands, and the hire or channel it depends on"}, {"q": "@Q2@", "t": "...", "d": "..."}, {"q": "@Q3@", "t": "...", "d": "..."}, {"q": "@Q4@", "t": "...", "d": "..."}]}',
        rules="Each phase names the constraint it removes, not just the activity.",
    ),

    "salesMotion": SectionSpec(
        renderer="roadmap", layout="timeline", label="Sales Motion",
        prompt="the sales process end to end, with who does what at each stage",
        model=RoadmapSection, caps={"items": 4},
        skeleton='{"headline": "...", "sub": "Average cycle: N days", "items": [{"q": "Discovery", "t": "Who runs it", "d": "what has to be true to advance"}, {"q": "Evaluation", "t": "...", "d": "..."}, {"q": "Proposal", "t": "...", "d": "..."}, {"q": "Close", "t": "...", "d": "..."}]}',
        rules="Each stage names its exit criterion — the thing that must be true to advance.",
    ),

    "financials": SectionSpec(
        renderer="traction", layout="big_number", label="Financials",
        prompt="the financial shape — a 5-year revenue curve plus 4 headline figures",
        model=TractionSection, caps={"series": 8, "kpis": 4},
        skeleton='{"headline": "...", "sub": "Revenue ($M)", "series": [{"y": "FY@YEAR1@", "v": 1.0}, {"y": "FY@YEAR2@", "v": 1.16}, {"y": "FY@YEAR3@", "v": 1.35}, {"y": "FY@YEAR4@", "v": 1.57}, {"y": "FY@YEAR5@", "v": 1.82}], "kpis": [{"k": "$1.8M", "l": "FY@YEAR5@ revenue"}, {"k": "72%", "l": "Gross margin"}, {"k": "$180K", "l": "Monthly burn"}, {"k": "14 mo", "l": "Runway"}]}',
        rules=(
            "series[] covers 5 fiscal years (FY@YEAR1@..FY@YEAR5@), starting with the\n"
            "current year. Forecast figures follow from the founder's actual figures and\n"
            "stated growth rate — state the assumption in sub — UNLESS this deck type's\n"
            "guidance fixes a specific growth rate, in which case use that instead and\n"
            "still state it explicitly in sub. Never present a projection as though it\n"
            "were history; label future periods clearly.\n"
            "kpis[] = up to 4 headline figures. 'Monthly burn' and 'Runway' MUST come\n"
            "verbatim from this founder's own Monthly Burn / Runway figures above when\n"
            "given — ⛔ NEVER estimate, back-calculate, or invent either one. If the\n"
            "founder did not supply burn and/or runway, drop that tile entirely rather\n"
            "than guessing a number — replace it with another real figure (customers,\n"
            "gross margin, team size) so kpis[] still has up to 4 entries."
        ),
    ),

    "operations": SectionSpec(
        renderer="product", layout="cards", label="Operations",
        prompt="how the business actually runs — delivery, support, the engine behind it",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Function", "d": "how it works and what it costs to run", "tags": ["In-house"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules="Name what is in-house versus outsourced — that is the operational risk.",
    ),

    # ── Master deck additions ────────────────────────────────────────────────
    "story": SectionSpec(
        renderer="summary", layout="big_number", label="Our Story",
        prompt="why this company exists — the origin, in one paragraph and 4 markers",
        model=SummarySection, caps={"highlights": 4},
        skeleton='{"headline": "the insight the company was founded on", "lead": "2 sentences on where it came from and why these founders", "highlights": [{"k": "2023", "l": "Founded"}, {"k": "3", "l": "Founders"}, {"k": "12", "l": "Team"}, {"k": "2", "l": "Markets"}]}',
        rules="An origin story earns its slide only if it explains founder-market fit.",
    ),

    "techIp": SectionSpec(
        renderer="product", layout="cards", label="Technology & IP",
        prompt="the technical substance — architecture, and what is genuinely hard to copy",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Component", "d": "what it does and why it is hard to rebuild", "tags": ["Proprietary"]}, {"n": "02", "t": "...", "d": "...", "tags": ["..."]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules=(
            "Only claim patents, proprietary data or IP that the research or the\n"
            "founder actually evidenced. A fabricated patent is a diligence failure."
        ),
    ),

    "security": SectionSpec(
        renderer="product", layout="cards", label="Security & Compliance",
        prompt="the controls and certifications an enterprise buyer will ask about",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Area", "d": "the control, and its current status", "tags": ["In place"]}, {"n": "02", "t": "...", "d": "...", "tags": ["In progress"]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules=(
            "NEVER claim a certification (SOC 2, ISO 27001, HIPAA, GDPR) that was not\n"
            "evidenced — tag it 'In progress' or omit it. Claiming an audit you have\n"
            "not passed is the fastest way to lose an enterprise deal."
        ),
    ),

    "moat": SectionSpec(
        renderer="probsol", layout="two_column", label="Moat & Defensibility",
        prompt="what compounds in this company's favour, and what a rival would have to overcome",
        model=ProbSolSection, caps={"problem": 3, "solution": 3},
        skeleton='{"headline": "...", "sub": "why this gets harder to beat over time", "problemTitle": "What a rival faces", "problemLead": "the barrier in one bold line", "solutionTitle": "What compounds for us", "solutionLead": "the advantage that grows", "problem": [{"k": "Bold lead", "t": "a cost or delay any entrant must absorb"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "solution": [{"k": "Bold lead", "t": "an advantage that strengthens with scale"}, {"k": "...", "t": "..."}, {"k": "...", "t": "..."}], "problemFoot": "the moat we do not yet have", "solutionFoot": "what widens it fastest"}',
        rules=(
            "Features are not moats. Real ones: proprietary data, network effects,\n"
            "switching costs, regulatory position, distribution locks. Naming the moat\n"
            "the company lacks is a credibility gain, not a loss."
        ),
    ),

    "capTable": SectionSpec(
        renderer="ask", layout="cards", label="Cap Table",
        prompt="ownership split, totalling 100%",
        model=AskSection, caps={"use": 4},
        skeleton='{"headline": "Ownership", "sub": "fully diluted", "use": [{"l": "Founders", "p": 62}, {"l": "Investors", "p": 22}, {"l": "Option pool", "p": 12}, {"l": "Advisors", "p": 4}]}',
        rules=(
            "use[].p are percentages totalling 100. Use only ownership the founder\n"
            "actually supplied — an invented cap table is a legal misstatement.\n"
            "If none was given, return use:[]."
        ),
    ),

    "partnerships": SectionSpec(
        renderer="product", layout="cards", label="Partnerships",
        prompt="the partnerships that matter, and what each actually delivers",
        model=ProductSection, caps={"steps": 3},
        skeleton='{"headline": "...", "sub": "...", "steps": [{"n": "01", "t": "Partner", "d": "what the relationship delivers in practice", "tags": ["Signed"]}, {"n": "02", "t": "...", "d": "...", "tags": ["In pilot"]}, {"n": "03", "t": "...", "d": "...", "tags": ["..."]}]}',
        rules=(
            "Name only real, evidenced partners and tag their true status. An LOI is\n"
            "not a contract and a conversation is not a partnership."
        ),
    ),
}


# ─── Appendix evidence sections ───────────────────────────────────────────────
#
# The spec defines the Appendix as "the evidence layer for your entire system":
# the main deck says "TAM is $5B", the appendix shows the methodology, the
# assumptions, the source and the calculation. Each evidence section below is a
# *view onto an existing section's renderer* (so no new React or PPTX code) with
# a different job: show the workings, not the headline.
#
# `EVIDENCE_SECTIONS` is ordered — it is the A1..A20 order from the spec — and
# names the profile groups whose data justifies including the slide. A slide
# whose groups are all empty is dropped rather than rendered as filler; that is
# what "dynamically generated from the company's available data" means.

_EVIDENCE_RULES = (
    "APPENDIX OVERRIDE — where this conflicts with anything above (e.g. an instruction to\n"
    "estimate or to always fill a field), this wins.\n"
    "This is an APPENDIX slide: its job is to let a diligence reader check a claim made\n"
    "elsewhere in the deck. Show the workings — inputs, method, assumptions — not a pitch.\n"
    "State the source and the period for every figure in sub or the labels (e.g. \"Source:\n"
    "company ledger, FY25\"). Mark anything estimated or unverified as such. Use ONLY figures\n"
    "present in the provided company data or research; where the data does not support a\n"
    "field, leave it empty rather than estimating — an appendix with a gap is credible, an\n"
    "appendix with an invented number is a diligence failure."
)

# key → (base section to borrow model/renderer/skeleton from, label, prompt, profile groups)
EVIDENCE_SECTIONS: dict[str, tuple[str, str, str, tuple[str, ...]]] = {
    "evMarket": ("market", "A1 · Market Sizing Workings",
                 "TAM/SAM/SOM with the calculation: customer count × average spend, plus sources",
                 ("market_opportunity", "market_research")),
    "evCustomer": ("persona", "A2 · Customer Research",
                   "interviews, surveys and personas behind the customer claims, with sample sizes",
                   ("customer_research", "customer_icp")),
    "evCompetitive": ("competition", "A3 · Competitive Analysis",
                      "the detailed competitor matrix — named competitors, capabilities, pricing",
                      ("competition",)),
    "evProduct": ("product", "A4 · Product Details",
                  "the feature breakdown and core workflows, as built today",
                  ("product",)),
    "evArchitecture": ("techIp", "A5 · Technical Architecture",
                       "architecture, infrastructure and the AI/ML stack where relevant",
                       ("product_architecture", "technology_and_ip", "ai_ml_conditional")),
    "evSecurity": ("security", "A6 · Security & Compliance",
                   "security framework and certifications, each with its true status",
                   ("security_and_compliance", "compliance")),
    "evTraction": ("traction", "A7 · Traction Details",
                   "the revenue, customer and usage metrics behind the traction headline",
                   ("traction_and_validation", "customer_breakdown")),
    "evCohort": ("traction", "A8 · Cohorts & Retention",
                 "cohort retention and expansion data",
                 ("cohort_and_retention_data", "customer_retention_and_expansion")),
    "evUnitEconomics": ("unitEconomics", "A9 · Unit Economics",
                        "the CAC, LTV, payback and margin calculations, with inputs shown",
                        ("unit_economics",)),
    "evFunnel": ("funnel", "A10 · Sales Funnel",
                 "funnel stages, conversion rates and pipeline",
                 ("sales_funnel", "sales_process", "sales")),
    "evChannels": ("channels", "A11 · GTM Performance",
                   "channel-level acquisition data — spend, volume, cost per acquisition",
                   ("marketing_channels", "acquisition_strategy", "go_to_market")),
    "evFinancials": ("financials", "A12 · Financial Statements",
                     "P&L, balance sheet and cash-flow headline figures, with the reporting period",
                     ("financial_statements", "financials")),
    "evForecast": ("financials", "A13 · Financial Forecast",
                   "the forecast and the assumptions it rests on — projections labelled as such",
                   ("financial_forecast",)),
    "evFundraising": ("ask", "A14 · Fundraising",
                      "financing history and the current round",
                      ("fundraising",)),
    "evCapTable": ("capTable", "A15 · Cap Table",
                   "ownership and dilution",
                   ("cap_table_and_ownership",)),
    "evLegal": ("security", "A16 · Legal & IP",
                "corporate structure, IP and material contracts, each with its status",
                ("legal_and_corporate",)),
    "evCustomerProof": ("proof", "A17 · Customer Proof",
                        "testimonials and case studies that can be verified",
                        ("evidence_and_diligence",)),
    "evPartnerships": ("partnerships", "A18 · Partnerships",
                       "partner details and the true status of each relationship",
                       ("partnerships_and_ecosystem",)),
    "evRoadmap": ("roadmap", "A19 · Detailed Roadmap",
                  "the detailed roadmap and milestone dependencies",
                  ("roadmap_and_milestones",)),
    "evSources": ("product", "A20 · Sources & Evidence",
                  "the register of sources, documents and verification status behind the deck's claims",
                  ("evidence_metadata", "evidence_and_diligence")),
}

#: Shown when the company has no profile to judge "available data" from. Every
#: company can account for these, so the Appendix is never an empty shell.
DEFAULT_EVIDENCE_SECTIONS: tuple[str, ...] = (
    "evMarket", "evCompetitive", "evProduct", "evTraction", "evRoadmap", "evSources",
)


def _register_evidence_sections() -> None:
    from dataclasses import replace
    for key, (base, label, prompt, _groups) in EVIDENCE_SECTIONS.items():
        b = SECTION_SPECS[base]
        SECTION_SPECS[key] = replace(
            b, label=label, prompt=prompt,
            rules=(b.rules + "\n" if b.rules else "") + _EVIDENCE_RULES,
        )


_register_evidence_sections()


# Top-level identity keys, passed through validation untouched.
PASSTHROUGH_KEYS = ("company", "mark", "tagline", "eyebrow", "year", "round", "theme_suggestion")
