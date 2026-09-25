"""Generate `backend/app/profile/parameters.py` from `Pitch Deck Parameters.docx`.

The spec defines ~470 parameters across 28 master groups, plus GTM- and
Appendix-only groups. Hand-transcribing that many rows is error-prone and
impossible to re-check against the source, so the catalogue is generated and
this script is the audit trail: re-run it after the doc changes and diff.

    python scripts/gen_parameters.py            # writes the module
    python scripts/gen_parameters.py --dry-run  # print a summary only

Field types are inferred from each row's label and its "Data" description
(the doc has no type column). The inference is deliberately conservative —
anything it can't classify becomes `text`, which is always safe to render.
Hand-corrections belong in OVERRIDES below, not in the generated file, so they
survive the next regeneration.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(os.path.dirname(ROOT), "Pitch Deck Parameters.docx")
OUT = os.path.join(ROOT, "backend", "app", "profile", "parameters.py")

# Deck sections of the doc we harvest groups from, in priority order. Master is
# the superset; GTM and Appendix contribute the groups unique to them.
HARVEST = ["EXTENDED / MASTER DECK", "Go-to-Market DECK", "APPENDIX DECK"]


# ── docx → lines ──────────────────────────────────────────────────────────────

def docx_lines(path: str) -> list[str]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    out = []
    for para in re.findall(r"<w:p[ >].*?</w:p>|<w:p/>", xml, re.S):
        text = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", para, re.S))
        for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                     ("&quot;", '"'), ("&apos;", "'")):
            text = text.replace(a, b)
        text = text.strip()
        if text:
            out.append(text)
    return out


# Each deck's last table is followed by a "… — Core Data Architecture" heading
# and a bullet list of group names. Without an explicit stop the parser reads
# that prose as more parameter rows (Contact & Closing picked up 25 instead of
# 13, GTM Risks 39 instead of 11).
_STOP_RE = re.compile(r"^-\s|—|Core Data|^(Recommended|Important|Note|Key rule)")


def _ends_table(label: str) -> bool:
    """True when this first-column cell is really the prose after the table.

    Checked on the LABEL column only. Descriptions legitimately read like prose
    ("If fundraising", "If applicable"); testing them too truncated tables at
    their first such row.
    """
    return (not label
            or len(label) > 60
            or label.endswith((".", ":", "?", "!"))
            or bool(_STOP_RE.search(label)))


def parse_groups(lines: list[str]) -> list[tuple[str, str, list[tuple[str, str]]]]:
    """-> [(deck, group label, [(parameter, data description), ...])]"""
    # Index the deck headings.
    deck_at: dict[int, str] = {}
    for i, ln in enumerate(lines):
        for deck in HARVEST + ["GENERAL DECK", "INVESTOR DECK", "BUSINESS DECK",
                               "ELEVATOR DECK", "PRODUCT DECK", "DEMO DAY DECK"]:
            if ln == deck:
                deck_at[i] = deck

    bounds = sorted(deck_at)
    results = []
    for start in bounds:
        deck = deck_at[start]
        if deck not in HARVEST:
            continue
        end = next((b for b in bounds if b > start), len(lines))
        seg = lines[start:end]

        # Group headers look like "12. Traction & Validation" and run 1..N once.
        heads, expect = [], 1
        for j, ln in enumerate(seg):
            m = re.match(r"^(\d{1,2})\.\s+(.+)$", ln)
            if m and int(m.group(1)) == expect and "→" not in ln:
                heads.append((j, m.group(2).strip()))
                expect += 1

        for k, (j, label) in enumerate(heads):
            stop = heads[k + 1][0] if k + 1 < len(heads) else len(seg)
            body = seg[j + 1:stop]
            # Skip any prose before the table header.
            try:
                t = body.index("Parameter")
            except ValueError:
                continue
            if t + 1 >= len(body) or body[t + 1] != "Data":
                continue
            rows = body[t + 2:]
            pairs = []
            for a in range(0, len(rows) - 1, 2):
                name, desc = rows[a].strip(), rows[a + 1].strip()
                if _ends_table(name):
                    break
                pairs.append((name, desc))
            if pairs:
                results.append((deck, label, pairs))
    return results


# ── naming & typing ───────────────────────────────────────────────────────────

ACRONYMS = {"tam", "sam", "som", "cac", "ltv", "arr", "mrr", "nrr", "grr", "acv",
            "arpu", "asp", "icp", "gtm", "roi", "kpi", "ip", "api", "mql", "sql",
            "poc", "loi", "esop", "safe", "cagr", "ebitda", "cogs", "opex",
            "r&d", "s&m", "g&a", "b2b", "b2c", "mvp", "ui", "ux", "ai", "ml"}


def slug(label: str, group: str) -> str:
    s = label.lower().replace("&", " and ").replace("/", " ")
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    s = re.sub(r"_+", "_", s)
    if s and s[0].isdigit():                       # "12-Month Goals"
        s = "n" + s
    return s or re.sub(r"[^a-z0-9]+", "_", group.lower()).strip("_")


def infer_type(label: str, desc: str) -> str:
    L, D = label.lower(), desc.lower()
    both = f"{L} {D}"

    if re.search(r"\burl\b|website|link|domain", both):
        return "url"
    if re.search(r"\byear\b", L) and "years" not in L:
        return "number"
    if re.search(r"\bdate\b|launch", L):
        return "date"
    if re.search(r"%|percent|rate|margin|growth|churn|retention|cagr|conversion|"
                 r"ownership|dilution|share of|win rate", both):
        return "percent"
    if re.search(r"revenue|cost|cac|ltv|acv|arpu|\basp\b|price|pricing|cash|burn|"
                 r"valuation|amount|funding|budget|spend|profit|income|ebitda|"
                 r"cogs|opex|expense|arr|mrr|salary|raise", both):
        return "currency"
    if re.search(r"number of|count|headcount|team size|\bsize\b|months|runway|"
                 r"cycle|payback|employees|customers|users", both):
        return "number"
    if re.search(r"stage|status|model|type|frequency|severity|priority|motion", L):
        return "select"
    if re.search(r"competitors|streams|features|milestones|partnerships|channels|"
                 r"segments|use cases|risks|logos|awards|patents|investors|"
                 r"integrations|tiers|personas|markets|sources", L):
        return "list"
    if re.search(r"table|breakdown|by period|by channel|by segment|cohort|"
                 r"cap table|statement|forecast|history", both):
        return "table"
    if re.search(r"statement|description|strategy|story|bio|why|how|summary|"
                 r"narrative|thesis|mitigation|plan|process|journey|workflow|"
                 r"positioning|messaging|evidence|assumptions|context", both):
        return "textarea"
    return "text"


SELECT_OPTIONS = {
    "company_stage": ("Idea", "Pre-revenue", "Pre-seed", "Seed", "Series A",
                      "Series B", "Growth", "Bootstrapped"),
    "business_type": ("B2B", "B2C", "B2B2C", "B2G", "Marketplace"),
    "business_model": ("SaaS", "Marketplace", "Services", "E-commerce",
                       "Fintech", "Hardware", "Transactional", "Licensing", "Other"),
    "product_stage": ("Concept", "MVP", "Beta", "Live", "Scaling"),
    "problem_severity": ("Critical", "High", "Medium", "Low"),
    "sales_motion": ("Product-led", "Sales-led", "Hybrid", "Channel-led"),
    "company_size": ("SMB", "Mid-market", "Enterprise"),
}

# The GTM and Appendix decks re-express many master concepts under their own
# headings (GTM "Sales Strategy" vs master "Sales"; Appendix "Traction Details"
# vs master "Traction & Validation"). Folding them into the owning master group
# keeps one home per fact — the spec's whole point — instead of shipping 81
# near-duplicate groups. Anything genuinely new keeps its own group.
MERGE_INTO = {
    # ── GTM deck ──
    "gtm_overview": "go_to_market",
    "ideal_customer_profile_icp": "customer_icp",
    "buyer_and_persona": "customer_icp",
    "content_and_demand_generation": "marketing_channels",
    "outbound_strategy": "sales",
    "sales_strategy": "sales",
    "partnerships": "partnerships_and_ecosystem",
    "customer_acquisition_economics": "unit_economics",
    "customer_funnel_and_conversion": "sales_funnel",
    "pricing_and_monetization": "business_model",
    "traction": "traction_and_validation",
    "gtm_team_and_resources": "gtm_operations",
    "gtm_technology_and_infrastructure": "gtm_operations",
    "gtm_strategy_and_roadmap": "go_to_market",
    "gtm_risks_and_mitigation": "risks_and_mitigation",
    # ── Appendix deck ──
    "company_and_corporate_information": "legal_and_corporate",
    "detailed_problem_evidence": "problem",
    "competitive_intelligence": "competition",
    "product_details": "product",
    "technology": "technology_and_ip",
    "security": "security_and_compliance",
    "traction_details": "traction_and_validation",
    "unit_economics_details": "unit_economics",
    "sales_data": "sales",
    "gtm_data": "go_to_market",
    "financial_history": "financials",
    "financial_assumptions": "financial_forecast",
    "fundraising_details": "fundraising",
    "cap_table": "cap_table_and_ownership",
    "legal_and_ip": "legal_and_corporate",
    "regulatory_and_risk_evidence": "risks_and_mitigation",
    "customer_proof": "evidence_and_diligence",
    "product_usage_and_analytics": "product",
    "source_and_evidence_metadata": "evidence_metadata",
}

# Rows the heuristic gets wrong, corrected by generated name.
OVERRIDES: dict[str, dict] = {
    "logo": {"type": "url"},
    "tagline": {"type": "text"},
    "founder_names": {"type": "list"},
    "founder_bios": {"type": "textarea"},
    "advisors": {"type": "list"},
    "team_size": {"type": "number"},
    "founded_year": {"type": "number"},
    "customer_logos": {"type": "list"},
    "tam": {"type": "currency"}, "sam": {"type": "currency"}, "som": {"type": "currency"},
    "ltv_cac": {"type": "number"},
    "use_of_funds": {"type": "textarea"},
    "runway": {"type": "number", "unit": "months"},
    "sales_cycle": {"type": "number", "unit": "days"},
    "cac_payback": {"type": "number", "unit": "months"},
}

# Parameters the app already derives rather than asks for.
DERIVED = {
    "ltv_cac": ("ltv", "cac"),
}


# ── emit ──────────────────────────────────────────────────────────────────────

HEADER = '''"""The master parameter catalogue — every business fact the app can hold.

GENERATED by `scripts/gen_parameters.py` from `Pitch Deck Parameters.docx`.
Re-run that script after the spec changes; hand-edits here are overwritten.
Corrections belong in the OVERRIDES table in the generator.

The spec's central rule is that these are raw business data, NOT slides:

    "Parameters are the raw business data. They should not be tied one-to-one
     with slides."

A deck type declares which GROUPS it consumes (`DeckType.param_groups`) and the
relevance table decides which of those are required; the selection engine then
picks the strongest few per slide. One parameter can feed many slides across
many deck types, and is only ever collected once.
"""
from dataclasses import dataclass, field
from typing import Literal

ParamType = Literal[
    "text", "textarea", "number", "currency", "percent", "select",
    "multiselect", "boolean", "date", "url", "list", "table",
]


@dataclass(frozen=True)
class Parameter:
    name: str                             # snake_case, unique across all groups
    label: str
    type: ParamType = "text"
    group: str = ""
    help: str = ""                        # the spec's own "Data" description
    unit: str = ""                        # "USD", "%", "months"
    options: tuple[str, ...] = ()         # select / multiselect
    derived_from: tuple[str, ...] = ()    # A-relevance: computed, never asked


@dataclass(frozen=True)
class ParameterGroup:
    key: str
    label: str
    order: int
    params: tuple[Parameter, ...] = field(default_factory=tuple)


'''

FOOTER = '''

# ── Lookups ───────────────────────────────────────────────────────────────────

PARAMETERS: dict[str, Parameter] = {
    p.name: p for g in PARAMETER_GROUPS.values() for p in g.params
}

GROUP_KEYS: tuple[str, ...] = tuple(PARAMETER_GROUPS)


def group_of(param_name: str) -> str:
    p = PARAMETERS.get(param_name)
    return p.group if p else ""


def params_in(*group_keys: str) -> tuple[Parameter, ...]:
    """Every parameter in the given groups, in declaration order."""
    out: list[Parameter] = []
    for key in group_keys:
        g = PARAMETER_GROUPS.get(key)
        if g:
            out.extend(g.params)
    return tuple(out)
'''


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(DOCX):
        print(f"spec not found: {DOCX}", file=sys.stderr)
        return 1

    groups = parse_groups(docx_lines(DOCX))

    seen: dict[str, str] = {}      # param name -> group key that owns it
    emitted: list[tuple[str, str, list[Parameter_t]]] = []  # type: ignore[name-defined]
    order = 0
    body_parts = []

    by_key: dict[str, list] = {}       # merged group key -> rows
    labels: dict[str, str] = {}

    for deck, label, pairs in groups:
        raw = slug(label, label)
        gkey = MERGE_INTO.get(raw, raw)
        labels.setdefault(gkey, label if gkey == raw else labels.get(gkey, label))
        rows = by_key.setdefault(gkey, [])
        for name, desc in pairs:
            pname = slug(name, label)
            if not pname or pname in seen:
                continue           # first group to define a parameter owns it
            seen[pname] = gkey
            ptype = infer_type(name, desc)
            ov = OVERRIDES.get(pname, {})
            ptype = ov.get("type", ptype)
            unit = ov.get("unit", "")
            if not unit:
                unit = {"currency": "USD", "percent": "%"}.get(ptype, "")
            opts = SELECT_OPTIONS.get(pname, ())
            if ptype == "select" and not opts:
                ptype = "text"     # never emit an empty dropdown
                unit = ""
            rows.append((pname, name, ptype, desc, unit, opts,
                         DERIVED.get(pname, ())))
    for gkey, rows in by_key.items():
        if not rows:
            continue
        label = labels.get(gkey, gkey.replace("_", " ").title())
        order += 1
        emitted.append((gkey, label, rows))

        lines = [f'    "{gkey}": ParameterGroup(',
                 f'        key="{gkey}",',
                 f'        label={label!r},',
                 f'        order={order},',
                 '        params=(']
        for pname, plabel, ptype, desc, unit, opts, derived in rows:
            bits = [f'name="{pname}"', f'label={plabel!r}', f'type="{ptype}"',
                    f'group="{gkey}"']
            if desc:
                bits.append(f'help={desc!r}')
            if unit:
                bits.append(f'unit="{unit}"')
            if opts:
                bits.append(f'options={opts!r}')
            if derived:
                bits.append(f'derived_from={derived!r}')
            lines.append("            Parameter(" + ", ".join(bits) + "),")
        lines += ['        ),', '    ),']
        body_parts.append("\n".join(lines))

    total = sum(len(r) for _, _, r in emitted)
    print(f"{len(emitted)} groups, {total} unique parameters")
    for gkey, label, rows in emitted:
        print(f"    {gkey:34s} {len(rows):3d}  {label}")

    if args.dry_run:
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(HEADER)
        fh.write("PARAMETER_GROUPS: dict[str, ParameterGroup] = {\n")
        fh.write("\n".join(body_parts))
        fh.write("\n}\n")
        fh.write(FOOTER)
    print(f"\nwrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
