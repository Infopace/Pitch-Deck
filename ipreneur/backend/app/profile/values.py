"""Profile values — and the provenance that makes the evidence layer possible.

A profile value is never a bare scalar. Every fact carries where it came from,
how it was arrived at and how much to trust it, because the spec's Appendix deck
is defined as the traceability layer behind every generated claim:

    Investor deck says:  "TAM is $5B."
    Appendix contains:   TAM methodology, assumptions, customer count,
                         average spend, source, calculation.

That is only possible if provenance is captured at input time. Storing
`{"tam": "5000000000"}` throws it away permanently; storing a ParameterValue
keeps it.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from app.profile.parameters import PARAMETERS, PARAMETER_GROUPS
from app.profile.relevance import param_relevance, relevance_for

#: founder  — typed or confirmed by a human; the highest authority there is
#: crawl    — read off the company's own website
#: research — found by the research pass (third-party sources)
#: derived  — computed from other values; never asked for
Source = Literal["founder", "crawl", "research", "derived"]

SOURCE_TRUST: dict[str, float] = {
    "founder": 1.0, "crawl": 0.75, "research": 0.6, "derived": 0.9,
}


@dataclass
class ParameterValue:
    value: Any
    source: Source = "founder"
    source_url: str = ""
    method: str = ""            # "bottom-up: 240K firms x $21K ACV"
    confidence: float = 1.0     # 0..1
    as_of: str = ""             # ISO date the figure describes

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v not in ("", None)}

    @classmethod
    def parse(cls, raw: Any) -> "ParameterValue":
        """Accept either a full record or a bare scalar.

        Bare scalars appear in data written before profiles existed (and in
        hand-seeded fixtures); treating them as founder-provided keeps the old
        `branding_data` path working unchanged.
        """
        if isinstance(raw, dict) and "value" in raw:
            src = raw.get("source", "founder")
            return cls(
                value=raw.get("value"),
                source=src if src in SOURCE_TRUST else "founder",
                source_url=raw.get("source_url", "") or "",
                method=raw.get("method", "") or "",
                confidence=float(raw.get("confidence", SOURCE_TRUST.get(src, 1.0))),
                as_of=raw.get("as_of", "") or "",
            )
        return cls(value=raw, source="founder", confidence=1.0)

    @property
    def is_empty(self) -> bool:
        v = self.value
        if v is None:
            return True
        if isinstance(v, str):
            return not v.strip()
        if isinstance(v, (list, tuple, dict)):
            return len(v) == 0
        return False


class ProfileValues(dict):
    """`{parameter name: ParameterValue}` — the shape of `company_profiles.values`."""

    @classmethod
    def load(cls, raw: Optional[dict]) -> "ProfileValues":
        out = cls()
        for name, rec in (raw or {}).items():
            if name in PARAMETERS:
                pv = ParameterValue.parse(rec)
                if not pv.is_empty:
                    out[name] = pv
        return out

    def dump(self) -> dict:
        return {name: pv.to_dict() for name, pv in self.items()}

    def merge(self, incoming: dict, *, source: Source = "founder") -> "ProfileValues":
        """Apply a partial update, newest wins.

        A founder-confirmed value is never silently overwritten by a later crawl
        or research pass — that is the whole point of "confirm, don't type". The
        founder can still change it by sending another founder-sourced write.
        """
        for name, rec in (incoming or {}).items():
            if name not in PARAMETERS:
                continue
            pv = ParameterValue.parse(rec)
            if not isinstance(rec, dict) or "source" not in rec:
                pv.source = source
                pv.confidence = SOURCE_TRUST.get(source, 1.0)
            existing = self.get(name)
            if (existing is not None
                    and existing.source == "founder"
                    and pv.source != "founder"):
                continue
            if pv.is_empty:
                self.pop(name, None)
            else:
                pv.as_of = pv.as_of or datetime.now(timezone.utc).date().isoformat()
                self[name] = pv
        return self

    def scalar(self, name: str, default: Any = None) -> Any:
        pv = self.get(name)
        return default if pv is None else pv.value


# ── Derived parameters (relevance "A" — computed, never asked) ────────────────

def _num(values: ProfileValues, name: str) -> Optional[float]:
    raw = values.scalar(name)
    if raw is None or raw == "":
        return None
    try:
        return float(str(raw).replace(",", "").replace("$", "").replace("%", ""))
    except (TypeError, ValueError):
        return None


def derive(values: ProfileValues) -> ProfileValues:
    """Fill in the parameters the app computes rather than asks for.

    Mirrors the LTV:CAC derivation that already existed inline in
    `schemas/intake.py`, generalised so every deck type benefits.
    """
    cac, ltv = _num(values, "cac"), _num(values, "ltv")
    if cac and ltv and "ltv_cac" not in values:
        values["ltv_cac"] = ParameterValue(
            value=round(ltv / cac, 1), source="derived",
            method="LTV ÷ CAC", confidence=SOURCE_TRUST["derived"],
        )

    mrr, arr = _num(values, "mrr"), _num(values, "arr")
    if mrr and not arr and "arr" in PARAMETERS:
        values["arr"] = ParameterValue(
            value=round(mrr * 12), source="derived",
            method="MRR × 12", confidence=SOURCE_TRUST["derived"],
        )

    cash, burn = _num(values, "cash_balance"), _num(values, "monthly_burn")
    if cash and burn and burn > 0 and "runway" not in values:
        values["runway"] = ParameterValue(
            value=round(cash / burn), source="derived",
            method="cash balance ÷ monthly burn", confidence=SOURCE_TRUST["derived"],
        )
    return values


# ── Completeness ──────────────────────────────────────────────────────────────

@dataclass
class GroupCompleteness:
    key: str
    label: str
    relevance: str
    filled: int = 0
    total: int = 0
    required_filled: int = 0
    required_total: int = 0
    missing_required: list[str] = field(default_factory=list)

    @property
    def pct(self) -> int:
        return round(100 * self.filled / self.total) if self.total else 0


def completeness(
    values: ProfileValues,
    deck_type: Optional[str] = None,
    *,
    stage: Optional[str] = None,
) -> list[GroupCompleteness]:
    """Per-group fill state for one deck type — drives the UI's progress rings
    and the "what's still missing" gate on the new-project form."""
    out: list[GroupCompleteness] = []
    for key, group in PARAMETER_GROUPS.items():
        rel = relevance_for(deck_type, key, stage=stage)
        if deck_type and rel == "N":
            continue
        gc = GroupCompleteness(key=key, label=group.label, relevance=rel)
        for p in group.params:
            prel = param_relevance(deck_type, p.name, stage=stage)
            if prel == "A":
                continue                      # derived — never counts as a gap
            gc.total += 1
            has = p.name in values
            gc.filled += int(has)
            if prel == "R":
                gc.required_total += 1
                gc.required_filled += int(has)
                if not has:
                    gc.missing_required.append(p.name)
        out.append(gc)
    return out


def missing_required(
    values: ProfileValues,
    deck_type: Optional[str],
    *,
    stage: Optional[str] = None,
) -> list[str]:
    """Every required parameter this deck still lacks."""
    return [n for gc in completeness(values, deck_type, stage=stage)
            for n in gc.missing_required]
