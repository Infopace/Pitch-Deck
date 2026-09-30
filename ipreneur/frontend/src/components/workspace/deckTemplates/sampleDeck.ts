/**
 * A small, realistic deck used to render template previews where no real deck
 * is available — the templates gallery and the public landing page.
 *
 * Shared so both surfaces preview the same content, and so the landing page can
 * show genuine rendered output instead of screenshots or invented companies.
 */
import type { TemplateDeckData } from "./types";

export const SAMPLE_DECK = {
  company: "Halyard",
  mark: "HY",
  tagline: "Port-call optimisation for container shipping",
  eyebrow: "Investor Presentation",
  year: "2026",
  round: "Series A",
  summary: {
    headline: "Ports run on estimates; charters run on minutes.",
    lead: "One agreed berth window, fused from AIS, tide and pilot data across 41 vessels.",
    highlights: [
      { k: "$2.4M", l: "ARR" },
      { k: "41", l: "Vessels live" },
      { k: "18", l: "Ports" },
      { k: "119%", l: "Net retention" },
    ],
  },
  probsol: {
    headline: "A berth missed by 90 minutes costs more than the cargo.",
    sub: "Port calls are still coordinated over email.",
    problemTitle: "The problem",
    problemLead: "Demurrage is billed by the day, not the hour.",
    solutionTitle: "Our solution",
    solutionLead: "One live berth window, agreed before arrival.",
    problem: [
      { k: "Demurrage", t: "$14,200 average per vessel-day" },
      { k: "Blind ETAs", t: "Berth windows reconciled by phone" },
      { k: "Idle laytime", t: "31% of calls start late" },
    ],
    solution: [
      { k: "Live ETA", t: "AIS, tide and pilot data in one curve" },
      { k: "Slot broker", t: "Terminal, agent and master confirm in-app" },
      { k: "Laytime ledger", t: "Every minute attributed to the charter" },
    ],
    problemFoot: "$9.8M a year of avoidable cost.",
    solutionFoot: "Calls start 46 minutes earlier by month three.",
  },
  market: {
    headline: "Demurrage alone is a $6.1B leak.",
    tam: { v: "$6.1B", l: "Global port-call software" },
    sam: { v: "$1.4B", l: "Container lines, 20+ vessel fleets" },
    som: { v: "$180M", l: "Northern Europe & Med" },
    note: "Bottom-up: 5,400 vessels over 20k TEU × $34k median annual spend.",
  },
  traction: {
    headline: "Four quarters, four times the ARR.",
    sub: "ARR ($M)",
    series: [
      { y: "Q1", v: 0.6 }, { y: "Q2", v: 1.1 }, { y: "Q3", v: 1.7 }, { y: "Q4", v: 2.4 },
    ],
    kpis: [
      { k: "$2.4M", l: "ARR" }, { k: "41", l: "Vessels" },
      { k: "18", l: "Ports" }, { k: "119%", l: "Net retention" },
    ],
  },
  team: {
    headline: "Operators from the terminal side.",
    members: [
      { i: "DM", n: "Dana Moreau", r: "CEO & Co-founder", b: "10 yrs Maersk port ops" },
      { i: "RK", n: "Rafi Kaur", r: "CTO & Co-founder", b: "Ex-Spire, AIS pipelines" },
      { i: "TN", n: "Tomas Nyberg", r: "VP Terminal", b: "Ex-APM Rotterdam" },
      { i: "SL", n: "Sara Lindqvist", r: "Head of Data", b: "Ex-Kpler" },
    ],
    advisors: "Advised by former heads of ops at Hapag-Lloyd and DP World.",
  },
  ask: {
    headline: "Raising $14M Series A",
    sub: "To reach 200 vessels across 40 ports.",
    use: [
      { l: "Engineering & data", p: 42 }, { l: "Port operations", p: 26 },
      { l: "Go-to-market", p: 22 }, { l: "G&A", p: 10 },
    ],
  },
  closing: {
    headline: "Get the fleet alongside on time.",
    sub: "Turning every port call into a scheduled event.",
    contact: "dana@halyard.io",
    site: "halyard.io",
  },
} as unknown as TemplateDeckData;
