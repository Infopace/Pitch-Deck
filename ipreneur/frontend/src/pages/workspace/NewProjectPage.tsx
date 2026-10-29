import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe, ArrowRight, ArrowLeft, Upload, X, Image as ImageIcon, Plus,
  TrendingUp, Target, Layers, Handshake, ClipboardCheck, Activity, Compass, Check,
  FileText, Zap, Mic, Route, Briefcase, Library,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useForm, useFieldArray } from "react-hook-form";
import { THEMES } from "@/components/workspace/deckTemplates/themes";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import { projectsApi } from "@/services/api/projects";
import { deckTypesApi, type DeckTypeOption } from "@/services/api/deckTypes";
import {
  DECK_TYPES as DECK_TYPE_SECTIONS,
  slideOrder,
} from "@/components/workspace/deckTemplates/deckTypes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";

const trimOrUndefined = (v: unknown) => (typeof v === "string" ? v.trim() || undefined : v);

const founderSchema = z.object({
  name: z.preprocess(trimOrUndefined, z.string().optional()),
  role: z.preprocess(trimOrUndefined, z.string().optional()),
  oneLiner: z.preprocess(trimOrUndefined, z.string().max(140).optional()),
  email: z.preprocess(trimOrUndefined, z.string().email("Invalid email").optional()),
  phone: z.preprocess(trimOrUndefined, z.string().max(30).optional()),
  linkedin: z.preprocess(trimOrUndefined, z.string().max(200).optional()),
});

const baseSchema = z.object({
  deckType: z.string().default("investor"),
  deckFormat: z.enum(["presenter", "standalone"]).default("presenter"),
  currency: z.enum(["INR", "USD"]).default("INR"),
  /* Answers to the selected deck type's own questions, keyed by the
   * backend BriefField.name. Validated at submit against the fetched
   * registry rather than in zod, which cannot see server-driven fields. */
  brief: z.record(z.string()).default({}),
  hasWebsite: z.boolean().default(true),
  companyUrl: z.string().optional(),
  name: z.string().min(1, "Project name is required").max(80),
  companyName: z.preprocess(trimOrUndefined, z.string().max(80).optional()),
  industry: z.preprocess(trimOrUndefined, z.string().max(80).optional()),
  problemStatement: z.preprocess(trimOrUndefined, z.string().max(600).optional()),
  solutionDescription: z.preprocess(trimOrUndefined, z.string().max(600).optional()),
  targetCustomer: z.preprocess(trimOrUndefined, z.string().max(120).optional()),
  tractionNotes: z.preprocess(trimOrUndefined, z.string().max(400).optional()),
  competitorNotes: z.preprocess(trimOrUndefined, z.string().max(200).optional()),
  founders: z.array(founderSchema).default([]),
  businessModel: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["saas", "marketplace", "services", "ecommerce", "fintech", "hardware", "other"]).optional()
  ),
  fundingStage: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["idea", "pre_seed", "seed", "early_stage", "growth_stage", "late_stage", "pre_ipo", "bootstrapped"]).optional()
  ),
  arrUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  mrrUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  totalCustomers: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  monthlyActiveUsers: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  askAmountUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  roundType: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum([
      "bootstrap", "angel", "round", "pre_seed", "seed", "pre_series_a",
      "series_a", "series_b", "series_c", "growth", "venture_debt", "debt_financing",
    ]).optional()
  ),
  // These were already accepted by CompanyIntake and already formatted into the
  // generation prompt by `to_prompt_section()` — they were simply never asked
  // for, so every deck was written without them.
  foundedYear: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(1900).max(2100).optional()
  ),
  teamSize: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  growthRateMomPct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(-100).max(1000).optional()
  ),
  cacUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  ltvUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  churnRatePct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0).max(100).optional()
  ),
  burnUsd: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  runwayMonths: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive().max(120).optional()
  ),
  nrrPct: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0).max(500).optional()
  ),
  startImmediately: z.boolean().default(true),
});

const schema = baseSchema.superRefine((data, ctx) => {
  if (data.hasWebsite) {
    if (!data.companyUrl?.trim()) {
      ctx.addIssue({ path: ["companyUrl"], code: z.ZodIssueCode.custom, message: "URL is required" });
    } else if (!z.string().url().safeParse(data.companyUrl).success) {
      ctx.addIssue({ path: ["companyUrl"], code: z.ZodIssueCode.custom, message: "Please enter a valid URL (include https://)" });
    }
  }
  // Which company details are mandatory depends on the deck type, and that
  // list lives in the backend registry (GET /deck-types) — see
  // validateForDeckType() below, which runs on submit once it has loaded.
});

/** Backend shared-field name → the form field that collects it. */
const SHARED_FIELD_FORM_NAMES: Record<string, string> = {
  company_name: "companyName",
  industry: "industry",
  problem_statement: "problemStatement",
  solution_description: "solutionDescription",
  target_customer: "targetCustomer",
  traction_notes: "tractionNotes",
  competitor_notes: "competitorNotes",
  founders: "founders",
  business_model: "businessModel",
  funding_stage: "fundingStage",
};

type FormData = z.infer<typeof schema>;

// A deck can take a while to fill in — losing it all to an accidental back
// or reload was the single biggest complaint we got about this form. The
// draft lives only on this device (no server round-trip, nothing to clean
// up on our end) and only covers text fields: a File object can't survive
// JSON.stringify, so a chosen logo/gallery image still has to be re-picked.
const DRAFT_KEY = "mint:new-project-draft:v1";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
interface ProjectDraft {
  values: FormData;
  step: 1 | 2;
  category: string;
  savedAt: number;
}

/** The two currencies the form collects money in, and how each is shown. */
const CURRENCIES: Record<"INR" | "USD", { symbol: string; name: string }> = {
  INR: { symbol: "₹", name: "Indian Rupees — written as lakh/crore on the slides" },
  USD: { symbol: "$", name: "US Dollars" },
};
type CurrencyCode = keyof typeof CURRENCIES;

/**
 * The shared numbers, in display order, keyed by backend intake name. Which of
 * them a deck asks for comes from the registry (`intakeFields`), so an investor
 * update is never asked for a raise and a sales deck never for ARR.
 *
 * Labels spell the abbreviation out and every field carries a one-line
 * definition: founders who don't already know what NRR is can't answer it.
 * `money: true` fields are entered in whatever currency is selected above —
 * their hint and placeholder adjust to match.
 */
const NUMBER_FIELDS: { name: string; form: keyof FormData; label: string; placeholder: string; hint: string; text?: boolean; money?: boolean }[] = [
  { name: "arr_usd", form: "arrUsd", label: "Annual Recurring Revenue (ARR)", placeholder: "e.g. 12000000", money: true,
    hint: "Subscription revenue that repeats every year, usually MRR × 12." },
  { name: "mrr_usd", form: "mrrUsd", label: "Monthly Recurring Revenue (MRR)", placeholder: "e.g. 1000000", money: true,
    hint: "Subscription revenue you collect every month, not counting one-off fees." },
  { name: "total_customers", form: "totalCustomers", label: "Total customers", placeholder: "e.g. 2500",
    hint: "Paying customers (people or companies) you have today." },
  { name: "monthly_active_users", form: "monthlyActiveUsers", label: "Monthly Active Users (MAU)", placeholder: "e.g. 120000",
    hint: "People who used the product at least once in the last 30 days." },
  { name: "ask_amount_usd", form: "askAmountUsd", label: "Amount you're raising (the ask)", placeholder: "e.g. 15000000", money: true,
    hint: "The total investment you want from this round." },
  { name: "founded_year", form: "foundedYear", label: "Founded year", placeholder: "e.g. 2023",
    hint: "The year the company started or was incorporated." },
  { name: "team_size", form: "teamSize", label: "Team size", placeholder: "e.g. 12",
    hint: "Full-time people working on the company today, founders included." },
  { name: "growth_rate_mom_pct", form: "growthRateMomPct", label: "Month-over-Month growth (MoM %)", placeholder: "e.g. 15",
    hint: "How much revenue grew from last month to this month, as a percentage." },
  { name: "churn_rate_pct", form: "churnRatePct", label: "Monthly churn (%)", placeholder: "e.g. 2.5",
    hint: "The share of customers who cancel or stop paying each month." },
  { name: "burn_usd", form: "burnUsd", label: "Monthly burn", placeholder: "e.g. 1500000", money: true,
    hint: "Net cash you spend each month — operating costs minus revenue." },
  { name: "runway_months", form: "runwayMonths", label: "Runway (months)", placeholder: "e.g. 14",
    hint: "How many months of cash you have left at the current burn rate." },
  { name: "cac_usd", form: "cacUsd", label: "Customer Acquisition Cost (CAC)", placeholder: "e.g. 9000", money: true,
    hint: "Average spend to win one paying customer." },
  { name: "ltv_usd", form: "ltvUsd", label: "Customer Lifetime Value (LTV)", placeholder: "e.g. 54000", money: true,
    hint: "Total profit you expect from one customer before they leave. We compare it with CAC." },
  { name: "nrr_pct", form: "nrrPct", label: "Net Revenue Retention (NRR %)", placeholder: "e.g. 118",
    hint: "Revenue kept from last year's customers after upgrades, downgrades and cancellations. Above 100% means they spend more over time." },
];

/**
 * Every shared field whose visibility the deck type decides: backend name →
 * form name. Company name is always asked; founders follow the team slide.
 */
const GATED_FIELDS: [string, string][] = [
  ...Object.entries(SHARED_FIELD_FORM_NAMES).filter(([, form]) => form !== "founders" && form !== "companyName"),
  ...NUMBER_FIELDS.map((f): [string, string] => [f.name, f.form]),
];

const EXAMPLES = ["stripe.com", "notion.so", "figma.com", "ramp.com"];

/** One icon per deck type, so the seven choices are distinguishable at a glance. */
const TYPE_ICONS: Record<string, LucideIcon> = {
  investor: TrendingUp,
  sales: Target,
  product: Layers,
  partnership: Handshake,
  internal: ClipboardCheck,
  update: Activity,
  vision: Compass,
  general: FileText,
  elevator: Zap,
  demoday: Mic,
  gtm: Route,
  business: Briefcase,
  master: Library,
};

/** Icon-tile tint per deck type (Tailwind 50 / 600 pairs from the redesign). */
const TYPE_TINTS: Record<string, { bg: string; fg: string }> = {
  investor: { bg: "#ECFDF5", fg: "#059669" },
  sales: { bg: "#EFF6FF", fg: "#2563EB" },
  product: { bg: "#EEF2FF", fg: "#4F46E5" },
  partnership: { bg: "#FAF5FF", fg: "#9333EA" },
  internal: { bg: "#FFFBEB", fg: "#D97706" },
  update: { bg: "#ECFEFF", fg: "#0891B2" },
  vision: { bg: "#F0FDFA", fg: "#0D9488" },
  general: { bg: "#F0F9FF", fg: "#0284C7" },
  elevator: { bg: "#FFF7ED", fg: "#EA580C" },
  demoday: { bg: "#FFF1F2", fg: "#E11D48" },
  gtm: { bg: "#F7FEE7", fg: "#65A30D" },
  business: { bg: "#F5F5F4", fg: "#57534E" },
  master: { bg: "#F5F3FF", fg: "#7C3AED" },
};

/** Filter tabs for the deck-type picker. A type belongs to exactly one. */
const CATEGORIES: { key: string; label: string; types: string[] }[] = [
  { key: "fundraising", label: "Fundraising", types: ["investor", "update", "demoday", "elevator"] },
  { key: "sales", label: "Sales & Clients", types: ["sales", "partnership"] },
  { key: "product", label: "Product", types: ["product"] },
  { key: "internal", label: "Internal", types: ["internal", "vision"] },
  { key: "strategy", label: "Strategy", types: ["general", "gtm", "business", "master"] },
];

/**
 * Readable slide names for the running-order preview.
 *
 * Reuses the deck registry's own eyebrow labels rather than a second table
 * that could drift from what the deck actually renders.
 */
function slideLabels(deckType: string): string[] {
  return slideOrder(deckType).map((slot) =>
    slot.eyebrow || slot.key.charAt(0).toUpperCase() + slot.key.slice(1)
  );
}

const ndS = {
  page: { maxWidth: 880, margin: "0 auto", padding: "26px 24px 64px" } as React.CSSProperties,
  back: { display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: "none", cursor: "pointer", font: "500 13px var(--font-body)", color: "var(--text-muted)", marginBottom: 22, padding: 0, textDecoration: "none" } as React.CSSProperties,

  // ── Step indicator ──────────────────────────────────────────────────────
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingBottom: 16, marginBottom: 28, borderBottom: "1px solid var(--border-subtle)" } as React.CSSProperties,

  draftBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 16px", marginBottom: 20, borderRadius: "var(--radius-md)", background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", font: "500 13px var(--font-body)", color: "#047857" } as React.CSSProperties,
  draftBannerBtn: { border: 0, background: "none", padding: 0, font: "600 13px var(--font-body)", color: "#047857", textDecoration: "underline", cursor: "pointer", flexShrink: 0 } as React.CSSProperties,
  steps: { display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  stepBtn: { display: "flex", alignItems: "center", gap: 11, border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left" } as React.CSSProperties,
  stepNum: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px var(--font-body)", flexShrink: 0 } as React.CSSProperties,
  stepNumOn: { background: "var(--clay-500)", color: "var(--text-on-brand)", boxShadow: "var(--clay-raise-sm)" } as React.CSSProperties,
  stepNumOff: { background: "var(--surface-sunken)", color: "var(--text-faint)", border: "1px solid var(--border-subtle)" } as React.CSSProperties,
  stepName: { font: "600 13px var(--font-body)", color: "var(--text-strong)", lineHeight: 1.2 } as React.CSSProperties,
  stepNameOff: { color: "var(--text-faint)" } as React.CSSProperties,
  stepSub: { marginTop: 2, font: "400 11.5px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  stepBar: { flex: 1, height: 1, background: "var(--border-subtle)" } as React.CSSProperties,

  head: { marginBottom: 22 } as React.CSSProperties,
  h1: { font: "800 30px var(--font-display)", letterSpacing: "-0.03em", color: "var(--text-strong)", margin: 0 } as React.CSSProperties,
  sub: { marginTop: 8, font: "400 14.5px var(--font-body)", color: "var(--text-muted)", maxWidth: 560, lineHeight: 1.5 } as React.CSSProperties,

  // ── Deck type picker ────────────────────────────────────────────────────
  typeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties,
  typeCard: { position: "relative", textAlign: "left", padding: "20px 22px 18px", borderRadius: "var(--radius-xl)", border: "1.5px solid var(--glass-edge)", background: "var(--glass-2)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", boxShadow: "var(--glass-rim), var(--shadow-sm)", cursor: "pointer", transition: "border-color var(--dur-base), background var(--dur-base), box-shadow var(--dur-base)", display: "flex", flexDirection: "column", gap: 10 } as React.CSSProperties,
  typeCardOn: { borderColor: "#10B981", background: "rgba(16,185,129,.06)", boxShadow: "var(--glass-rim), 0 8px 22px -8px rgba(16,185,129,.35)" } as React.CSSProperties,
  typeCardWide: { gridColumn: "1 / -1" } as React.CSSProperties,
  typeTop: { display: "flex", alignItems: "flex-start", gap: 12 } as React.CSSProperties,
  // Selected / "chosen" tile: slate with an emerald glyph. Unselected tiles take a
  // per-type tint (TYPE_TINTS) so the nine types read apart at a glance.
  typeIcon: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#0F172A", color: "#34D399", boxShadow: "var(--clay-raise-sm)" } as React.CSSProperties,
  typeIconOff: { boxShadow: "none" } as React.CSSProperties,
  typeName: { font: "700 15px var(--font-display)", letterSpacing: "-0.01em", color: "var(--text-strong)" } as React.CSSProperties,
  typeDesc: { marginTop: 4, font: "400 12.5px var(--font-body)", color: "var(--text-muted)", lineHeight: 1.45 } as React.CSSProperties,
  typeCount: { font: "500 11.5px var(--font-body)", color: "var(--text-faint)", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto" } as React.CSSProperties,
  tick: { position: "absolute", top: 14, right: 16, width: 18, height: 18, borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,

  // ── Running order: a side panel beside the picker ───────────────────────
  // Flex-wrap rather than a media query (these are inline styles): the panel
  // sits to the right while there is room and drops below the grid when not.
  split: { display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" } as React.CSSProperties,
  splitMain: { flex: "1 1 520px", minWidth: 0 } as React.CSSProperties,
  order: { flex: "0 0 300px", position: "sticky", top: 24, maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)", overflow: "hidden" } as React.CSSProperties,
  orderHead: { padding: "16px 18px 14px", borderBottom: "1px solid var(--border-subtle)" } as React.CSSProperties,
  orderTitleRow: { display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  orderTitle: { font: "700 11.5px var(--font-body)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-strong)" } as React.CSSProperties,
  orderMeta: { font: "600 11px var(--font-body)", color: "var(--text-muted)", background: "var(--surface-sunken)", borderRadius: 999, padding: "2px 8px", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  orderPreset: { marginTop: 4, font: "400 11.5px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  orderList: { listStyle: "none", margin: 0, padding: 0, overflowY: "auto", flex: 1, minHeight: 0 } as React.CSSProperties,
  // Fixed-width number column so every label starts on the same line.
  orderRow: { display: "grid", gridTemplateColumns: "26px 1fr", alignItems: "center", columnGap: 12, height: 38, padding: "0 18px", borderTop: "1px solid var(--border-subtle)" } as React.CSSProperties,
  orderNum: { textAlign: "right", font: "500 11px var(--font-mono, ui-monospace, monospace)", color: "var(--text-faint)", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  orderLabel: { font: "500 12.5px var(--font-body)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as React.CSSProperties,
  orderFoot: { padding: 14, borderTop: "1px solid var(--border-subtle)", background: "var(--surface-sunken)" } as React.CSSProperties,

  // ── Category filter ─────────────────────────────────────────────────────
  filterRow: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 } as React.CSSProperties,
  seg: { display: "inline-flex", flexWrap: "wrap", gap: 2, padding: 3, borderRadius: 12, background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)" } as React.CSSProperties,
  segBtn: { border: 0, background: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 9, font: "500 12.5px var(--font-body)", color: "var(--text-muted)", transition: "background var(--dur-base), color var(--dur-base)" } as React.CSSProperties,
  segOn: { background: "var(--surface-card)", color: "var(--text-strong)", fontWeight: 600, boxShadow: "var(--shadow-sm)" } as React.CSSProperties,
  filterCount: { font: "500 12px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  popular: { marginLeft: 8, padding: "2px 8px", borderRadius: 999, font: "600 10px var(--font-body)", letterSpacing: "0.03em", background: "#D1FAE5", color: "#065F46", verticalAlign: "middle" } as React.CSSProperties,
  countPill: { font: "600 11.5px var(--font-body)", color: "#047857", background: "rgba(209,250,229,.7)", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "auto", marginRight: 26 } as React.CSSProperties,

  // ── Step 2 ──────────────────────────────────────────────────────────────
  chosen: { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-edge)", background: "var(--glass-2)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", boxShadow: "var(--glass-rim), var(--shadow-sm)", marginBottom: 18 } as React.CSSProperties,
  chosenName: { font: "700 14px var(--font-display)", color: "var(--text-strong)" } as React.CSSProperties,
  chosenMeta: { marginTop: 2, font: "400 12px var(--font-body)", color: "var(--text-muted)" } as React.CSSProperties,
  changeBtn: { marginLeft: "auto", border: 0, background: "none", cursor: "pointer", font: "600 12.5px var(--font-body)", color: "var(--text-brand)", padding: 0 } as React.CSSProperties,

  panel: { padding: "22px 24px", borderRadius: "var(--radius-xl)", border: "1px solid var(--glass-edge)", background: "var(--glass-2)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", boxShadow: "var(--glass-rim), var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  panelHead: { font: "700 14px var(--font-display)", color: "var(--text-strong)" } as React.CSSProperties,
  panelSub: { marginTop: 3, font: "400 12px var(--font-body)", color: "var(--text-muted)" } as React.CSSProperties,
  form: { display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,

  examples: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 9 } as React.CSSProperties,
  exBtn: { border: 0, background: "none", cursor: "pointer", font: "500 12px var(--font-body)", color: "var(--text-faint)", padding: 0, transition: "color var(--dur-base)" } as React.CSSProperties,
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "13px 16px", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" } as React.CSSProperties,
  toggleTitle: { font: "600 13px var(--font-body)", color: "var(--text-strong)" } as React.CSSProperties,
  toggleSub: { marginTop: 3, font: "400 12px var(--font-body)", color: "var(--text-muted)" } as React.CSSProperties,
  trust: { textAlign: "center", marginTop: 14, font: "400 12px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  sunken: { padding: "14px 16px", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 14 } as React.CSSProperties,
  uploadLabel: { font: "600 12px var(--font-body)", color: "var(--text-strong)", marginBottom: 8 } as React.CSSProperties,
  uploadHint: { font: "400 11px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  dropZone: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", border: "1.5px dashed var(--border-default)", borderRadius: "var(--radius-md)", cursor: "pointer", font: "500 12.5px var(--font-body)", color: "var(--text-muted)", background: "var(--surface-sunken)" } as React.CSSProperties,
  logoRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)" } as React.CSSProperties,
  logoPreview: { width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: "var(--ink-0)" } as React.CSSProperties,
  fileName: { flex: 1, font: "500 12px var(--font-body)", color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as React.CSSProperties,
  removeBtn: { border: 0, background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 } as React.CSSProperties,
  thumbGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 } as React.CSSProperties,
  thumbWrap: { position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-default)" } as React.CSSProperties,
  thumb: { width: "100%", height: "100%", objectFit: "cover", display: "block" } as React.CSSProperties,
  thumbX: { position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 } as React.CSSProperties,
  founderCard: { display: "flex", flexDirection: "column", gap: 6 } as React.CSSProperties,
  founderRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "start" } as React.CSSProperties,
  founderContactRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "start" } as React.CSSProperties,
  briefHint: { marginTop: 4, font: "400 11px var(--font-body)", color: "var(--text-faint)" } as React.CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", marginTop: 4 } as React.CSSProperties,
};

/**
 * Step transition. `custom` carries the direction into the exiting child too —
 * with mode="wait" the outgoing step renders after `dir` has already flipped,
 * so without it the exit would lean the wrong way.
 *
 * Reduced motion passes direction 0, which zeroes the travel and leaves a
 * short opacity fade: the change is still signalled, without movement.
 */
const stepVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -28 }),
};

export default function NewProjectPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  // A template chosen on /templates arrives as ?template=<key>. Validate it
  // against the registry so a stale or hand-typed key is ignored rather than
  // written to the project.
  const [searchParams] = useSearchParams();
  const presetTemplate = useMemo(() => {
    const k = searchParams.get("template");
    return k && THEMES.some((t) => t.key === k) ? k : null;
  }, [searchParams]);

  // Two steps rather than one long scroll: pick the deck type, then fill in
  // only the fields that type actually needs.
  const [step, setStep] = useState<1 | 2>(1);
  // Which way the flow is moving, so the transition reads as forward or back
  // rather than as an unexplained swap. 1 = onward, -1 = returning.
  const [dir, setDir] = useState<1 | -1>(1);
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState<string>("all");
  const [startNow, setStartNow] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [restoredDraft, setRestoredDraft] = useState(false);
  // Guards the autosave effect against firing before the restore pass has
  // had a chance to run — otherwise the very first render's blank defaults
  // would overwrite a draft before it's read back.
  const draftReadyRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      deckType: "investor",
      deckFormat: "presenter",
      currency: "INR",
      brief: {},
      hasWebsite: true,
      companyUrl: "",
      name: "",
      founders: [{ name: "", role: "", oneLiner: "", email: "", phone: "", linkedin: "" }],
      startImmediately: true,
    },
  });

  // The deck-type catalogue comes from the backend registry, so the fields we
  // ask for are exactly the ones the generation prompt reads.
  const { data: deckTypes } = useQuery({
    queryKey: ["deck-types"],
    queryFn: deckTypesApi.list,
    staleTime: Infinity,
  });

  const deckType = watch("deckType");
  const deckFormat = watch("deckFormat");
  const currency = watch("currency");
  const selectedType: DeckTypeOption | undefined = useMemo(
    () => deckTypes?.find((d) => d.key === deckType),
    [deckTypes, deckType]
  );
  const runningOrder = useMemo(() => slideLabels(deckType), [deckType]);

  // The selection is kept when it is filtered out of view: the side panel
  // still describes it, and clearing it would silently change what gets built.
  const visibleTypes = useMemo(() => {
    const all = deckTypes ?? [];
    if (category === "all") return all;
    const keys = CATEGORIES.find((c) => c.key === category)?.types ?? [];
    return all.filter((t) => keys.includes(t.key));
  }, [deckTypes, category]);
  const fundingStage = watch("fundingStage");
  /**
   * Whether this deck type asks for a shared field (by backend name). The
   * registry decides per type; revenue fields also drop out at stages that
   * have no revenue yet. Until the catalogue loads, every field shows.
   */
  const asks = useMemo<(name: string) => boolean>(() => {
    if (!selectedType?.intakeFields) return () => true;
    const byName = new Map(selectedType.intakeFields.map((f) => [f.name, f]));
    // A stage picked under a type that asked for one no longer applies here.
    const stage = byName.has("funding_stage") ? fundingStage : undefined;
    return (name) => {
      const f = byName.get(name);
      return !!f && !(stage && f.hiddenAtStages.includes(stage));
    };
  }, [selectedType, fundingStage]);
  const numberFields = NUMBER_FIELDS.filter((f) => asks(f.name));
  // Declared by the type but hidden anyway — only the stage does that.
  const declared = new Set(selectedType?.intakeFields?.map((f) => f.name));
  const stageHidesRevenue = NUMBER_FIELDS.some((f) => declared.has(f.name) && !asks(f.name));
  const deckSections = DECK_TYPE_SECTIONS[deckType]?.sections ?? [];
  // A deck with no team slide has no reason to demand founder bios.
  const needsFounders = deckSections.includes("team");
  const hasGallery = deckSections.includes("galleryS");

  // Switching type clears stale per-type answers and their errors — but not
  // on the render where a restored draft first applies its own deckType,
  // which would otherwise wipe the brief answers it just brought back.
  const skipNextDeckTypeClear = useRef(true);
  useEffect(() => {
    if (skipNextDeckTypeClear.current) {
      skipNextDeckTypeClear.current = false;
      return;
    }
    setValue("brief", {});
    clearErrors();
  }, [deckType, setValue, clearErrors]);

  // Moving between steps should start at the top of the new step.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Resume an in-progress deck on reload/back instead of starting over.
  // Only the form values and which step they'd reached are restored — the
  // category filter is just a view of step 1's grid, not entered data, so
  // it isn't worth the restore complexity and always comes back as "all".
  useEffect(() => {
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: ProjectDraft = JSON.parse(raw);
        if (Date.now() - draft.savedAt < DRAFT_MAX_AGE_MS) {
          reset(draft.values);
          setStep(draft.step === 2 ? 2 : 1);
          setRestoredDraft(true);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      /* corrupt or inaccessible storage — carry on with a blank form */
    }
    // react-hook-form's reset() notifies watch() subscribers on its own
    // next tick rather than synchronously, which (under React 18 Strict
    // Mode's double-invoked effects, where this one runs twice) can land
    // the notification after the *second* run's subscription is already
    // live — firing a save built from a stale, pre-restore `step` closure
    // that clobbers the very draft.step just read above. Deferring "ready"
    // past that tick means that notification finds autosave still off.
    readyTimer = setTimeout(() => {
      draftReadyRef.current = true;
    }, 0);
    return () => clearTimeout(readyTimer);
    // Runs once, on mount, before anything the user does should be saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * `stepOverride` exists because the three places that change `step` (the
   * buttons below) call this in the same breath as `setStep`, when the
   * `step` state captured in this closure is still the value from *before*
   * that click — passing the new value directly avoids a save that writes
   * the stale step back over whatever a reload just restored.
   */
  const saveDraft = useCallback((stepOverride?: 1 | 2) => {
    if (!draftReadyRef.current) return;
    try {
      const draft: ProjectDraft = { values: getValues(), step: stepOverride ?? step, category: "all", savedAt: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full/unavailable (e.g. private browsing) — drafting just
       * stops working silently, nothing in the form depends on it */
    }
  }, [getValues, step]);

  // Autosave every field as it's typed.
  useEffect(() => {
    const subscription = watch(() => saveDraft());
    return () => subscription.unsubscribe();
  }, [watch, saveDraft]);

  const discardDraft = () => {
    // reset() notifies watch() on its own tick (see the restore effect's
    // comment above) — without this, that notification autosaves the
    // blank form right back to storage a moment after we clear it.
    draftReadyRef.current = false;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* already unavailable */
    }
    setRestoredDraft(false);
    reset({
      deckType: "investor",
      deckFormat: "presenter",
      currency: "INR",
      brief: {},
      hasWebsite: true,
      companyUrl: "",
      name: "",
      founders: [{ name: "", role: "", oneLiner: "", email: "", phone: "", linkedin: "" }],
      startImmediately: true,
    });
    setStep(1);
    setCategory("all");
    setLogoFile(null);
    setTimeout(() => {
      draftReadyRef.current = true;
    }, 0);
    setGalleryFiles([]);
  };

  const { fields: founderFields, append: appendFounder, remove: removeFounder } = useFieldArray({
    control,
    name: "founders",
  });

  const hasWebsite = watch("hasWebsite");

  const { mutate: createProject, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      projectsApi.create({
        name: data.name,
        companyUrl: data.hasWebsite ? data.companyUrl : undefined,
        startAnalysis: data.startImmediately,
        deckType: data.deckType,
        brandingData: {
          // Deck-type answers ride alongside the shared fields; the pipeline
          // reads them straight out of branding_data as prompt ground truth.
          ...Object.fromEntries(
            Object.entries(data.brief || {}).filter(([, v]) => String(v ?? "").trim())
          ),
          deck_format: data.deckFormat,
          // Every *_usd figure below is actually in this currency — the key
          // names predate the setting (see app/core/money.py on the backend).
          currency: data.currency,
          company_name: data.companyName,
          industry: data.industry,
          business_model: data.businessModel,
          funding_stage: data.fundingStage,
          arr_usd: data.arrUsd,
          mrr_usd: data.mrrUsd,
          total_customers: data.totalCustomers,
          monthly_active_users: data.monthlyActiveUsers,
          ask_amount_usd: data.askAmountUsd,
          round_type: data.roundType,
          founded_year: data.foundedYear,
          team_size: data.teamSize,
          growth_rate_mom_pct: data.growthRateMomPct,
          cac_usd: data.cacUsd,
          ltv_usd: data.ltvUsd,
          churn_rate_pct: data.churnRatePct,
          burn_usd: data.burnUsd,
          runway_months: data.runwayMonths,
          nrr_pct: data.nrrPct,
          ...(!data.hasWebsite && {
            problem_statement: data.problemStatement,
            solution_description: data.solutionDescription,
            target_customer: data.targetCustomer,
            traction_notes: data.tractionNotes,
            competitor_notes: data.competitorNotes,
            founders: data.founders
              .filter((f) => f.name?.trim())
              .map((f) => ({
                name: f.name || "", role: f.role || "", one_liner: f.oneLiner,
                email: f.email, phone: f.phone, linkedin: f.linkedin,
              })),
          }),
        },
      }),
    onSuccess: async (project) => {
      // Upload logo/photos to the new project (render-time assets — safe to run
      // alongside generation). Don't block navigation if the upload fails.
      const gallery = hasGallery ? galleryFiles : [];
      if (logoFile || gallery.length) {
        try {
          await projectsApi.uploadAssets(project.id, { logo: logoFile, gallery });
        } catch (e: any) {
          toast.error(e?.response?.data?.detail || "Images couldn't be uploaded");
        }
      }
      // Carry through the template picked in the gallery. Creation doesn't take
      // one, so apply it with the same update call the editor's picker uses.
      if (presetTemplate) {
        try {
          await projectsApi.update(project.id, { templateKey: presetTemplate });
        } catch {
          /* non-fatal: the deck just opens on the default template */
        }
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* already unavailable */
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created!");
      navigate(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create project");
    },
  });

  /**
   * Enforce what this deck type cannot be generated without.
   *
   * Kept out of the zod schema because the requirements come from the server
   * registry, not from anything the form knows statically. If the catalogue
   * hasn't loaded we let the request through and surface the backend's 422
   * rather than blocking on data we don't have.
   */
  const validateForDeckType = (data: FormData): boolean => {
    if (!selectedType) return true;
    let ok = true;

    for (const f of selectedType.briefFields) {
      if (f.required && !String(data.brief?.[f.name] ?? "").trim()) {
        setError(`brief.${f.name}` as never, { message: `${f.label} is required` });
        ok = false;
      }
    }

    if (!data.hasWebsite) {
      const required = new Set(selectedType.manualRequired);
      // Without a site to crawl there is no other source for the team, so a
      // deck that shows one needs the founders named here.
      if (needsFounders) { required.add("industry"); required.add("founders"); }

      for (const backendName of required) {
        const formName = SHARED_FIELD_FORM_NAMES[backendName];
        if (!formName) continue; // a brief field — already checked above
        if (formName === "founders") {
          if (!data.founders.length || !data.founders[0]?.name?.trim()) {
            setError("founders.0.name" as never, { message: "Add at least one founder" });
            ok = false;
          } else if (!data.founders[0]?.role?.trim()) {
            setError("founders.0.role" as never, { message: "Role is required" });
            ok = false;
          }
          continue;
        }
        if (!String((data as unknown as Record<string, unknown>)[formName] ?? "").trim()) {
          setError(formName as never, { message: "Required when there's no website to analyse" });
          ok = false;
        }
      }
    }

    if (!ok) toast.error("A few details are missing for this deck type");
    return ok;
  };

  const onSubmit = (data: FormData) => {
    data.startImmediately = startNow;
    // Drop answers to fields this deck doesn't ask for — typed under another
    // type, or hidden by the stage — so they never reach the prompt.
    const values = data as unknown as Record<string, unknown>;
    for (const [name, form] of GATED_FIELDS) {
      if (!asks(name)) values[form] = undefined;
    }
    if (!validateForDeckType(data)) return;
    createProject(data);
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const stepMarker = (n: 1 | 2, name: string, sub: string) => {
    const active = step === n;
    const done = step > n;
    return (
      <button
        type="button"
        style={ndS.stepBtn}
        onClick={() => { if (done) { setDir(-1); setStep(n); saveDraft(n); } }}
        aria-current={active ? "step" : undefined}
      >
        <span style={{ ...ndS.stepNum, ...(active || done ? ndS.stepNumOn : ndS.stepNumOff) }}>
          {done ? <Check size={13} /> : n}
        </span>
        <span>
          <span style={{ ...ndS.stepName, ...(active || done ? null : ndS.stepNameOff) }}>{name}</span>
          <div style={ndS.stepSub}>{sub}</div>
        </span>
      </button>
    );
  };

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      {/* Step 1 is wider to make room for the running-order panel. */}
      <div style={step === 1 ? { ...ndS.page, maxWidth: 1180 } : ndS.page}>
        {/* Back on the left, the two steps centred: one bar, as in the redesign. */}
        <div style={ndS.topbar}>
          <Link to="/dashboard" style={{ ...ndS.back, marginBottom: 0 }}>
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <div style={ndS.steps}>
            {stepMarker(1, "Deck type", "Audience & structure")}
            <span style={{ ...ndS.stepBar, flex: "0 0 36px" }} />
            {stepMarker(2, "Details", "Company & context")}
          </div>
          <span style={{ width: 90 }} aria-hidden="true" />
        </div>

        {restoredDraft && (
          <div style={ndS.draftBanner}>
            <span>We picked up where you left off — your answers were restored from this device.</span>
            <button type="button" style={ndS.draftBannerBtn} onClick={discardDraft}>Start over</button>
          </div>
        )}

        {/* One motion moment in the whole flow: moving between steps. The
            slide carries direction — forward leans left, Change leans right —
            so the swap is legible rather than instant. Springs are kept
            almost flat (bounce 0.15): this is a tool people raise money with,
            not a toy. */}
        <AnimatePresence mode="wait" initial={false} custom={reduceMotion ? 0 : dir}>
        <motion.div
          key={step}
          custom={reduceMotion ? 0 : dir}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : { type: "spring", bounce: 0.15, visualDuration: 0.3 }
          }
        >
        {step === 1 ? (
          /* ── Step 1: which deck ─────────────────────────────────────── */
          <>
            <div style={ndS.head}>
              <h1 style={ndS.h1}>Choose a deck type</h1>
              <p style={ndS.sub}>
                Each type has its own slide sequence and asks for different information.
                You can edit every slide afterwards.
              </p>
            </div>

            <div style={ndS.split}>
            <div style={ndS.splitMain}>
            <div style={ndS.filterRow}>
              <div style={ndS.seg} role="tablist" aria-label="Deck categories">
                {[{ key: "all", label: "All" }, ...CATEGORIES].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={category === c.key}
                    onClick={() => setCategory(c.key)}
                    style={{ ...ndS.segBtn, ...(category === c.key ? ndS.segOn : null) }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <span style={ndS.filterCount}>
                {visibleTypes.length} {visibleTypes.length === 1 ? "deck type" : "deck types"}
              </span>
            </div>

            <div style={ndS.typeGrid}>
              {visibleTypes.map((t) => {
                const on = t.key === deckType;
                const Icon = TYPE_ICONS[t.key] ?? Layers;
                // Investor is the most common choice, so it leads the grid at
                // full width. Prominence only — the other six read the same.
                const wide = t.key === "investor";
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setValue("deckType", t.key, { shouldValidate: true })}
                    aria-pressed={on}
                    style={{ ...ndS.typeCard, ...(wide ? ndS.typeCardWide : null), ...(on ? ndS.typeCardOn : null) }}
                  >
                    {on && <span style={ndS.tick}><Check size={12} /></span>}
                    <div style={ndS.typeTop}>
                      <span
                        style={{
                          ...ndS.typeIcon,
                          ...(on
                            ? null
                            : { ...ndS.typeIconOff, background: TYPE_TINTS[t.key]?.bg ?? "#F8FAFC", color: TYPE_TINTS[t.key]?.fg ?? "#475569" }),
                        }}
                      >
                        <Icon size={17} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <div style={ndS.typeName}>
                          {t.label}
                          {wide && <span style={ndS.popular}>Popular</span>}
                        </div>
                        <div style={ndS.typeDesc}>{t.description}</div>
                      </span>
                      <span style={on ? ndS.countPill : ndS.typeCount}>{t.slideCount} slides</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {visibleTypes.length === 0 && (
              <p style={ndS.filterCount}>No deck types in this category yet.</p>
            )}
            </div>

            {/* Inspector: the sequence for the chosen type, with the way
                forward kept beside it so the choice and the action share a view. */}
            <aside style={ndS.order} aria-label="Slide running order">
              <div style={ndS.orderHead}>
                <div style={ndS.orderTitleRow}>
                  <span style={ndS.orderTitle}>Slide running order</span>
                  <span style={ndS.orderMeta}>{runningOrder.length} slides</span>
                </div>
                {selectedType && <div style={ndS.orderPreset}>Preset for {selectedType.label}</div>}
              </div>
              <ol style={ndS.orderList}>
                {runningOrder.map((label, i) => (
                  <li key={label + i} style={ndS.orderRow}>
                    <span style={ndS.orderNum}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={ndS.orderLabel} title={label}>{label}</span>
                  </li>
                ))}
              </ol>
              <div style={ndS.orderFoot}>
                <style>{`.np-go{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border:0;cursor:pointer;padding:11px 16px;border-radius:12px;background:#059669;color:#fff;font:600 13px var(--font-body);box-shadow:0 4px 12px -4px rgba(5,150,105,.5);transition:background .2s}.np-go:hover{background:#047857}.np-go:active{background:#065F46}.np-go:focus-visible{outline:2px solid #059669;outline-offset:2px}`}</style>
                <button type="button" className="np-go" onClick={() => { setDir(1); setStep(2); saveDraft(2); }}>
                  Continue to details <ArrowRight size={15} />
                </button>
              </div>
            </aside>
            </div>
          </>
        ) : (
          /* ── Step 2: the details that type needs ────────────────────── */
          <>
            <div style={ndS.head}>
              <h1 style={ndS.h1}>Tell us about the company</h1>
              <p style={ndS.sub}>
                {hasWebsite
                  ? "Drop in a company URL and we'll research the rest."
                  : "No website yet — the details you give us are all we'll use."}
              </p>
            </div>

            <div style={ndS.chosen}>
              <span style={ndS.typeIcon}>
                {(() => { const Icon = TYPE_ICONS[deckType] ?? Layers; return <Icon size={17} />; })()}
              </span>
              <span>
                <div style={ndS.chosenName}>{selectedType?.label ?? "Investor / Fundraising"}</div>
                <div style={ndS.chosenMeta}>{runningOrder.length} slides</div>
              </span>
              <button type="button" style={ndS.changeBtn} onClick={() => { setDir(-1); setStep(1); saveDraft(1); }}>Change</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={ndS.form}>
              {/* ── Company ─────────────────────────────────────────────── */}
              <div style={ndS.panel}>
                <div>
                  <div style={ndS.panelHead}>Company</div>
                  <div style={ndS.panelSub}>Where we start researching from.</div>
                </div>

                <div style={ndS.toggleRow}>
                  <div>
                    <div style={ndS.toggleTitle}>I don't have a website yet</div>
                    <div style={ndS.toggleSub}>New or idea-stage company — tell us about it instead</div>
                  </div>
                  <Switch checked={!hasWebsite} onChange={(v) => setValue("hasWebsite", !v, { shouldValidate: true })} />
                </div>

                {hasWebsite ? (
                  <div>
                    <Input
                      label="Company website"
                      icon={<Globe size={16} />}
                      {...register("companyUrl")}
                      type="text"
                      placeholder="https://yourcompany.com"
                      error={errors.companyUrl?.message}
                    />
                    <div style={ndS.examples}>
                      {EXAMPLES.map((ex) => (
                        <button key={ex} type="button" style={ndS.exBtn}
                          onClick={() => setValue("companyUrl", "https://" + ex)}>
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={ndS.sunken}>
                    <div style={ndS.twoCol}>
                      <Input label="Company name" {...register("companyName")} placeholder="e.g. Zomato" error={errors.companyName?.message} />
                      {asks("industry") && (
                        <Input label="Industry" {...register("industry")} placeholder="e.g. Fintech, SaaS" error={errors.industry?.message} />
                      )}
                    </div>
                    {asks("problem_statement") && (
                      <Input
                        label="What problem are you solving?"
                        multiline rows={3}
                        {...register("problemStatement")}
                        placeholder="Who has this pain, and what does it cost them today?"
                        error={errors.problemStatement?.message}
                      />
                    )}
                    {asks("solution_description") && (
                      <Input
                        label="What are you building?"
                        multiline rows={3}
                        {...register("solutionDescription")}
                        placeholder="Your product/solution and what makes it different"
                        error={errors.solutionDescription?.message}
                      />
                    )}
                    {asks("target_customer") && (
                      <Input
                        label="Target customer"
                        hint="optional"
                        {...register("targetCustomer")}
                        placeholder="e.g. Mid-market logistics companies in India"
                      />
                    )}

                    {needsFounders && (
                      <div>
                        <div style={ndS.uploadLabel}>Founders</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {founderFields.map((field, i) => (
                            <div key={field.id} style={ndS.founderCard}>
                              <div style={ndS.founderRow}>
                                <Input {...register(`founders.${i}.name` as const)} placeholder="Full name"
                                  error={i === 0 ? errors.founders?.[0]?.name?.message : undefined} />
                                <Input {...register(`founders.${i}.role` as const)} placeholder="Role, e.g. Co-founder & CEO"
                                  error={i === 0 ? errors.founders?.[0]?.role?.message : undefined} />
                                <Input {...register(`founders.${i}.oneLiner` as const)} placeholder="Background (optional), e.g. Ex-Google PM" />
                                {founderFields.length > 1 && (
                                  <button type="button" style={ndS.removeBtn} onClick={() => removeFounder(i)}>
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                              <div style={ndS.founderContactRow}>
                                <Input {...register(`founders.${i}.email` as const)} placeholder="Email (optional)"
                                  error={i === 0 ? errors.founders?.[0]?.email?.message : undefined} />
                                <Input {...register(`founders.${i}.phone` as const)} placeholder="Phone (optional)" />
                                <Input {...register(`founders.${i}.linkedin` as const)} placeholder="LinkedIn URL (optional)" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          style={{ ...ndS.exBtn, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={() => appendFounder({ name: "", role: "", oneLiner: "", email: "", phone: "", linkedin: "" })}
                        >
                          <Plus size={13} /> Add founder
                        </button>
                      </div>
                    )}

                    {asks("traction_notes") && (
                      <Input
                        label="Early validation / traction"
                        hint="optional — e.g. waitlist signups, LOIs, pilot users"
                        multiline rows={2}
                        {...register("tractionNotes")}
                        placeholder="Leave blank if pre-launch — we won't invent traction"
                      />
                    )}
                    {asks("competitor_notes") && (
                      <Input
                        label="Known competitors"
                        hint="optional, comma-separated"
                        {...register("competitorNotes")}
                        placeholder="e.g. Acme Inc, Beta Corp"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ── About this deck ─────────────────────────────────────── */}
              <div style={ndS.panel}>
                <div>
                  <div style={ndS.panelHead}>About this deck</div>
                  <div style={ndS.panelSub}>
                    {selectedType?.briefFields.length
                      ? "Questions specific to the type you chose."
                      : "How this deck should be framed."}
                  </div>
                </div>

                <Input
                  label="Project name"
                  {...register("name")}
                  placeholder="e.g. Series A deck"
                  error={errors.name?.message}
                />

                {selectedType?.briefFields.map((f) => (
                  <div key={f.name}>
                    <Input
                      label={f.label}
                      hint={f.required ? undefined : "optional"}
                      multiline={f.type === "textarea"}
                      rows={f.type === "textarea" ? 3 : undefined}
                      type={f.type === "number" ? "number" : "text"}
                      placeholder={f.placeholder}
                      {...register(`brief.${f.name}` as const)}
                      error={(errors.brief as Record<string, { message?: string }> | undefined)?.[f.name]?.message}
                    />
                    {f.help && <div style={ndS.briefHint}>{f.help}</div>}
                  </div>
                ))}

                {(asks("funding_stage") || asks("business_model") || asks("round_type")) && (
                <div style={ndS.twoCol}>
                  {asks("funding_stage") && (
                    <Select
                      label="Funding stage"
                      {...register("fundingStage")}
                      options={[
                        { value: "", label: "Select stage" },
                        { value: "idea", label: "Idea" },
                        { value: "pre_seed", label: "Pre-seed" },
                        { value: "seed", label: "Seed" },
                        { value: "early_stage", label: "Early-stage" },
                        { value: "growth_stage", label: "Growth-stage" },
                        { value: "late_stage", label: "Late-stage" },
                        { value: "pre_ipo", label: "Pre-IPO" },
                        { value: "bootstrapped", label: "Bootstrapped" },
                      ]}
                    />
                  )}
                  {asks("round_type") && (
                    <Select
                      label="Funding round"
                      hint="The instrument or round this deck is raised against"
                      {...register("roundType")}
                      options={[
                        { value: "", label: "Select round" },
                        { value: "bootstrap", label: "Bootstrap" },
                        { value: "angel", label: "Angel" },
                        { value: "round", label: "Round" },
                        { value: "pre_seed", label: "Pre-seed" },
                        { value: "seed", label: "Seed" },
                        { value: "pre_series_a", label: "Pre-series A" },
                        { value: "series_a", label: "Series A" },
                        { value: "series_b", label: "Series B" },
                        { value: "series_c", label: "Series C" },
                        { value: "growth", label: "Growth" },
                        { value: "venture_debt", label: "Venture debt" },
                        { value: "debt_financing", label: "Debt financing" },
                      ]}
                    />
                  )}
                  {asks("business_model") && (
                    <Select
                      label="Business model"
                      hint="AI will detect"
                      {...register("businessModel")}
                      options={[
                        { value: "", label: "Select model" },
                        { value: "saas", label: "SaaS (software subscription)" },
                        { value: "marketplace", label: "Marketplace" },
                        { value: "services", label: "Services" },
                        { value: "ecommerce", label: "Ecommerce" },
                        { value: "fintech", label: "Fintech" },
                        { value: "hardware", label: "Hardware" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  )}
                </div>
                )}

                <div style={ndS.toggleRow}>
                  <div>
                    <div style={ndS.toggleTitle}>Someone will present this</div>
                    <div style={ndS.toggleSub}>
                      {deckFormat === "presenter"
                        ? "Minimal text on slides, detail in the speaker notes"
                        : "Read on its own — fuller text so each slide explains itself"}
                    </div>
                  </div>
                  <Switch
                    checked={deckFormat === "presenter"}
                    onChange={(v) => setValue("deckFormat", v ? "presenter" : "standalone")}
                  />
                </div>
              </div>

              {/* ── Optional details ────────────────────────────────────── */}
              <div style={ndS.panel}>
                <div>
                  <div style={ndS.panelHead}>{numberFields.length ? "Numbers & branding" : "Branding"}</div>
                  <div style={ndS.panelSub}>
                    {numberFields.length
                      ? "Optional. Only the figures this deck uses — anything you give us is used exactly as entered."
                      : "Optional. Your logo and photos for the slides."}
                  </div>
                </div>

                {numberFields.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ font: "600 12.5px var(--font-body)", color: "var(--text-strong)" }}>Currency</span>
                    <div style={ndS.seg} role="tablist" aria-label="Currency">
                      {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="tab"
                          aria-selected={currency === c}
                          onClick={() => setValue("currency", c, { shouldValidate: true })}
                          style={{ ...ndS.segBtn, ...(currency === c ? ndS.segOn : null) }}
                        >
                          {CURRENCIES[c].symbol} {c}
                        </button>
                      ))}
                    </div>
                    <span style={ndS.filterCount}>All the figures below are entered in {CURRENCIES[currency].name}.</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {hasWebsite && (
                    <div style={ndS.twoCol}>
                      <Input label="Company name" {...register("companyName")} placeholder="e.g. Zomato" />
                      <Input label="Industry" hint="AI will detect" {...register("industry")} placeholder="e.g. Fintech, SaaS" />
                    </div>
                  )}
                  {numberFields.length > 0 && (
                    <div style={ndS.twoCol}>
                      {numberFields.map((f) => (
                        <Input
                          key={f.name}
                          label={f.label}
                          hint={f.money ? `${f.hint} In ${CURRENCIES[currency].symbol} (${currency}).` : f.hint}
                          icon={f.money ? <span aria-hidden="true">{CURRENCIES[currency].symbol}</span> : undefined}
                          {...register(f.form)}
                          type={f.text ? "text" : "number"}
                          placeholder={f.placeholder}
                        />
                      ))}
                    </div>
                  )}
                  {stageHidesRevenue && (
                    <div style={ndS.briefHint}>
                      Revenue metrics are hidden at this stage — we won't ask for numbers you don't have yet.
                    </div>
                  )}

                  <div>
                    <div style={ndS.uploadLabel}>Company logo <span style={ndS.uploadHint}>· shown on every slide</span></div>
                    {logoFile ? (
                      <div style={ndS.logoRow}>
                        <img src={URL.createObjectURL(logoFile)} alt="logo" style={ndS.logoPreview} />
                        <span style={ndS.fileName}>{logoFile.name}</span>
                        <button type="button" style={ndS.removeBtn} onClick={() => setLogoFile(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <label style={ndS.dropZone}>
                        <Upload size={15} /> <span>Upload logo (PNG/SVG)</span>
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                      </label>
                    )}
                  </div>

                  {hasGallery && (
                  <div>
                    <div style={ndS.uploadLabel}>Gallery photos <span style={ndS.uploadHint}>· up to 5, shown on the Gallery slide</span></div>
                    {galleryFiles.length > 0 && (
                      <div style={ndS.thumbGrid}>
                        {galleryFiles.map((f, i) => (
                          <div key={i} style={ndS.thumbWrap}>
                            <img src={URL.createObjectURL(f)} alt={f.name} style={ndS.thumb} />
                            <button type="button" style={ndS.thumbX}
                              onClick={() => setGalleryFiles((prev) => prev.filter((_, k) => k !== i))}><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {galleryFiles.length < 5 && (
                      <label style={{ ...ndS.dropZone, marginTop: galleryFiles.length ? 10 : 0 }}>
                        <ImageIcon size={15} /> <span>Add photos ({galleryFiles.length}/5)</span>
                        <input type="file" accept="image/*" multiple style={{ display: "none" }}
                          onChange={(e) => {
                            const picked = Array.from(e.target.files || []);
                            setGalleryFiles((prev) => [...prev, ...picked].slice(0, 5));
                            e.target.value = "";
                          }} />
                      </label>
                    )}
                  </div>
                  )}
                </div>
              </div>

              <div style={ndS.toggleRow}>
                <div>
                  <div style={ndS.toggleTitle}>Generate immediately</div>
                  <div style={ndS.toggleSub}>Start AI analysis right after creating</div>
                </div>
                <Switch checked={startNow} onChange={setStartNow} />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isPending}
                iconRight={!isPending ? <ArrowRight size={16} /> : undefined}
              >
                {isPending ? "Creating…" : "Create deck"}
              </Button>

              <p style={ndS.trust}>Takes about two minutes. Every slide is editable afterwards.</p>
            </form>
          </>
        )}
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
