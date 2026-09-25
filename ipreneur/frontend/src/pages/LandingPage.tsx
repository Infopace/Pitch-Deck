import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Play,
  CheckCircle2,
  ChevronRight,
  Layout,
  Globe,
  FileText,
  BarChart3,
  Shield,
  Layers,
  Eye,
  Download,
  Star,
  HelpCircle,
  ArrowUpRight,
  Palette,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Cpu,
  Check,
  Share2,
  Lock,
} from "lucide-react";

import HeroSection from "@/components/landing/HeroSection";

// ── Showcase Slides for Interactive Live Preview ──────────────────────────────
interface SlideContent {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  type: "problem" | "solution" | "market" | "traction" | "business" | "ask";
  badgeColor: string;
}

const LIVE_SLIDES: SlideContent[] = [
  {
    id: 1,
    tag: "01 · The Problem",
    title: "Legacy Slide Software Was Built for 1995, Not Founders Raising Capital",
    subtitle: "Founders spend 40+ hours per pitch deck aligning text boxes and wrestling PowerPoint templates. The result? Dense, uninspiring slides that fail to hook investors.",
    type: "problem",
    badgeColor: "text-black border-black/[0.10] bg-[#F4F4F5]",
  },
  {
    id: 2,
    tag: "02 · The Solution",
    title: "AI-Native Pitch Medium: From URL to Investor Deck in 90 Seconds",
    subtitle: "iPreneur automatically parses your company website, synthesizes your value proposition, models your market size, and formats a polished narrative ready for institutional VCs.",
    type: "solution",
    badgeColor: "text-black border-black/[0.14] bg-[#F4F4F5]",
  },
  {
    id: 3,
    tag: "03 · Market Sizing",
    title: "Tapping a $64B Global Presentation & Venture Intelligence Market",
    subtitle: "Over 2.4M new technology startups are funded globally every year, each requiring multiple bespoke decks across Seed, Series A, customer pilots, and Board updates.",
    type: "market",
    badgeColor: "text-black border-black/[0.14] bg-[#F4F4F5]",
  },
  {
    id: 4,
    tag: "04 · Traction & Velocity",
    title: "Explosive Product-Led Growth: 4.8x YoY with $2.1M ARR",
    subtitle: "Strong founder word-of-mouth driving organic referral loops across top tier accelerators like Y Combinator, Techstars, and Sequoia scout networks.",
    type: "traction",
    badgeColor: "text-[#047857] border-black/[0.14] bg-[#F4F4F5]",
  },
  {
    id: 5,
    tag: "05 · Business Model",
    title: "High-Margin SaaS + Enterprise Venture Deal-Flow Subscriptions",
    subtitle: "Predictable recurring revenue with 88% gross margins and 142% Net Dollar Retention (NDR) across growing startup teams and accelerator cohorts.",
    type: "business",
    badgeColor: "text-black border-black/[0.10] bg-[#F4F4F5]",
  },
  {
    id: 6,
    tag: "06 · The Ask",
    title: "Raising $3.5M Seed to Scale AI Generation & Investor Intelligence",
    subtitle: "Allocation: 60% Engineering & Multimodal LLMs, 25% Growth & Accelerator Partnerships, 15% Operations & Investor Deal Network.",
    type: "ask",
    badgeColor: "text-black border-black/[0.14] bg-[#F4F4F5]",
  },
];

// ── Prompt Suggestions for the Generator Bar ─────────────────────────────────
const PROMPT_SUGGESTIONS = [
  "Series A pitch deck for an AI healthcare triage copilot",
  "Seed stage deck for autonomous drone logistics in supply chain",
  "Fintech developer API replacing legacy core banking architecture",
  "B2B SaaS customer retention engine with predictive churn ML",
  "ClimateTech carbon offset verification platform using satellite radar",
];

// ── Format Options ────────────────────────────────────────────────────────────
const FORMAT_TABS = [
  { id: "pitch-deck", label: "Pitch deck", desc: "10–13 investor-vetted slides" },
  { id: "executive", label: "Executive", desc: "Dense financial and growth metrics" },
  { id: "seed", label: "Seed", desc: "High-signal problem-solution format" },
  { id: "one-pager", label: "Web summary", desc: "Interactive link you can send" },
];

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 1,
    title: "Next-Gen AI SaaS Platform",
    category: "AI & SaaS",
    stage: "Series A ($14M Raised)",
    slides: "12 Slides",
    headline: "The Intelligence Engine for Autonomous Enterprise",
    subhead: "Multimodal AI Orchestration Layer for Complex Enterprise Workflows",
    metrics: [
      { label: "ARR Run-Rate", value: "$14.2M" },
      { label: "Net Retention", value: "142% NDR" },
      { label: "Gross Margin", value: "88%" },
    ],
    accentColor: "from-[#110c26] to-[#080514]",
    tagColor: "text-[#C4B5FD] border-[#A78BFA]/30 bg-[#8B5CF6]/15",
    rating: "4.95",
    tags: ["LLM Architecture", "ARR Growth", "Team Moat"],
  },
  {
    id: 2,
    title: "Nexus Pay Global Infrastructure",
    category: "Fintech",
    stage: "Series Seed ($4.2M)",
    slides: "10 Slides",
    headline: "Borderless Treasury & Global Developer Payments",
    subhead: "Instant Multi-Currency Liquidity & Programmable Settlement Engine",
    metrics: [
      { label: "Payment Volume", value: "$12.4B" },
      { label: "Transactions", value: "215M+" },
      { label: "Multi-Currency", value: "50+ Pairs" },
    ],
    accentColor: "from-[#041a18] to-[#020d0c]",
    tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    rating: "4.98",
    tags: ["Payments Volume", "Multi-Currency", "SOC 2 Type II"],
  },
  {
    id: 3,
    title: "Autonomous Drone Logistics Network",
    category: "DeepTech",
    stage: "Seed ($5.5M)",
    slides: "11 Slides",
    headline: "Autonomous Middle-Mile Air Cargo Logistics",
    subhead: "Zero-Emission Heavy Payload Drones for Critical Supply Chains",
    metrics: [
      { label: "Active Routes", value: "14 Hubs" },
      { label: "Market TAM", value: "$84B" },
      { label: "Regulation", value: "FAA Part 135" },
    ],
    accentColor: "from-[#051822] to-[#020b10]",
    tagColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    rating: "4.92",
    tags: ["Hardware Moat", "Pilot Contracts", "TAM $84B"],
  },
  {
    id: 4,
    title: "Venture Intelligence & Market Sizing",
    category: "Enterprise",
    stage: "Series B ($28M)",
    slides: "14 Slides",
    headline: "Real-Time Venture Dealflow & Market Intelligence",
    subhead: "Automated Competitor Analysis and Verified Market Sizing Models",
    metrics: [
      { label: "Decks Analyzed", value: "500K+" },
      { label: "Capital Raised", value: "$680M+" },
      { label: "Partner Response", value: "94% Rate" },
    ],
    accentColor: "from-[#081226] to-[#040813]",
    tagColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    rating: "4.99",
    tags: ["Market Share", "Competitor Matrix", "Web Crawling"],
  },
];

// ── FAQs ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How does iPreneur generate a deck from just a URL or prompt?",
    a: "iPreneur uses intelligent web-crawling to scan your landing page, product docs, and public materials. It then extracts your core value propositions, target customer profiles, and competitive moats. Claude 3.5 and venture financial models craft a tight 10-to-12 slide narrative formatted with pixel-perfect precision.",
  },
  {
    q: "Can I export my finished deck to Microsoft PowerPoint (.pptx) or PDF?",
    a: "Yes! Every deck can be exported with a single click to native Microsoft PowerPoint (.pptx) vector files or high-res vector PDFs. All shapes, texts, tables, and metric cards remain 100% editable in PowerPoint, Keynote, or Google Slides.",
  },
  {
    q: "Can I share a live link with investors and track their views?",
    a: "Absolutely. Much like Gamma, every iPreneur deck has a published responsive web link. You can send it directly to investors, and our built-in viewer telemetry dashboard will notify you when they open it, showing how many minutes they spent on each slide.",
  },
  {
    q: "How does the AI market research & TAM calculation work?",
    a: "Instead of guessing market size on spreadsheets, iPreneur's AI queries live industry data, SEC filings, and recent comparable funding rounds to calculate defensible TAM, SAM, and SOM figures, complete with source citations that investors respect.",
  },
  {
    q: "Is my proprietary startup data and pitch material private?",
    a: "Yes. Your drafts, numbers, and inputs are encrypted with AES-256 at rest and TLS 1.3 in transit. We never use your proprietary pitch deck data or financial metrics to train public AI models.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState("pitch-deck");
  const [promptText, setPromptText] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const currentSlide = LIVE_SLIDES[activeSlideIndex];


  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = promptText.trim() || PROMPT_SUGGESTIONS[0];
    navigate(`/register?prompt=${encodeURIComponent(query)}&format=${selectedFormat}`);
  };

  const handleChipClick = (suggestion: string) => {
    setPromptText(suggestion);
  };

  const nextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % LIVE_SLIDES.length);
  };

  const prevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + LIVE_SLIDES.length) % LIVE_SLIDES.length);
  };

  const filteredTemplates =
    selectedCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="ipr-landing min-h-screen selection:bg-black/10 relative">
      <div>
        {/* ── HERO SECTION ── */}
        <HeroSection />

        {/* ── LOGOS & SOCIAL PROOF BAR ─────────────────────────────────── */}
        {/* ── Proof ─────────────────────────────────────────────────────────
             The figures are the content; the four identical rounded cards
             they used to sit in were only packaging. A hairline grid gives
             them structure without dressing each one as an object. ───────── */}
        <section className="l-panel border-y border-black/[0.07]">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.10]">
              {[
                { v: "500K+", label: "Decks generated" },
                { v: "$680M+", label: "Raised by founders using them" },
                { v: "94%", label: "Reach a second meeting" },
                { v: "90s", label: "Average build time" },
              ].map((s) => (
                <div key={s.label} className="l-panel px-5 py-7 sm:px-7">
                  <div className="font-[family-name:var(--font-display)] text-[2rem] sm:text-[2.5rem] font-extrabold tracking-[-0.035em] leading-none text-black tabular-nums">
                    {s.v}
                  </div>
                  <div className="l-body mt-2.5 text-[13px]">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-baseline justify-center gap-x-9 gap-y-3">
              <span className="l-meta">Built by founders backed by</span>
              {[
                "Y Combinator",
                "Sequoia",
                "Techstars",
                "a16z crypto",
                "Accel",
                "Founders Fund",
              ].map((n) => (
                <span
                  key={n}
                  className="text-[15px] font-semibold tracking-[-0.015em] text-[#52525B]"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE INTERACTIVE DECK SHOWCASE (GAMMA SLIDE VIEWER) ───────── */}
        <section id="showcase" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto bg-transparent">
          <div className="max-w-[46rem] mb-10">
            <h2 className="l-title mb-4">Click through one it already wrote</h2>
            <p className="l-lede">
              This is a real thirteen-slide investor deck, rendered the way it
              arrives. Move between slides and watch the layout hold — the
              numbers, the charts and the type stay aligned on every one.
            </p>
          </div>

          {/* Slide Deck Container */}
          <div className="bg-[#FAFAFA] rounded-3xl border border-black/[0.10] shadow-none overflow-hidden">
            {/* Top Toolbar: Slide Tabs */}
            <div className="p-4 sm:p-5 border-b border-black/[0.10] bg-[#FAFAFA] flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
                {LIVE_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      activeSlideIndex === idx
                        ? "bg-black text-white shadow-none"
                        : "text-[#52525B] hover:text-black hover:bg-black/[0.05]"
                    }`}
                  >
                    {slide.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Slide Canvas */}
            <div className="p-6 sm:p-12 min-h-[420px] sm:min-h-[480px] bg-[#FAFAFA] border-b border-black/[0.10] flex flex-col justify-between transition-colors duration-500 relative">
              {/* Slide Meta Badge */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentSlide.badgeColor}`}>
                  {currentSlide.tag}
                </span>
                <div className="flex items-center gap-3 text-xs opacity-70 font-mono">
                  <span>Nexus AI · Series A</span>
                  <span>•</span>
                  <span>Confidential</span>
                </div>
              </div>

              {/* Slide Content Core */}
              <div className="my-8 max-w-3xl">
                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4 text-black">
                  {currentSlide.title}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed mb-8 text-[#52525B]">
                  {currentSlide.subtitle}
                </p>

                {/* Conditional Dynamic Data Blocks per Slide */}
                {currentSlide.type === "problem" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-[#DC2626] text-xl font-bold">40+ Hours</div>
                      <div className="text-xs text-[#52525B] mt-1">Wasted per pitch deck on slide layout</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-amber-600 text-xl font-bold">82% Drop-off</div>
                      <div className="text-xs text-[#52525B] mt-1">VCs discard dense bullet-point slides</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black text-xl font-bold">Stale Data</div>
                      <div className="text-xs text-[#52525B] mt-1">Manual spreadsheets miss market shifts</div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "solution" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black font-bold text-sm mb-1">Web Crawl Engine</div>
                      <div className="text-xs text-[#52525B]">Extracts positioning, tech stack, and ICP in seconds</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black font-bold text-sm mb-1">Claude 3.5 Storycraft</div>
                      <div className="text-xs text-[#52525B]">Narrative framing tailored for tier-1 partner meetings</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black font-bold text-sm mb-1">Responsive Decks</div>
                      <div className="text-xs text-[#52525B]">Flawless on phone screens and conference projectors</div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "market" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-xs uppercase font-bold text-[#52525B]">Total Addressable (TAM)</div>
                      <div className="text-2xl font-black text-black mt-1">$64 Billion</div>
                      <div className="text-[11px] text-[#52525B] mt-1">Global enterprise presentation spend</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-xs uppercase font-bold text-black">Serviceable (SAM)</div>
                      <div className="text-2xl font-black text-black mt-1">$18.2 Billion</div>
                      <div className="text-[11px] text-[#52525B] mt-1">Tech founders &amp; venture ecosystems</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-xs uppercase font-bold text-black">Obtainable (SOM)</div>
                      <div className="text-2xl font-black text-black mt-1">$3.4 Billion</div>
                      <div className="text-[11px] text-[#52525B] mt-1">AI-assisted deck creation &amp; analytics</div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "traction" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-[#047857] text-xl font-bold">+380% YoY</div>
                      <div className="text-xs text-[#52525B] mt-1">Organic user growth via founder shares</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black text-xl font-bold">$180K MRR</div>
                      <div className="text-xs text-[#52525B] mt-1">Scaling towards $4.5M ARR run-rate</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black text-xl font-bold">142% NDR</div>
                      <div className="text-xs text-[#52525B] mt-1">Team seat expansions across startups</div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "business" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black font-bold text-sm">Self-Serve Pro ($29/mo)</div>
                      <div className="text-xs text-[#52525B] mt-1">Unlimited AI deck generations, PowerPoint export, viewer analytics</div>
                    </div>
                    <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                      <div className="text-black font-bold text-sm">Venture &amp; Accelerator Tier ($499/mo)</div>
                      <div className="text-xs text-[#52525B] mt-1">Batch deck auditing, branded accelerator themes, deal-flow portals</div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "ask" && (
                  <div className="p-4 rounded-xl border border-black/[0.10] bg-[#FAFAFA]">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className="text-sm font-bold text-black">Use of Funds ($3.5M Seed Round)</span>
                      <span className="text-xs font-mono font-bold text-black">$1.8M already committed by lead VC</span>
                    </div>
                    <div className="w-full h-3 bg-[#EFEFF1] rounded-full overflow-hidden flex">
                      <div className="bg-black h-full w-[60%]" title="60% Multimodal AI & Engineering" />
                      <div className="bg-black h-full w-[25%]" title="25% Go-To-Market & Accelerator Growth" />
                      <div className="bg-black/30 h-full w-[15%]" title="15% Operations & Legal" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#52525B] mt-2 font-medium">
                      <span>■ 60% AI Core &amp; Infra</span>
                      <span>■ 25% Growth</span>
                      <span>■ 15% Ops</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Nav Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.07]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevSlide}
                    className="px-3 py-1.5 rounded-lg border border-black/[0.14] bg-[#FAFAFA] hover:bg-black/[0.05] text-xs font-bold text-black transition-colors shadow-none"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={nextSlide}
                    className="px-3 py-1.5 rounded-lg border border-black/[0.14] bg-[#FAFAFA] hover:bg-black/[0.05] text-xs font-bold text-black transition-colors shadow-none"
                  >
                    Next →
                  </button>
                  <span className="text-xs text-[#52525B] ml-2 font-mono">
                    Slide {activeSlideIndex + 1} of {LIVE_SLIDES.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/register"
                    className="text-xs px-4 py-1.5 rounded-full font-bold bg-black text-white hover:bg-[#27272A] transition-colors flex items-center gap-1.5 shadow-none"
                  >
                    <Download className="w-3.5 h-3.5 text-white/70" />
                    <span>Export This Deck</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FORMAT CARDS: "GENERATE ANYTHING IN SECONDS" ─────────────── */}
        <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-black/[0.07] bg-transparent">
          <div className="max-w-[46rem] mb-12">
            <span className="ipr-eyebrow mb-2 block">
              Flexible AI Formats
            </span>
            <h2 className="l-title">
              One prompt. Every format your raise demands.
            </h2>
            <p className="l-lede mt-4">
              Break free from rigid 16:9 boxes. Create pitch decks, dense memos, or live shareable web summaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Pitch Decks */}
            <div className="bg-[#FAFAFA] rounded-2xl p-7 border border-black/[0.10] shadow-none hover:shadow-none hover:border-black/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] text-black flex items-center justify-center mb-6 shadow-none">
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Investor Pitch Decks</h3>
                <p className="text-sm text-[#52525B] leading-relaxed mb-6">
                  Thirteen sequenced slides curated for VC partner meetings. Problem, market size, traction, and unit economics organized with razor-sharp clarity.
                </p>
              </div>
              <div className="pt-4 border-t border-black/[0.07] flex items-center justify-between text-xs text-black font-bold">
                <span>PPTX + PDF Ready</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: Interactive Web Summaries */}
            <div className="bg-[#FAFAFA] rounded-2xl p-7 border border-black/[0.10] shadow-none hover:shadow-none hover:border-black/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] text-black flex items-center justify-center mb-6 shadow-none">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Interactive Web Decks</h3>
                <p className="text-sm text-[#52525B] leading-relaxed mb-6">
                  Send investors a lightning-fast responsive link. No bulky 45MB email attachments. Includes built-in slide analytics to see who is reading.
                </p>
              </div>
              <div className="pt-4 border-t border-black/[0.07] flex items-center justify-between text-xs text-black font-bold">
                <span>Live View Analytics</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: Executive One-Pagers */}
            <div className="bg-[#FAFAFA] rounded-2xl p-7 border border-black/[0.10] shadow-none hover:shadow-none hover:border-black/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] text-black flex items-center justify-center mb-6 shadow-none">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Executive One-Pagers</h3>
                <p className="text-sm text-[#52525B] leading-relaxed mb-6">
                  High-density investor memos perfect for initial cold outreach and angel syndicates. Packs team credentials, growth KPIs, and the round ask.
                </p>
              </div>
              <div className="pt-4 border-t border-black/[0.07] flex items-center justify-between text-xs text-black font-bold">
                <span>High Signal Teaser</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </section>

        {/* ── VISUAL DEEP DIVES (FEATURING GENERATED IMAGES) ───────────── */}
        <section id="features" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-black/[0.07] bg-transparent">
          {/* Feature 1: Market Research */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F4F5] border border-black/[0.10] text-xs font-bold text-black mb-4">
                <Cpu className="w-3.5 h-3.5 text-black" />
                <span>Automated Market Intelligence</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight leading-tight mb-4">
                Never guess your TAM or competitor landscape again.
              </h3>
              <p className="text-[#52525B] text-base leading-relaxed mb-6">
                Most pitch decks get shredded during partner meetings for generic market stats. iPreneur crawls current industry metrics, queries venture databases, and generates defensible market sizing charts backed by real data.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Calculates defensible TAM, SAM, and SOM with cited methodologies
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Auto-maps 2x2 competitor positioning matrix highlighting your unique moat
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Extracts recent valuation multiples and exit comparables in your sector
                  </span>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-black/[0.10] shadow-none bg-black">
              <img
                src="/images/market_research_ai.jpg"
                alt="Market Opportunity TAM, SAM, SOM Pitch Deck Slide"
                className="w-full h-auto object-cover transform transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>

          {/* Feature 2: Investor Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-black/[0.10] shadow-none bg-black">
              <img
                src="/images/investor_analytics.jpg"
                alt="Live Investor Deck Telemetry Review on Tablet"
                className="w-full h-auto object-cover transform transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F4F5] border border-black/[0.14] text-xs font-bold text-black mb-4">
                <Eye className="w-3.5 h-3.5" />
                <span>Deal-Flow Telemetry</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight leading-tight mb-4">
                See exactly which slides investors spend time on.
              </h3>
              <p className="text-[#52525B] text-base leading-relaxed mb-6">
                Stop wondering if the partner actually opened your deck. iPreneur delivers slide-by-slide engagement telemetry so you enter every pitch meeting armed with unfair information.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Real-time notifications when an investor opens your link
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Heatmap of seconds spent on financials vs team vs unit economics
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F4F4F5] text-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-[#3F3F46] font-medium">
                    Password protection, expiration dates, and one-click access revocation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TEMPLATE GALLERY ────────────────────────────────────────── */}
        <section id="templates" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-black/[0.07] bg-transparent">
          <div className="max-w-[46rem] mb-12">
            <span className="ipr-eyebrow mb-2 block">
              Venture-Vetted Templates
            </span>
            <h2 className="l-title">
              Start with decks that actually raised capital
            </h2>
            <p className="l-lede mt-4">
              Browse proven pitch deck architectures modeled after successful Series Seed and Series A raises.
            </p>

            {/* Category Filters */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-8">
              {["All", "AI & SaaS", "Fintech", "DeepTech", "Enterprise"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                    selectedCategory === cat
                      ? "bg-black text-white shadow-none"
                      : "bg-[#F4F4F5] text-[#52525B] hover:text-black hover:bg-black/[0.05]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-[#FAFAFA] rounded-2xl overflow-hidden border border-black/[0.10] hover:border-black/30 transition-all duration-300 group flex flex-col justify-between shadow-none hover:shadow-none"
              >
                {/* Real-time Pitch Deck Slide Preview */}
                <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${template.accentColor} p-6 sm:p-7 flex flex-col justify-between select-none border-b border-white/10 group-hover:scale-[1.01] transition-transform duration-300`}>
                  {/* Slide Top Meta */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${template.tagColor}`}>
                        {template.category}
                      </span>
                      <span className="text-[10px] font-mono text-white/60">{template.stage}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/10">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{template.rating}</span>
                    </div>
                  </div>

                  {/* Slide Main Content */}
                  <div className="my-auto z-10 py-2">
                    <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Slide 01 · Pitch Deck Overview
                    </div>
                    <h5 className="text-white font-extrabold text-base sm:text-lg leading-snug tracking-tight mb-1">
                      {template.headline}
                    </h5>
                    <p className="text-white/60 text-xs line-clamp-1">
                      {template.subhead}
                    </p>
                  </div>

                  {/* Slide Bottom Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 z-10">
                    {template.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="bg-white/[0.10] backdrop-blur-md rounded-lg p-2 sm:p-2.5 border border-white/10 text-left">
                        <div className="text-[9px] sm:text-[10px] text-white/50 uppercase font-semibold truncate">{m.label}</div>
                        <div className="text-xs sm:text-sm font-black text-white mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ambient subtle glow effects */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-lg font-bold text-black group-hover:text-black transition-colors">
                      {template.title}
                    </h4>
                    <span className="text-xs text-[#52525B] font-mono">{template.slides}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FAFAFA] border border-black/[0.10] text-[#52525B]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.07]">
                    <span className="text-xs font-bold text-[#52525B]">{template.category}</span>
                    <Link
                      to={`/register?template=${encodeURIComponent(template.title)}`}
                      className="text-xs px-4 py-2 rounded-full font-bold bg-black text-white hover:bg-[#27272A] transition-colors flex items-center gap-1.5"
                    >
                      <span>Use Template</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BEFORE & AFTER COMPARISON ────────────────────────────────── */}
        <section id="comparison" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-black/[0.07] bg-transparent">
          <div className="max-w-[46rem] mb-12">
            <span className="ipr-eyebrow mb-2 block">
              The Fundamental Upgrade
            </span>
            <h2 className="l-title">
              Why top founders are ditching legacy slides
            </h2>
            <p className="l-lede mt-4">
              Comparing 1990s slide software with iPreneur's AI-native presentation engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="p-8 rounded-3xl bg-[#FAFAFA] border border-[#DC2626]/25 shadow-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#DC2626]/[0.08] text-[#DC2626] flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-xl font-bold text-[#B91C1C]">The Traditional Slide Way</h3>
              </div>

              <div className="space-y-4 text-sm text-[#52525B]">
                <div className="flex items-start gap-3">
                  <span className="text-[#DC2626] font-bold">•</span>
                  <span><strong>40+ hours spent:</strong> Wrestling text box margins, font sizes, and layout bugs.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#DC2626] font-bold">•</span>
                  <span><strong>Wall of text bullets:</strong> VCs get bored after slide 2 and miss your key traction.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#DC2626] font-bold">•</span>
                  <span><strong>Stale market stats:</strong> Copy-pasting outdated analyst charts from Google image search.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#DC2626] font-bold">•</span>
                  <span><strong>Clunky attachments:</strong> 50MB PDFs that bounce in VC inboxes or look broken on mobile.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#DC2626] font-bold">•</span>
                  <span><strong>Zero viewer telemetry:</strong> Complete blind spot on whether an investor actually read your deck.</span>
                </div>
              </div>
            </div>

            {/* The iPreneur Way */}
            <div className="p-8 rounded-3xl bg-[#F4F4F5] border-2 border-black/25 shadow-none relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-black">The iPreneur Way</h3>
              </div>

              <div className="space-y-4 text-sm text-[#3F3F46]">
                <div className="flex items-start gap-3">
                  <span className="text-black font-bold">✓</span>
                  <span><strong>Ready in 90 seconds:</strong> A full thirteen-slide narrative built from your URL or prompt.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-black font-bold">✓</span>
                  <span><strong>Adaptive card layouts:</strong> Crisp visuals, charts, and metrics formatted automatically.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-black font-bold">✓</span>
                  <span><strong>Live market research:</strong> Defensible TAM/SAM/SOM modeled with recent comparable rounds.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-black font-bold">✓</span>
                  <span><strong>Responsive web link + PPTX:</strong> Opens instantly on phones, laptops, and Keynote/PowerPoint.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-black font-bold">✓</span>
                  <span><strong>Slide heatmaps:</strong> Know the second an investor opens your deck and what they spent time on.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS / WALL OF LOVE ─────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-black/[0.07] bg-transparent">
          <div className="max-w-[46rem] mb-12">
            <span className="ipr-eyebrow mb-2 block">
              Founder Experiences
            </span>
            <h2 className="l-title">
              Trusted by founders who closed rounds
            </h2>
            <p className="l-lede mt-4">
              Real stories from founders who raised millions using iPreneur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl bg-[#FAFAFA] border border-black/[0.10] shadow-none hover:shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-black mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-black" />
                  ))}
                </div>
                <p className="text-[#3F3F46] text-sm leading-relaxed mb-6 italic">
                  "We closed our $3.2M Seed in under three weeks. The lead partner specifically mentioned that our deck stood out from the 50 other pitch decks he saw that week because of the clarity of our market TAM and unit economics."
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.07]">
                <div>
                  <div className="text-sm font-bold text-black">Elena Rostova</div>
                  <div className="text-xs text-[#52525B]">CEO, SynthAI (YC W25)</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded font-bold bg-[#F4F4F5] text-black">
                  $3.2M Seed
                </span>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#FAFAFA] border border-black/[0.10] shadow-none hover:shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-black mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-black" />
                  ))}
                </div>
                <p className="text-[#3F3F46] text-sm leading-relaxed mb-6 italic">
                  "I was spending entire weekends fighting PowerPoint formatting. With iPreneur, dropping our staging URL produced an 11-slide deck with our exact brand typography and colors in 90 seconds. Mind-blowing."
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.07]">
                <div>
                  <div className="text-sm font-bold text-black">Marcus Vance</div>
                  <div className="text-xs text-[#52525B]">Co-founder, NovaPay</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-[#F4F4F5] text-black font-bold">
                  $12M Series A
                </span>
              </div>
            </div>

            <div className="p-7 rounded-2xl bg-[#FAFAFA] border border-black/[0.10] shadow-none hover:shadow-none flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-black mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-black" />
                  ))}
                </div>
                <p className="text-[#3F3F46] text-sm leading-relaxed mb-6 italic">
                  "The investor analytics are an unfair advantage. Knowing that a partner spent 3 minutes re-reading our gross margin slide allowed me to open our partner meeting directly addressing their unit economics questions."
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-black/[0.07]">
                <div>
                  <div className="text-sm font-bold text-black">Priya Sharma</div>
                  <div className="text-xs text-[#52525B]">Founder, BioPulse</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-[#F4F4F5] text-black font-bold">
                  $5.8M Seed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── INTERACTIVE FAQ ACCORDION ────────────────────────────────── */}
        <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-black/[0.07] bg-transparent">
          <div className="max-w-[46rem] mb-12">
            <span className="ipr-eyebrow mb-2 block">
              Common Questions
            </span>
            <h2 className="l-title">
              Everything you need to know
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#FAFAFA] rounded-xl border border-black/[0.10] shadow-none overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 text-black font-bold text-base sm:text-lg hover:text-black"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-black flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#52525B] flex-shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-[#52525B] text-sm leading-relaxed border-t border-black/[0.07] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA BANNER ─────────────────────────────────────────── */}
        {/* ── Closing ───────────────────────────────────────────────────────
             The one large dark surface on the page. It reads as the end of a
             deck rather than as another section. ──────────────────────────── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-[1100px] mx-auto">
            <div className="rounded-[28px] bg-black text-white px-8 sm:px-14 py-14 sm:py-20">
              <p className="text-[13px] text-white/55 mb-6">
                Free to start. No card required.
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-[2.25rem] sm:text-[3.5rem] font-extrabold tracking-[-0.038em] leading-[1.0] max-w-[18ch] mb-6">
                Your next raise starts with a great deck.
              </h2>
              <p className="text-[17px] leading-[1.55] text-white/70 max-w-[48ch] mb-10">
                Paste your website and read the first draft in about ninety
                seconds. Every slide is yours to edit afterwards.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-5">
                <Link
                  to="/register"
                  className="l-press inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-semibold bg-white text-black rounded-full hover:bg-white/90 transition-colors duration-150 self-start"
                >
                  <span>Build my deck</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/60">
                  <span>300 free credits</span>
                  <span>PowerPoint and PDF export</span>
                  <span>Your data stays private</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MODERN FOOTER ───────────────────────────────────────────── */}
        <footer className="border-t border-black/[0.07] bg-transparent py-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/ipreneur-logo.webp"
                alt="iPreneur"
                className="h-6 w-auto object-contain"
              />
              <span className="text-xs text-[#52525B] font-mono">
                © 2026 iPreneur Inc. · Minimalist Edition
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-[#52525B]">
              <a href="#features" className="hover:text-black transition-colors">Features</a>
              <a href="#templates" className="hover:text-black transition-colors">Templates</a>
              <a href="#comparison" className="hover:text-black transition-colors">Comparison</a>
              <Link to="/login" className="hover:text-black transition-colors">Sign in</Link>
              <Link to="/register" className="hover:text-black transition-colors">Get Started</Link>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#047857] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#F4F4F5] animate-pulse" />
              <span>All AI Generators Operational</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
