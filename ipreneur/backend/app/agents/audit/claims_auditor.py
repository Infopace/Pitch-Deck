"""Claims auditor — checks a generated deck against the facts it was given.

The generation model is told never to invent numbers, but a prompt is a request,
not a guarantee. This is the second line: a deterministic pass over the finished
`template_data` that catches the failures investors and diligence teams actually
catch — figures that disagree with each other or with the founder's inputs,
percentages that don't total 100, a market funnel that points the wrong way,
certifications nobody evidenced, and placeholder text that survived generation.

Deterministic on purpose. An LLM critic can be layered on top later, but these
checks are cheap, reproducible, and never themselves hallucinate.

Findings are advisory: the audit is attached to the deck for the UI to surface,
and never blocks or rewrites it. A founder decides what to do about a flag.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Iterable, Literal, Optional

from app.core.money import currency_of, format_money

Severity = Literal["error", "warning", "info"]

_MULT = {
    "k": 1e3, "m": 1e6, "mm": 1e6, "b": 1e9, "bn": 1e9, "t": 1e12,
    # Indian units, as the generation prompt is told to write them.
    "l": 1e5, "lac": 1e5, "lakh": 1e5, "lakhs": 1e5,
    "cr": 1e7, "crore": 1e7, "crores": 1e7,
}


@dataclass
class Finding:
    severity: Severity
    section: str
    message: str

    def to_dict(self) -> dict:
        return asdict(self)


def parse_money(text: Any) -> Optional[float]:
    """"$48B" -> 4.8e10, "2.4M" -> 2.4e6, "$1,500" -> 1500. None if no number."""
    if isinstance(text, (int, float)):
        return float(text)
    if not isinstance(text, str):
        return None
    cleaned = text.replace("$", "").replace("₹", "").replace(",", "")
    m = re.search(r"([-+]?\d+\.?\d*)\s*(crores?|lakhs?|lac|bn|mm|cr|[kmbtl])?\b", cleaned, re.IGNORECASE)
    if not m:
        return None
    try:
        n = float(m.group(1).replace(",", ""))
    except ValueError:
        return None
    return n * _MULT.get((m.group(2) or "").lower(), 1)


_PLACEHOLDERS = (
    re.compile(r"^\.{3}$"), re.compile(r"\blorem ipsum\b", re.I),
    re.compile(r"\bTBD\b"), re.compile(r"\bBold lead\b"),
    re.compile(r"\bCompetitor \d\b"), re.compile(r"\bnot (publicly )?disclosed\b", re.I),
    re.compile(r"\binsert\b.*\bhere\b", re.I), re.compile(r"\[(company|name|x+)\]", re.I),
)

_CERTS = re.compile(r"\b(SOC ?2|ISO ?27001|HIPAA|GDPR|PCI[- ]?DSS|FedRAMP)\b", re.I)
_HEDGES = re.compile(r"in progress|planned|pending|roadmap|working toward|aligned|ready", re.I)
_NO_COMPETITION = re.compile(r"\b(no|zero|without any)\s+(direct\s+)?(competit(or|ion|ors)|competing)", re.I)
_PERIOD = re.compile(r"yoy|mom|qoq|year|month|quarter|\bq[1-4]\b|vs\.?|from", re.I)
_REVENUE_LABEL = re.compile(r"\b(ARR|MRR|revenue)\b", re.I)


def _walk(node: Any, path: str = "") -> Iterable[tuple[str, str]]:
    """Every string leaf in a section, with its dotted path."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from _walk(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from _walk(v, f"{path}[{i}]")


def _pct_total(items: list) -> Optional[float]:
    vals = []
    for it in items or []:
        p = it.get("p") if isinstance(it, dict) else None
        if isinstance(p, (int, float)):
            vals.append(float(p))
    return sum(vals) if vals else None


def audit_deck(
    template_data: dict,
    sections: Iterable[str],
    *,
    user_inputs: Optional[dict] = None,
    stage: Optional[str] = None,
) -> dict:
    """Audit one generated deck. Returns `{score, counts, findings}`.

    `score` is 0-100: 100 minus 15 per error, 5 per warning. It is a triage aid
    for ordering what to look at, not a measure of deck quality.
    """
    td = template_data or {}
    u = user_inputs or {}
    findings: list[Finding] = []

    def add(sev: Severity, sec: str, msg: str) -> None:
        findings.append(Finding(sev, sec, msg))

    present = [s for s in sections if s != "cover"]

    # 1. Empty slides — a section in the sequence the model returned nothing for.
    for key in present:
        if key == "closing":
            continue
        if not td.get(key):
            add("warning", key, "This slide has no content - it will render blank.")

    # 2. Placeholder / template text that survived generation.
    for key in present:
        for path, text in _walk(td.get(key)):
            if text.strip() and any(p.search(text) for p in _PLACEHOLDERS):
                add("warning", key, f"Placeholder text left in {path}: \"{text[:60]}\".")
                break

    # 3. Percent splits must total 100 (use of funds, cap table).
    for key in ("ask", "capTable", "evFundraising", "evCapTable"):
        sec = td.get(key)
        if not isinstance(sec, dict):
            continue
        total = _pct_total(sec.get("use"))
        if total is not None and abs(total - 100) > 1:
            add("error", key, f"Percentages total {total:g}%, not 100%.")

    # 4. The market funnel must narrow: TAM >= SAM >= SOM.
    for key in ("market", "evMarket"):
        m = td.get(key)
        if not isinstance(m, dict):
            continue
        tam, sam, som = (parse_money((m.get(k) or {}).get("v")) for k in ("tam", "sam", "som"))
        if tam and sam and sam > tam:
            add("error", key, "SAM is larger than TAM - the market funnel points the wrong way.")
        if sam and som and som > sam:
            add("error", key, "SOM is larger than SAM - the market funnel points the wrong way.")
        if tam and som and not (sam and som > sam) and som > tam:
            add("error", key, "SOM is larger than TAM.")

    # 5. Revenue figures must match what the founder supplied.
    currency = currency_of(u)
    founder_arr = u.get("arr_usd") or (u.get("mrr_usd") * 12 if u.get("mrr_usd") else None)
    for key in ("traction", "summary", "financials", "evTraction"):
        sec = td.get(key)
        if not isinstance(sec, dict):
            continue
        tiles = (sec.get("kpis") or []) + (sec.get("highlights") or [])
        for t in tiles:
            if not isinstance(t, dict):
                continue
            label, val = str(t.get("l", "")), parse_money(t.get("k"))
            if not _REVENUE_LABEL.search(label) or val is None:
                continue
            if "ARR" in label.upper() and founder_arr:
                if abs(val - founder_arr) / founder_arr > 0.05:
                    add("error", key,
                        f"ARR shown as {t.get('k')} but the founder supplied "
                        f"{format_money(founder_arr, currency)} - the deck must use the founder's figure.")
            elif not founder_arr and val > 0:
                add("error", key,
                    f"{label} {t.get('k')} appears in the deck but no revenue figure was "
                    "provided - this looks invented.")

    # 6. Pre-revenue companies shouldn't present a revenue story.
    if stage in ("idea", "pre_revenue") and td.get("traction"):
        add("warning", "traction",
            f"Stage is {stage} but the deck includes a traction slide; use validation "
            "signals (pilots, waitlist, LOIs) instead of a growth curve.")

    # 7. Certifications claimed without evidence or a hedge.
    evidence = " ".join(str(v) for v in u.values() if isinstance(v, (str, list))).upper().replace(" ", "")
    for key in ("security", "evSecurity", "techIp", "evLegal"):
        for path, text in _walk(td.get(key)):
            for cert in {c.upper().replace(" ", "") for c in _CERTS.findall(text)}:
                if cert in evidence or _HEDGES.search(text):
                    continue
                add("warning", key,
                    f"Mentions {cert} without it appearing in the company data - verify it "
                    "is held, or mark it \"In progress\".")

    # 8. Competition table sanity.
    for key in ("competition", "evCompetitive"):
        comp = td.get(key)
        if not isinstance(comp, dict):
            continue
        if len(comp.get("cols") or []) < 3:
            add("warning", key, "Fewer than two named competitors are compared.")
        rows = [r for r in (comp.get("rows") or []) if isinstance(r, dict)]
        if len(rows) >= 4 and all(r.get("v", [False])[:1] == [True] and not any(r.get("v", [])[1:])
                                  for r in rows):
            add("info", key, "This company wins every row and every competitor wins none - "
                             "investors read that as an unfair comparison.")

    # 9. Roadmap quarters must be labelled, not blank.
    for key in ("roadmap", "scalePlan", "evRoadmap"):
        sec = td.get(key)
        if isinstance(sec, dict):
            for it in sec.get("items") or []:
                if isinstance(it, dict) and not str(it.get("q", "")).strip():
                    add("warning", key, "A roadmap item has no quarter label.")
                    break

    # 10. Red flags investors name most often (research-backed, advisory only).
    for key in present:
        for path, text in _walk(td.get(key)):
            if _NO_COMPETITION.search(text):
                add("warning", key, "Claims there is no competition - investors treat this as a "
                                    "credibility red flag. Name the alternatives, including the status quo.")
                break
    for key in ("traction", "summary", "evTraction"):
        sec = td.get(key)
        if not isinstance(sec, dict):
            continue
        for t in (sec.get("kpis") or []) + (sec.get("highlights") or []):
            if not isinstance(t, dict):
                continue
            k, l = str(t.get("k", "")), str(t.get("l", ""))
            if re.fullmatch(r"[+]?\d[\d,]*%", k.strip()) and re.search(r"growth", l, re.I)                     and not _PERIOD.search(l):
                add("info", key, f"\"{k} {l}\" has no period or baseline - growth without a "
                                 "base ('from 10 to 30 users') tells an investor nothing.")

    # 11. Unit-economics benchmarks (what a Series A reader tests against).
    for key in ("unitEconomics", "evUnitEconomics"):
        sec = td.get(key)
        if not isinstance(sec, dict):
            continue
        for t in sec.get("kpis") or []:
            if not isinstance(t, dict):
                continue
            label, k = str(t.get("l", "")), str(t.get("k", ""))
            n = parse_money(k)
            if n is None:
                continue
            if re.search(r"LTV", label, re.I) and re.search(r"CAC", label, re.I) and n < 3:
                add("info", key, f"LTV:CAC of {k} is under the 3:1 level most investors expect "
                                 "- explain the path to it rather than hiding it.")
            if re.search(r"payback", label, re.I) and re.search(r"mo", k, re.I) and n > 18:
                add("info", key, f"CAC payback of {k} is beyond the 12-18 months most "
                                 "investors treat as healthy.")

    counts = {s: sum(1 for f in findings if f.severity == s) for s in ("error", "warning", "info")}
    score = max(0, 100 - 15 * counts["error"] - 5 * counts["warning"])
    return {"score": score, "counts": counts, "findings": [f.to_dict() for f in findings]}
