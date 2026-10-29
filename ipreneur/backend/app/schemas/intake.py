"""
Company intake schema — collects founder-provided metrics before the pipeline runs.
These override inferred data from the website crawl wherever provided.
"""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator

from app.core.money import CURRENCY_GUIDANCE, Currency, format_money
from app.decks.registry import DEFAULT_DECK_FORMAT, DEFAULT_DECK_TYPE, get_deck_type


class FundingStage(str, Enum):
    idea = "idea"
    pre_seed = "pre_seed"
    seed = "seed"
    early_stage = "early_stage"
    growth_stage = "growth_stage"
    late_stage = "late_stage"
    pre_ipo = "pre_ipo"
    bootstrapped = "bootstrapped"


class BusinessModelType(str, Enum):
    saas = "saas"
    marketplace = "marketplace"
    services = "services"
    ecommerce = "ecommerce"
    fintech = "fintech"
    hardware = "hardware"
    other = "other"


class CompanyIntake(BaseModel):
    # ── Required ────────────────────────────────────────────────────────────
    website_url: str

    # ── Deck shape ───────────────────────────────────────────────────────────
    deck_type: str = DEFAULT_DECK_TYPE
    deck_format: str = DEFAULT_DECK_FORMAT
    # Answers to the deck type's own intake questions, keyed by BriefField.name
    # (target_buyer, partner_name, initiative, period, …).
    brief: dict[str, str] = {}

    # ── Business basics ──────────────────────────────────────────────────────
    company_name: Optional[str] = None
    industry: Optional[str] = None
    business_model: Optional[BusinessModelType] = None
    funding_stage: Optional[FundingStage] = None
    founded_year: Optional[int] = None
    team_size: Optional[int] = None

    # ── Financials ───────────────────────────────────────────────────────────
    arr_usd: Optional[float] = None         # Annual Recurring Revenue
    mrr_usd: Optional[float] = None         # Monthly Recurring Revenue
    burn_usd: Optional[float] = None        # Net monthly cash burn
    runway_months: Optional[float] = None   # Months of cash left at current burn

    # ── Traction ─────────────────────────────────────────────────────────────
    total_customers: Optional[int] = None
    monthly_active_users: Optional[int] = None
    growth_rate_mom_pct: Optional[float] = None  # Month-over-month growth %

    # ── Unit economics ───────────────────────────────────────────────────────
    cac_usd: Optional[float] = None         # Customer Acquisition Cost
    ltv_usd: Optional[float] = None         # Lifetime Value
    churn_rate_pct: Optional[float] = None  # Monthly churn %
    nrr_pct: Optional[float] = None         # Net Revenue Retention %

    # ── The Ask ──────────────────────────────────────────────────────────────
    ask_amount_usd: Optional[float] = None  # How much they're raising
    round_type: Optional[str] = None        # "Seed", "Series A", etc.

    # ── Currency ─────────────────────────────────────────────────────────────
    # Every *_usd field above is in this currency — the suffix predates the
    # setting. Defaults to USD so a project saved before this existed, which
    # was always entered in dollars, keeps rendering the way it always did.
    currency: Currency = "USD"

    @field_validator("website_url")
    @classmethod
    def ensure_scheme(cls, v: str) -> str:
        v = v.strip()
        if v and not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v

    def to_prompt_section(self) -> str:
        """Format intake data as a prompt section — ground truth for AI agents."""
        lines: list[str] = []

        if self.company_name:
            lines.append(f"  Company Name: {self.company_name}")
        if self.industry:
            lines.append(f"  Industry: {self.industry}")
        if self.funding_stage:
            stage_label = self.funding_stage.value.replace("_", " ").title().replace("Ipo", "IPO")
            lines.append(f"  Funding Stage: {stage_label}")
        if self.business_model:
            lines.append(f"  Business Model: {self.business_model.value.upper()}")
        if self.founded_year:
            lines.append(f"  Founded: {self.founded_year}")
        if self.team_size:
            lines.append(f"  Team Size: {self.team_size}")

        if self.arr_usd is not None:
            lines.append(f"  ARR: {format_money(self.arr_usd, self.currency)}")
        elif self.mrr_usd is not None:
            lines.append(
                f"  MRR: {format_money(self.mrr_usd, self.currency)}  "
                f"(implied ARR ~{format_money(self.mrr_usd * 12, self.currency)})"
            )

        if self.total_customers is not None:
            lines.append(f"  Total Customers: {self.total_customers:,}")
        if self.monthly_active_users is not None:
            lines.append(f"  MAU: {self.monthly_active_users:,}")
        if self.growth_rate_mom_pct is not None:
            lines.append(f"  MoM Growth: {self.growth_rate_mom_pct:.1f}%")

        if self.cac_usd is not None:
            lines.append(f"  CAC: {format_money(self.cac_usd, self.currency)}")
        if self.ltv_usd is not None:
            lines.append(f"  LTV: {format_money(self.ltv_usd, self.currency)}")
        if self.cac_usd and self.ltv_usd and self.cac_usd > 0:
            lines.append(f"  LTV:CAC: {self.ltv_usd / self.cac_usd:.1f}x")
        if self.churn_rate_pct is not None:
            lines.append(f"  Monthly Churn: {self.churn_rate_pct:.1f}%")
        if self.burn_usd is not None:
            lines.append(f"  Monthly Burn: {format_money(self.burn_usd, self.currency)}")
        if self.runway_months is not None:
            lines.append(f"  Runway: {self.runway_months:.0f} months")
        if self.nrr_pct is not None:
            lines.append(f"  Net Revenue Retention: {self.nrr_pct:.0f}%")

        if self.ask_amount_usd is not None:
            round_label = self.round_type or "unspecified round"
            lines.append(f"  Raising: {format_money(self.ask_amount_usd, self.currency)} ({round_label})")

        # The deck type's own questions — for types with no web research these
        # are the only authoritative input the prompt gets.
        brief_lines: list[str] = []
        if self.brief:
            labels = {f.name: f.label for f in get_deck_type(self.deck_type).brief_fields}
            for name, value in self.brief.items():
                text = str(value or "").strip()
                if text:
                    brief_lines.append(f"  {labels.get(name, name.replace('_', ' ').title())}: {text}")

        if not lines and not brief_lines:
            return ""

        out: list[str] = []
        if lines:
            out.append("FOUNDER-PROVIDED METRICS (treat as ground truth — override inferred data):")
            out.extend(lines)
            out.append(f"  {CURRENCY_GUIDANCE[self.currency]}")
        if brief_lines:
            if out:
                out.append("")
            out.append("DECK BRIEF (answers for this specific deck — ground truth):")
            out.extend(brief_lines)
        return "\n".join(out)
