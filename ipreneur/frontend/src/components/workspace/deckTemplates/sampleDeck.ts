/**
 * A small, realistic deck used to render template previews where no real deck
 * is available — the templates gallery and the public landing page.
 *
 * Shared so both surfaces preview the same content, and so the landing page can
 * show genuine rendered output instead of screenshots or invented companies.
 *
 * Covers every section the "investor" deck type renders (see deckTypes.ts) so
 * no slide in the 24-slide preview is left blank.
 */
import type { TemplateDeckData } from "./types";

export const SAMPLE_DECK = {
  company: "Veyra",
  mark: "VY",
  tagline: "AI patient-matching for clinical trials",
  eyebrow: "Investor Presentation",
  year: "2026",
  round: "Series A",
  summary: {
    headline: "Trial sites still screen patients by hand, one chart at a time.",
    lead: "AI-matched patient recruitment across 58 trial sites, cutting enrollment timelines by more than half.",
    highlights: [
      { k: "$2.8M", l: "ARR" },
      { k: "58", l: "Trial sites live" },
      { k: "3.1x", l: "Faster enrollment" },
      { k: "121%", l: "Net retention" },
    ],
  },
  story: {
    headline: "A clinical coordinator's stack of charts, in 2022.",
    lead: "Our founders ran trial operations at a top-10 CRO. Every delayed trial traced back to the same bottleneck: coordinators manually reading charts to find eligible patients. Veyra started as an internal tool to surface eligible patients automatically instead of by hand.",
    highlights: [
      { k: "2022", l: "Founded in Boston" },
      { k: "5", l: "Pilot sites before product-market fit" },
      { k: "$280K", l: "Bootstrapped revenue pre-raise" },
      { k: "13", l: "Months to first paid contract" },
    ],
  },
  probsol: {
    headline: "A Phase II trial delayed nine months — for lack of forty patients.",
    sub: "Patient recruitment is still a manual chart review.",
    problemTitle: "The problem",
    problemLead: "Eligible patients exist in the system; nobody has time to find them.",
    solutionTitle: "Our solution",
    solutionLead: "Every eligible patient surfaced the moment they qualify.",
    problem: [
      { k: "Slow screening", t: "Coordinators manually review 40+ charts per enrolled patient" },
      { k: "Missed eligibility", t: "80% of eligible patients are never approached about a trial" },
      { k: "Trial delays", t: "Enrollment alone adds 6–12 months to most trial timelines" },
    ],
    solution: [
      { k: "Live matching", t: "EHR data scanned continuously against trial eligibility criteria" },
      { k: "Coordinator queue", t: "Ranked, explainable match list delivered to site staff daily" },
      { k: "Enrollment tracking", t: "Real-time dashboard for sponsors across every site" },
    ],
    problemFoot: "The average Phase II/III trial misses its enrollment deadline by seven months.",
    solutionFoot: "Sites using Veyra hit enrollment targets 3.1x faster.",
  },
  persona: {
    headline: "Built for the person chasing the enrollment deadline.",
    sub: "Clinical trial coordinators and site investigators, not sponsors.",
    who: "Clinical Trial Coordinator",
    context: "Academic medical center or health system, running 8–15 active trials.",
    jobs: [
      { k: "Screen patients", t: "Needs to find every eligible patient, not just the obvious ones" },
      { k: "Hit enrollment targets", t: "Reports weekly progress against the sponsor's timeline" },
      { k: "Document eligibility", t: "Must justify every match against the trial's inclusion criteria" },
    ],
    pains: [
      { k: "Manual chart review", t: "Hours spent per week reading charts for one or two eligible patients" },
      { k: "Missed patients", t: "Eligible patients are discharged before anyone flags them" },
      { k: "Sponsor pressure", t: "Falling behind enrollment targets risks losing the trial to another site" },
    ],
    quote: "I used to find eligible patients by accident — someone would mention a case in the hallway.",
  },
  product: {
    headline: "From EHR record to ranked match, continuously.",
    sub: "Veyra screens every patient against every open trial, all the time.",
    steps: [
      { n: "01", t: "Continuous screening", d: "EHR data is scanned against trial eligibility criteria as records update, not on request.", tags: ["EHR integration", "HL7/FHIR", "Real-time"] },
      { n: "02", t: "Explainable matches", d: "Each match shows exactly which criteria it meets, so coordinators can verify in seconds.", tags: ["Ranked queue", "Audit trail", "Mobile"] },
      { n: "03", t: "Sponsor dashboard", d: "Enrollment progress tracked live across every site running the trial.", tags: ["Reporting", "Export", "API"] },
    ],
  },
  galleryS: {
    headline: "Inside a live enrollment queue.",
    sub: "What coordinators, investigators and sponsors each see during a trial.",
    slots: [
      { id: "g1", ph: "Coordinator match queue", span: true },
      { id: "g2", ph: "Mobile eligibility review" },
      { id: "g3", ph: "Site enrollment pacing" },
      { id: "g4", ph: "Criteria match explanation" },
      { id: "g5", ph: "Sponsor enrollment dashboard", span: true },
    ],
  },
  techIp: {
    headline: "Built on matching most platforms can't attempt.",
    sub: "Three years of criteria-extraction data feeding a purpose-built matching model.",
    steps: [
      { n: "01", t: "Proprietary criteria model", d: "Trained on 12,000+ labeled trial protocols to extract structured eligibility rules.", tags: ["Patent pending", "94% precision"] },
      { n: "02", t: "EHR integration layer", d: "Direct HL7/FHIR connections mean matches run against live records, not weekly exports.", tags: ["Real-time", "HIPAA-compliant"] },
      { n: "03", t: "HITRUST infrastructure", d: "Multi-tenant isolation with per-site encryption keys and full audit logging.", tags: ["HITRUST", "SOC 2 Type II"] },
    ],
  },
  market: {
    headline: "Clinical trial recruitment is a $3.8B bottleneck.",
    tam: { v: "$3.8B", l: "Global clinical trial recruitment software" },
    sam: { v: "$960M", l: "US academic medical centers & health systems" },
    som: { v: "$140M", l: "Sites running 5+ active trials" },
    note: "Bottom-up: 2,400 qualifying sites × $58k median annual spend.",
  },
  segmentation: {
    headline: "We start where enrollment delays hurt most.",
    cols: ["Academic medical centers", "Community health systems", "CROs", "Specialty clinics"],
    rows: [
      { f: "8+ active trials at once", v: [true, false, true, false] },
      { f: "EHR data in a structured system", v: [true, true, true, false] },
      { f: "Sponsor-driven enrollment deadlines", v: [true, false, true, true] },
      { f: "Dedicated coordinator staff", v: [true, true, false, false] },
    ],
  },
  model: {
    headline: "Per-site SaaS, priced to active trial load.",
    flow: ["Site onboarded", "EHR connected", "Matches generated", "Enrollment reported"],
    streams: [
      { t: "Site subscription", d: "Per-site monthly fee covering unlimited concurrent trials", v: "$1.8M", vl: "ARR, 64% of revenue" },
      { t: "Sponsor reporting", d: "Add-on dashboard fee billed to the trial sponsor", v: "$1.0M", vl: "ARR, 36% of revenue" },
    ],
    tiers: [
      { t: "Site", p: "$2,400", s: "/mo", d: "Up to 10 concurrent trials, continuous matching" },
      { t: "Health system", p: "$6,800", s: "/mo", d: "Unlimited trials across sites, sponsor dashboard included" },
      { t: "Enterprise", p: "Custom", s: "", d: "Multi-system consolidation, SSO, dedicated support" },
    ],
  },
  traction: {
    headline: "Four quarters, nearly triple the ARR.",
    sub: "ARR ($M)",
    series: [
      { y: "Q1", v: 1.0 }, { y: "Q2", v: 1.6 }, { y: "Q3", v: 2.2 }, { y: "Q4", v: 2.8 },
    ],
    kpis: [
      { k: "$2.8M", l: "ARR" }, { k: "58", l: "Trial sites" },
      { k: "3.1x", l: "Faster enrollment" }, { k: "121%", l: "Net retention" },
    ],
  },
  proof: {
    headline: "Three trial sites, three different deadlines, one fix.",
    sub: "Case studies from the first twelve months live.",
    cases: [
      { c: "Grayson Medical Center", m: "5.5 months", ml: "enrollment time saved", d: "A Phase III trial across three departments hit its enrollment target five and a half months ahead of the original timeline.", q: "We finally found the patients who were in our own system the whole time." },
      { c: "Lower Valley Health System", m: "214", ml: "additional eligible patients surfaced", d: "Continuous screening across 12 active trials found patients that manual review had missed entirely.", q: "" },
      { c: "Brookline Clinical Research", m: "9 hrs → 1 hr", ml: "weekly chart review per coordinator", d: "Coordinators across the CRO's six sites now review a ranked queue instead of searching charts.", q: "Our coordinators do patient care again instead of chart archaeology." },
    ],
    logos: ["Grayson Medical Center", "Lower Valley Health", "Brookline Clinical Research", "Fieldstone Health Network"],
  },
  unitEconomics: {
    headline: "Each site pays for itself in seven weeks.",
    sub: "CAC payback (months)",
    series: [
      { y: "Cohort 1", v: 3.4 }, { y: "Cohort 2", v: 2.6 }, { y: "Cohort 3", v: 2.0 }, { y: "Cohort 4", v: 1.6 },
    ],
    kpis: [
      { k: "$48K", l: "ACV per site" }, { k: "7 wks", l: "CAC payback" },
      { k: "80%", l: "Gross margin" }, { k: "121%", l: "Net dollar retention" },
    ],
  },
  competition: {
    headline: "Everyone reports enrollment. We accelerate it.",
    cols: ["Veyra", "Manual chart review", "Generic trial management software", "EHR search tools alone"],
    rows: [
      { f: "Continuous, live patient matching", v: [true, false, false, false] },
      { f: "Explainable eligibility criteria", v: [true, false, true, false] },
      { f: "Sponsor-facing live dashboard", v: [true, false, true, false] },
      { f: "Built for multi-site health systems", v: [true, false, false, false] },
      { f: "Live in under six weeks", v: [true, true, false, true] },
    ],
  },
  moat: {
    headline: "Matching accuracy compounds; chart review doesn't.",
    sub: "Every trial we screen sharpens the next protocol's criteria extraction.",
    problemTitle: "Why this is hard to copy",
    problemLead: "Criteria extraction accuracy takes years of labeled protocol data to earn.",
    solutionTitle: "Why we keep winning",
    solutionLead: "Each protocol we screen feeds the model that serves the next one.",
    problem: [
      { k: "Protocol data", t: "12,000+ labeled trial protocols across 40 therapeutic areas" },
      { k: "Cold start", t: "New entrants need two-plus years of labeled criteria data to match our precision" },
      { k: "Integration depth", t: "Direct EHR partnerships, not a reporting layer bolted on" },
    ],
    solution: [
      { k: "Flywheel", t: "More sites in means tighter criteria extraction and faster time-to-match" },
      { k: "Switching cost", t: "The enrollment dashboard becomes the sponsor's system of record" },
      { k: "Network effect", t: "Coordinators and sponsors both see value before either side switches" },
    ],
    problemFoot: "No generic trial management tool can replicate this without the EHR relationships.",
    solutionFoot: "58 sites and counting — each one raises the bar for the next entrant.",
  },
  gtm: {
    headline: "One coordinator, then the health system around them.",
    sub: "Land-and-expand inside a single site's trial portfolio.",
    items: [
      { q: "Phase 1", t: "Site-led pilot", d: "Land one coordinator team on a single trial, free for 90 days." },
      { q: "Phase 2", t: "Portfolio rollout", d: "Expand from the pilot trial to every active trial at the site." },
      { q: "Phase 3", t: "Sponsor-led referral", d: "Sponsors request Veyra at new sites once they see the dashboard." },
    ],
  },
  financials: {
    headline: "Path to $17M ARR by 2028.",
    sub: "ARR ($M), modeled",
    series: [
      { y: "2026", v: 2.8 }, { y: "2027", v: 8.1 }, { y: "2028", v: 17.0 },
    ],
    kpis: [
      { k: "80%", l: "Gross margin" }, { k: "15 mo", l: "Runway at close" },
      { k: "3.0x", l: "Net burn multiple" }, { k: "Q4 2027", l: "Projected breakeven" },
    ],
  },
  roadmap: {
    headline: "From academic medical centers to every trial site.",
    sub: "Eighteen months out.",
    items: [
      { q: "Now", t: "58 sites live", d: "Academic medical centers and CROs across the Northeast." },
      { q: "Q2 2026", t: "Community health expansion", d: "Add workflows built for smaller coordinator teams." },
      { q: "Q4 2026", t: "Specialty clinic support", d: "Extend matching to oncology and rare-disease trial criteria." },
      { q: "2027", t: "International expansion", d: "First UK and EU health-system partnerships." },
    ],
  },
  risks: {
    headline: "What could slow us down, and how we're covering it.",
    sub: "The risks we track every board meeting.",
    problemTitle: "Key risks",
    problemLead: "Three things we watch closely.",
    solutionTitle: "Mitigations",
    solutionLead: "Already in motion.",
    problem: [
      { k: "EHR dependency", t: "Each new EHR vendor integration takes months to certify" },
      { k: "Regulatory change", t: "Trial eligibility rules can shift mid-study" },
      { k: "Customer concentration", t: "Our top three sites are 37% of ARR" },
    ],
    solution: [
      { k: "Vendor-agnostic layer", t: "HL7/FHIR standard integration covers 85% of target EHRs out of the box" },
      { k: "Human-in-the-loop", t: "Coordinators confirm every match before it's acted on" },
      { k: "Pipeline diversification", t: "19 sites in active pilot, cutting concentration by Q4" },
    ],
    problemFoot: "Reviewed quarterly against the board.",
    solutionFoot: "Concentration falls under 28% by year end.",
  },
  team: {
    headline: "Operators from the trial side.",
    members: [
      { i: "NM", n: "Nina Markovic", r: "CEO & Co-founder", b: "9 yrs trial ops at IQVIA" },
      { i: "JT", n: "Jonah Teller", r: "CTO & Co-founder", b: "Ex-Epic, EHR integrations" },
      { i: "AO", n: "Amara Osei", r: "VP Clinical Partnerships", b: "Ex-Mass General Brigham" },
      { i: "PV", n: "Priya Venkat", r: "Head of Data", b: "Ex-Flatiron Health" },
    ],
    advisors: "Advised by former clinical operations chiefs at IQVIA and Flatiron Health.",
  },
  ask: {
    headline: "Raising $15M Series A",
    sub: "To reach 250 trial sites across four therapeutic areas.",
    use: [
      { l: "Engineering & data", p: 38 }, { l: "Clinical & regulatory", p: 26 },
      { l: "Go-to-market", p: 26 }, { l: "G&A", p: 10 },
    ],
  },
  capTable: {
    headline: "Clean cap table, room for a lead.",
    sub: "$2.3M raised to date across a pre-seed SAFE round.",
    use: [
      { l: "Founders", p: 57 }, { l: "Employee pool", p: 12 },
      { l: "Pre-seed investors", p: 23 }, { l: "Series A (this round)", p: 8 },
    ],
  },
  closing: {
    headline: "Find every eligible patient, the day they qualify.",
    sub: "Turning trial enrollment from a bottleneck into a pipeline.",
    contact: "nina@veyra.health",
    site: "veyra.health",
  },
} as unknown as TemplateDeckData;

/**
 * Alternate cover identities, cycled across thumbnail grids (template
 * galleries, theme-switcher strips) so a wall of the same renderer doesn't
 * show "Veyra" dozens of times over. Only the cover-relevant fields change —
 * the full 24-section story above, used by the single big deck preview,
 * always stays Veyra's so that view reads as one coherent deck.
 */
const COVER_VARIANTS: Pick<TemplateDeckData, "company" | "mark" | "tagline" | "round">[] = [
  { company: "Veyra", mark: "VY", tagline: "AI patient-matching for clinical trials", round: "Series A" },
  { company: "Fathom Robotics", mark: "FR", tagline: "Autonomous inventory counts for warehouse teams", round: "Seed" },
  { company: "Larkspur", mark: "LK", tagline: "Payroll built for seasonal workforces", round: "Series A" },
  { company: "Cobalt Analytics", mark: "CA", tagline: "Supply-chain risk forecasting for manufacturers", round: "Series B" },
  { company: "Driftline", mark: "DL", tagline: "Route optimization for last-mile delivery fleets", round: "Seed" },
  { company: "Hearthwood", mark: "HW", tagline: "Load forecasting for commercial buildings", round: "Series A" },
  { company: "Quillpoint", mark: "QP", tagline: "Contract review automation for legal teams", round: "Seed" },
  { company: "Marrow Health", mark: "MH", tagline: "Remote monitoring for post-op recovery", round: "Series A" },
];

/** SAMPLE_DECK with its cover identity swapped for variant `index % length`. */
export function sampleDeckVariant(index: number): TemplateDeckData {
  const n = COVER_VARIANTS.length;
  const v = COVER_VARIANTS[((index % n) + n) % n];
  return { ...SAMPLE_DECK, ...v };
}
