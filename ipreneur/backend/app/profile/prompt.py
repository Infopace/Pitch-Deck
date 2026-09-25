"""Render a company profile as generation-prompt ground truth.

Replaces `CompanyIntake.to_prompt_section()` for projects that have a profile.
Two things it does that the old block could not:

  1. Emits only the groups this deck type actually consumes, so a Sales deck's
     prompt is not padded with cap-table rows the model must then ignore. On a
     924-parameter catalogue this is the difference between a usable prompt and
     one that blows the token budget.
  2. Tags every figure with its provenance, so the model can attribute a claim
     ("per RedSeer 2024") instead of stating everything in the same flat voice —
     and so the Appendix deck has something to render.
"""
from typing import Optional, Sequence

from app.profile.parameters import PARAMETER_GROUPS, PARAMETERS
from app.profile.relevance import param_relevance, relevance_for
from app.profile.values import ProfileValues, derive

#: Provenance shown to the model. "founder" is deliberately unlabelled — it is
#: the default authority and tagging it adds noise to every single line.
_SOURCE_NOTE = {
    "crawl": "from their website",
    "research": "third-party research",
    "derived": "computed",
}


def _fmt(name: str, pv) -> str:
    p = PARAMETERS.get(name)
    label = p.label if p else name.replace("_", " ").title()
    val = pv.value

    if isinstance(val, (list, tuple)):
        val = ", ".join(str(v) for v in val if str(v).strip())
    elif isinstance(val, dict):
        val = "; ".join(f"{k}: {v}" for k, v in val.items())
    val = str(val).strip()
    if not val:
        return ""

    if p and p.type == "currency" and not val.startswith("$"):
        try:
            val = f"${float(str(val).replace(',', '')):,.0f}"
        except (TypeError, ValueError):
            pass
    elif p and p.type == "percent" and not val.endswith("%"):
        val = f"{val}%"
    elif p and p.unit and p.unit not in ("USD", "%"):
        val = f"{val} {p.unit}"

    notes = []
    note = _SOURCE_NOTE.get(pv.source)
    if note:
        notes.append(note)
    if pv.method:
        notes.append(pv.method)
    if pv.source_url:
        notes.append(pv.source_url)
    if pv.as_of and pv.source != "founder":
        notes.append(f"as of {pv.as_of}")
    suffix = f"  [{' · '.join(notes)}]" if notes else ""
    return f"  {label}: {val}{suffix}"


def render_profile_for_deck(
    values: ProfileValues,
    deck_type: Optional[str],
    *,
    stage: Optional[str] = None,
    include: Sequence[str] = ("R", "C", "O"),
    max_chars: int = 14000,
) -> str:
    """The COMPANY PROFILE block for the generation prompt.

    Groups are emitted in catalogue order, Required first so that if the cap
    truncates anything it is the optional tail — never the facts the deck is
    built on.
    """
    if not values:
        return ""
    values = derive(ProfileValues(values))

    ranked: list[tuple[int, str, list[str]]] = []
    for key, group in PARAMETER_GROUPS.items():
        rel = relevance_for(deck_type, key, stage=stage)
        if rel not in include:
            continue
        lines = []
        for p in group.params:
            pv = values.get(p.name)
            if pv is None or pv.is_empty:
                continue
            if param_relevance(deck_type, p.name, stage=stage) == "N":
                continue
            line = _fmt(p.name, pv)
            if line:
                lines.append(line)
        if lines:
            ranked.append(({"R": 0, "C": 1, "O": 2}.get(rel, 3), group.label, lines))

    if not ranked:
        return ""
    ranked.sort(key=lambda t: t[0])

    out = ["COMPANY PROFILE (founder-confirmed unless tagged otherwise — "
           "treat as ground truth and never contradict it):"]
    used = len(out[0])
    for _, label, lines in ranked:
        block = [f"\n{label}:"] + lines
        size = sum(len(x) + 1 for x in block)
        if used + size > max_chars:
            out.append("\n[further profile detail omitted for length]")
            break
        out.extend(block)
        used += size
    return "\n".join(out)


def profile_gaps_note(missing: Sequence[str]) -> str:
    """Tell the model what is genuinely unknown, so it does not invent it.

    Silence about a gap is what produces a confident fabricated metric; naming
    the gap produces an honest omission instead.
    """
    if not missing:
        return ""
    labels = [PARAMETERS[m].label for m in missing if m in PARAMETERS][:24]
    if not labels:
        return ""
    return ("\nNOT PROVIDED — the founder did not supply these. Do NOT invent "
            "them; omit the point or say it is not yet available:\n  "
            + ", ".join(labels))
