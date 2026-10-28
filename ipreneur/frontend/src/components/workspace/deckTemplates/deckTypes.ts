/**
 * Frontend mirror of the backend deck-type registry.
 *
 * Mirrors backend/app/decks/registry.py (slide sequences) and the renderer +
 * eyebrow half of backend/app/decks/sections.py. The backend owns the models,
 * prompts and skeletons; this side only needs to know, for each section key,
 * WHICH renderer draws it and WHAT eyebrow sits above it.
 *
 * That split is what lets one renderer serve several sections: `probsol` draws
 * the problem/solution slide, the risks/mitigations slide, and the partnership
 * "what each side brings" slide — same layout, different key, different eyebrow.
 *
 * A generated deck persists its own resolved order as `deck_content.slide_order`,
 * and `slideOrder()` prefers that over the table here — so an existing deck keeps
 * rendering the slides it was actually generated with even after this file changes.
 *
 * `backend/test_deck_registry.py::test_spec_is_complete` fails if the backend
 * names a renderer that isn't in RENDERERS over in TemplatedDeck.tsx.
 */

export type RendererId =
  | "cover" | "summary" | "probsol" | "product" | "market" | "model"
  | "traction" | "competition" | "roadmap" | "gallery" | "team" | "ask"
  | "closing" | "proof" | "persona" | "vision";

export interface SlideSlot {
  /** template_data key this slide reads, and the root of its edit paths. */
  key: string;
  renderer: RendererId;
  /** Small label above the headline. Distinguishes reused renderers. */
  eyebrow: string;
}

/** Section key → how it is drawn. Mirrors SECTION_SPECS.renderer. */
const SECTIONS: Record<string, { renderer: RendererId; eyebrow: string }> = {
  // Shared
  cover: { renderer: "cover", eyebrow: "" },
  summary: { renderer: "summary", eyebrow: "Executive summary" },
  probsol: { renderer: "probsol", eyebrow: "Problem & solution" },
  product: { renderer: "product", eyebrow: "Product" },
  market: { renderer: "market", eyebrow: "Market size" },
  model: { renderer: "model", eyebrow: "Business model" },
  traction: { renderer: "traction", eyebrow: "Traction" },
  competition: { renderer: "competition", eyebrow: "Competition" },
  roadmap: { renderer: "roadmap", eyebrow: "Roadmap" },
  galleryS: { renderer: "gallery", eyebrow: "Gallery" },
  team: { renderer: "team", eyebrow: "Team" },
  ask: { renderer: "ask", eyebrow: "The ask" },
  closing: { renderer: "closing", eyebrow: "Thank you" },

  // Sales
  proof: { renderer: "proof", eyebrow: "Proof" },
  roi: { renderer: "traction", eyebrow: "ROI & business impact" },

  // Product / demo
  persona: { renderer: "persona", eyebrow: "Who it's for" },

  // Partnership
  partnerRole: { renderer: "probsol", eyebrow: "What each side brings" },
  partnershipModel: { renderer: "model", eyebrow: "Partnership model" },
  gtm: { renderer: "roadmap", eyebrow: "Go-to-market together" },

  // Internal
  recommendation: { renderer: "summary", eyebrow: "Recommendation" },
  options: { renderer: "competition", eyebrow: "Options considered" },
  risks: { renderer: "probsol", eyebrow: "Risks & mitigations" },

  // Investor update
  period: { renderer: "summary", eyebrow: "This period" },
  wins: { renderer: "product", eyebrow: "Wins & challenges" },

  // Vision
  vision: { renderer: "vision", eyebrow: "Vision" },
  values: { renderer: "product", eyebrow: "Operating principles" },
  pillars: { renderer: "product", eyebrow: "Strategic pillars" },

  // ── Go-to-market / business / master (Phase 3) ──────────────────────
  // All of these route through renderers that already exist, which is why
  // six new deck types needed no new React components.
  positioning: { renderer: "probsol", eyebrow: "Positioning" },
  messaging: { renderer: "product", eyebrow: "Messaging" },
  segmentation: { renderer: "competition", eyebrow: "Customer Segments" },
  acquisition: { renderer: "product", eyebrow: "Acquisition" },
  channels: { renderer: "competition", eyebrow: "Channels" },
  funnel: { renderer: "roadmap", eyebrow: "Funnel" },
  distribution: { renderer: "product", eyebrow: "Distribution" },
  unitEconomics: { renderer: "traction", eyebrow: "Unit Economics" },
  scalePlan: { renderer: "roadmap", eyebrow: "Scale Plan" },
  salesMotion: { renderer: "roadmap", eyebrow: "Sales Motion" },
  financials: { renderer: "traction", eyebrow: "Financials" },
  operations: { renderer: "product", eyebrow: "Operations" },
  story: { renderer: "summary", eyebrow: "Our Story" },
  techIp: { renderer: "product", eyebrow: "Technology & IP" },
  security: { renderer: "product", eyebrow: "Security & Compliance" },
  moat: { renderer: "probsol", eyebrow: "Moat & Defensibility" },
  capTable: { renderer: "ask", eyebrow: "Cap Table" },
  partnerships: { renderer: "product", eyebrow: "Partnerships" },
  // ── Appendix evidence sections ─────────────────────────────────────
  // Views onto existing renderers; which of these a deck contains is decided
  // at generation time from the company's data and persisted as slide_order.
  evMarket: { renderer: "market", eyebrow: "Market Sizing Workings" },
  evCustomer: { renderer: "persona", eyebrow: "Customer Research" },
  evCompetitive: { renderer: "competition", eyebrow: "Competitive Analysis" },
  evProduct: { renderer: "product", eyebrow: "Product Details" },
  evArchitecture: { renderer: "product", eyebrow: "Technical Architecture" },
  evSecurity: { renderer: "product", eyebrow: "Security & Compliance" },
  evTraction: { renderer: "traction", eyebrow: "Traction Details" },
  evCohort: { renderer: "traction", eyebrow: "Cohorts & Retention" },
  evUnitEconomics: { renderer: "traction", eyebrow: "Unit Economics" },
  evFunnel: { renderer: "roadmap", eyebrow: "Sales Funnel" },
  evChannels: { renderer: "competition", eyebrow: "GTM Performance" },
  evFinancials: { renderer: "traction", eyebrow: "Financial Statements" },
  evForecast: { renderer: "traction", eyebrow: "Financial Forecast" },
  evFundraising: { renderer: "ask", eyebrow: "Fundraising" },
  evCapTable: { renderer: "ask", eyebrow: "Cap Table" },
  evLegal: { renderer: "product", eyebrow: "Legal & IP" },
  evCustomerProof: { renderer: "proof", eyebrow: "Customer Proof" },
  evPartnerships: { renderer: "product", eyebrow: "Partnerships" },
  evRoadmap: { renderer: "roadmap", eyebrow: "Detailed Roadmap" },
  evSources: { renderer: "product", eyebrow: "Sources & Evidence" },
};

export interface DeckTypeSpec {
  key: string;
  label: string;
  description: string;
  sections: string[];
}

export const DEFAULT_DECK_TYPE = "investor";

export const DECK_TYPES: Record<string, DeckTypeSpec> = {
  investor: {
    key: "investor",
    label: "Investor / Fundraising",
    description: "Raise capital from angels or VCs. Problem, market, traction, team, ask.",
    sections: [
      "cover", "summary", "story", "probsol", "persona", "product", "galleryS", "techIp",
      "market", "segmentation", "model", "traction", "proof", "unitEconomics", "competition",
      "moat", "gtm", "financials", "roadmap", "risks", "team", "ask", "capTable", "closing",
    ],
  },
  sales: {
    key: "sales",
    label: "Sales / Customer",
    description: "Win a customer. Their pain, your fix, proof it works, pricing, next step.",
    sections: [
      "cover", "probsol", "persona", "competition", "product", "galleryS", "proof", "roi",
      "unitEconomics", "security", "model", "partnerships", "roadmap", "closing",
    ],
  },
  product: {
    key: "product",
    label: "Product / Demo",
    description: "Show the product. User, workflow, screens, differentiators, roadmap.",
    sections: [
      "cover", "persona", "probsol", "product", "galleryS", "techIp", "security", "proof",
      "competition", "moat", "model", "traction", "roadmap", "closing",
    ],
  },
  partnership: {
    key: "partnership",
    label: "Partnership / Collaboration",
    description: "Propose a partnership. Mutual value, model, joint GTM, economics.",
    sections: [
      "cover", "summary", "probsol", "product", "partnerRole", "partnershipModel",
      "segmentation", "gtm", "distribution", "traction", "proof", "techIp", "roadmap", "ask",
      "closing",
    ],
  },
  internal: {
    key: "internal",
    label: "Internal / Decision Memo",
    description: "Get internal buy-in. Recommendation, options, plan, resources, risks.",
    sections: [
      "cover", "recommendation", "probsol", "summary", "product", "options", "roadmap", "ask",
      "risks", "closing",
    ],
  },
  update: {
    key: "update",
    label: "Investor Update",
    description: "Report to existing investors. Metrics, wins, challenges, asks, outlook.",
    sections: [
      "cover", "period", "traction", "wins", "roadmap", "market", "team", "closing",
    ],
  },
  vision: {
    key: "vision",
    label: "Vision / Mission",
    description: "Align people on the long game. Vision, principles, pillars, horizons.",
    sections: [
      "cover", "vision", "summary", "values", "pillars", "roadmap", "traction", "closing",
    ],
  },

  general: {
    key: "general",
    label: "General / Company Overview",
    description: "The foundational company story. Problem, solution, market, model, team.",
    sections: [
      "cover", "summary", "story", "probsol", "persona", "product", "galleryS", "market",
      "model", "traction", "proof", "competition", "moat", "gtm", "roadmap", "team", "vision",
      "ask", "risks", "closing",
    ],
  },
  elevator: {
    key: "elevator",
    label: "Elevator Pitch",
    description: "Five slides. Hook, problem, product, proof, ask — nothing else.",
    sections: [
      "cover", "probsol", "product", "traction", "closing",
    ],
  },
  demoday: {
    key: "demoday",
    label: "Demo Day",
    description: "A ten-minute stage pitch. Hook, pain, product, market, proof, ask.",
    sections: [
      "cover", "probsol", "persona", "product", "market", "traction", "competition", "team",
      "ask", "closing",
    ],
  },
  gtm: {
    key: "gtm",
    label: "Go-to-Market",
    description: "How you reach, convert and keep customers. ICP, channels, funnel, economics.",
    sections: [
      "cover", "summary", "market", "persona", "segmentation", "positioning", "messaging",
      "acquisition", "channels", "salesMotion", "funnel", "distribution", "partnerships",
      "unitEconomics", "proof", "traction", "scalePlan", "operations", "roadmap", "risks",
      "team", "closing",
    ],
  },
  business: {
    key: "business",
    label: "Business Plan",
    description: "How the company operates, earns and scales. Model, sales, ops, financials.",
    sections: [
      "cover", "summary", "probsol", "persona", "product", "model", "segmentation",
      "positioning", "salesMotion", "gtm", "funnel", "channels", "traction", "proof",
      "unitEconomics", "financials", "ask", "operations", "partnerships", "competition", "team",
      "roadmap", "risks", "scalePlan", "closing",
    ],
  },
  master: {
    key: "master",
    label: "Extended / Master",
    description: "The complete company record. Every section, for reuse and reference.",
    sections: [
      "cover", "summary", "story", "probsol", "persona", "product", "techIp", "security",
      "market", "model", "traction", "unitEconomics", "gtm", "salesMotion", "operations",
      "partnerships", "competition", "moat", "financials", "ask", "capTable", "roadmap",
      "risks", "team", "closing",
    ],
  },
  appendix: {
    key: "appendix",
    label: "Appendix / Evidence",
    description: "The evidence behind every claim. Workings, sources and supporting data.",
    // Bookends only: the evidence slides between them are resolved per company at
    // generation time, and the deck's persisted slide_order carries the real list.
    sections: ["cover", "closing"],
  },
};

/**
 * The slide sequence to render.
 *
 * `stored` is the deck's own persisted `slide_order`, which is authoritative —
 * it reflects the stage overrides actually applied at generation time and
 * survives later edits to this registry. Falls back to the deck type's default,
 * then to the investor deck (what every pre-multi-type project is).
 */
export function slideOrder(
  deckType?: string | null,
  stored?: readonly string[] | null,
  available?: Readonly<Record<string, unknown>> | null
): SlideSlot[] {
  const spec = DECK_TYPES[deckType || DEFAULT_DECK_TYPE] ?? DECK_TYPES[DEFAULT_DECK_TYPE];
  let keys: readonly string[];

  if (stored && stored.length) {
    // The deck recorded the sequence it was generated against — always wins.
    keys = stored;
  } else if (available) {
    // A deck generated before `slide_order` was persisted. Using the current
    // registry default would be wrong: deck types get longer over time, and the
    // extra sections have no content in an older deck, so it would render a run
    // of blank slides. Keep the registry's ORDER but only the sections this
    // deck actually has data for.
    const present = spec.sections.filter((k) => available[k] != null);
    keys = present.length ? ["cover", ...present.filter((k) => k !== "cover")] : spec.sections;
  } else {
    keys = spec.sections;
  }

  return keys
    .filter((k) => SECTIONS[k])
    .map((k) => ({ key: k, renderer: SECTIONS[k].renderer, eyebrow: SECTIONS[k].eyebrow }));
}

export function deckTypeLabel(deckType?: string | null): string {
  return (DECK_TYPES[deckType || DEFAULT_DECK_TYPE] ?? DECK_TYPES[DEFAULT_DECK_TYPE]).label;
}
