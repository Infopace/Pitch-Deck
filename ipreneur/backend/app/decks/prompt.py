"""
Generation-prompt assembly.

The slide plan, the per-section rules, the `template_data` skeleton and the
`slides[]` skeleton were all hand-written literals inside
`master_agent._build_generation_prompt`. They are now built here from the
resolved section list, so a deck type's shape is stated once (in `registry.py`)
instead of being retyped per type.

Everything these functions return is plain text destined for a single `{}` slot
in the prompt's f-string, so the JSON braces inside need no escaping.
"""
import re
from datetime import date
from typing import Optional, Sequence

from app.core.money import Currency, short_inr
from app.decks.registry import (
    DeckType,
    format_guidance,
    get_deck_type,
    stage_emphasis,
)
from app.decks.sections import SECTION_SPECS

# Layouts the legacy slides[] renderer knows how to dispatch on.
_LEGACY_LAYOUTS = {"full_bleed", "big_number", "cards", "two_column", "market_sizing", "timeline", "title_bullets"}

# Every section skeleton below was written with illustrative $ amounts — fine
# as a JSON *shape* example, but a model shown "$2.4M" right next to an
# instruction to write ARR in ₹ reliably copies the example's currency over
# the instruction. This rewrites those examples to a plausible ₹ figure (a
# notional USD→INR rate — illustrative only, never a real conversion) so the
# few-shot format agrees with CURRENCY_GUIDANCE instead of contradicting it.
_SKELETON_USD_RE = re.compile(r'\$([\d][\d,]*(?:\.\d+)?)\s*([KMB])?\b')
_USD_UNIT_MULT = {"K": 1e3, "M": 1e6, "B": 1e9, None: 1}
_NOTIONAL_USD_TO_INR = 83


def _localize_skeleton_money(text: str, currency: Currency) -> str:
    if currency != "INR":
        return text

    def _convert(m: "re.Match[str]") -> str:
        amount = float(m.group(1).replace(",", "")) * _USD_UNIT_MULT[m.group(2)]
        return short_inr(amount * _NOTIONAL_USD_TO_INR)

    text = text.replace('"Raising $XM Series A"', '"Raising ₹XX Cr Series A"')
    text = text.replace("($M)", "(₹ Cr)").replace("($K)", "(₹ L)")
    return _SKELETON_USD_RE.sub(_convert, text)


def upcoming_quarters(today: Optional[date] = None, n: int = 4) -> list[str]:
    """`n` quarter labels starting with the quarter we are in, e.g. "Q4 2026".

    The roadmap slides show these verbatim, so they have to come from the real
    calendar. The model has no clock: left to itself it picks the year its
    training data feels like "now", which put a 2026 roadmap on 2025 quarters.
    """
    today = today or date.today()
    q = (today.month - 1) // 3          # 0-3
    year = today.year
    labels = []
    for _ in range(n):
        labels.append(f"Q{q + 1} {year}")
        q += 1
        if q == 4:
            q, year = 0, year + 1
    return labels


def resolve_dates(text: str, today: Optional[date] = None) -> str:
    """Fill the date markers used in section skeletons and rules.

    @Q1@..@Q4@ become plain "Q1".."Q4": roadmap phases are labelled by quarter
    only, with no year, so a label can never disagree with the calendar.
    @YEAR@ is the current calendar year, for the few places that need one.
    """
    today = today or date.today()
    out = text.replace("@YEAR@", str(today.year))
    for n in range(1, 5):
        out = out.replace(f"@Q{n}@", f"Q{n}")
    return out


def build_date_context(today: Optional[date] = None) -> str:
    """One block telling the model what 'now' is, and how to date things."""
    today = today or date.today()
    return (
        f"TODAY'S DATE: {today.strftime('%d %B %Y').lstrip('0')}.\n"
        "DATING RULES: Roadmap and plan phases are labelled by quarter only — \"Q1\", \"Q2\",\n"
        "\"Q3\", \"Q4\" — never with a year. Events that already happened (founding, launches,\n"
        "funding, traction history) must be dated at or before today, never after."
    )


def build_type_header(
    deck_type: Optional[str],
    *,
    stage: Optional[str] = None,
    deck_format: Optional[str] = None,
) -> str:
    """Audience, goal, per-type guidance, plus stage and format modifiers."""
    dt: DeckType = get_deck_type(deck_type)
    parts = [
        build_date_context(),
        f"DECK TYPE: {dt.label}",
        f"AUDIENCE: {dt.audience}",
        f"GOAL: {dt.goal}",
    ]
    if dt.guidance:
        parts.append("\nHOW THIS TYPE MUST BE WRITTEN:\n" + dt.guidance)

    emphasis = stage_emphasis(stage) if dt.key == "investor" else ""
    if emphasis:
        parts.append("\n" + emphasis)

    parts.append("\n" + format_guidance(deck_format))
    return "\n".join(parts)


def build_slide_plan(sections: Sequence[str]) -> str:
    """The numbered slide list: position, title, layout tag, one-line brief."""
    lines = []
    for i, key in enumerate(sections, start=1):
        spec = SECTION_SPECS.get(key)
        if not spec:
            continue
        layout = spec.layout if spec.layout in _LEGACY_LAYOUTS else "title_bullets"
        lines.append(f"  Slide {i:>2}: {spec.label:<26} [{layout}] — {spec.prompt}")
    return "\n".join(lines)


def build_section_rules(sections: Sequence[str]) -> str:
    """The detailed rules blocks, for the sections that have them."""
    blocks = []
    for i, key in enumerate(sections, start=1):
        spec = SECTION_SPECS.get(key)
        if not spec or not spec.rules:
            continue
        blocks.append(f"  Slide {i} ({spec.label}) — template_data.{key}:\n" +
                      "\n".join(f"    {line}" for line in resolve_dates(spec.rules).splitlines()))
    return "\n\n".join(blocks)


def build_template_skeleton(sections: Sequence[str], currency: Currency = "USD") -> str:
    """The `template_data` object the model must return, for these sections only."""
    lines = ['    "company": "Company name",',
             '    "mark": "1-2 letter monogram",',
             '    "tagline": "one-line value proposition",',
             '    "eyebrow": "<the deck-type eyebrow given above>",',
             f'    "year": "{date.today().year}",',
             '    "round": "context line under the company name on the cover",',
             '    "theme_suggestion": "one of: meridian, onyx, abyss, nocturne, forest, verdant, indigo, editorial, terra, slate",']
    entries = []
    for key in sections:
        spec = SECTION_SPECS.get(key)
        if not spec or not spec.model or not spec.skeleton:
            continue
        skeleton = _localize_skeleton_money(resolve_dates(spec.skeleton), currency)
        entries.append(f'    "{key}": {skeleton}')
    return "{\n" + "\n".join(lines) + "\n" + ",\n".join(entries) + "\n  }"


def build_slides_skeleton(sections: Sequence[str]) -> str:
    """Two representative `slides[]` entries plus the ordering contract.

    The full array is one object per slide in the plan, in that exact order —
    spelling out all of them would triple the prompt for no extra signal.
    """
    if not sections:
        return "[]"
    first = SECTION_SPECS.get(sections[0])
    second = next((SECTION_SPECS.get(k) for k in sections[1:] if SECTION_SPECS.get(k)), None)

    def _entry(spec, slide_type: str) -> str:
        layout = spec.layout if spec.layout in _LEGACY_LAYOUTS else "title_bullets"
        return (
            '    {\n'
            f'      "slide_type": "{slide_type}",\n'
            f'      "layout": "{layout}",\n'
            '      "title": "...", "subtitle": "...", "body": "...",\n'
            '      "bullet_points": [], "data_points": [], "cards": [], "columns": [],\n'
            '      "speaker_notes": "..."\n'
            '    }'
        )

    parts = [_entry(first, sections[0])]
    if second:
        parts.append(_entry(second, sections[1]))
    return "[\n" + ",\n".join(parts) + f"\n    ... one object per slide in the plan above, {len(sections)} in total, in that exact order\n  ]"


def build_generation_sections(
    deck_type: Optional[str],
    sections: Sequence[str],
    *,
    stage: Optional[str] = None,
    deck_format: Optional[str] = None,
    currency: Currency = "USD",
) -> dict[str, str]:
    """Every deck-type-dependent block the generation prompt needs."""
    dt = get_deck_type(deck_type)
    return {
        "type_header": build_type_header(deck_type, stage=stage, deck_format=deck_format),
        "slide_plan": build_slide_plan(sections),
        "section_rules": build_section_rules(sections),
        "template_skeleton": build_template_skeleton(sections, currency),
        "slides_skeleton": build_slides_skeleton(sections),
        "slide_count": str(len(sections)),
        "eyebrow": dt.eyebrow,
        "label": dt.label,
    }
