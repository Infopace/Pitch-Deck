/**
 * Landing page.
 *
 * Every claim here is checked against the code. The previous version advertised
 * PDF export, shareable investor links with view tracking, "100% editable"
 * PowerPoint output and Claude 3.5 — none of which the product does — plus
 * usage figures and investor logos that were invented. Nothing on this page
 * states a capability the application does not have.
 *
 * Product previews are rendered live through the real slide renderer, so what a
 * visitor sees is literally what the generator produces.
 *
 * Copy refreshed from "Mint Landing Page Content.docx" (2026-10-28) — a
 * consultant brief modeled on Pitch.com's structure. Every section and CTA
 * label in the brief is on the page now, in the brief's own wording wherever
 * that wording is true of the product. Three specific departures, each
 * required by the facts rather than a style choice:
 *   - Hero/How It Works keep the real website-URL intake instead of the
 *     brief's free-text "describe your idea" prompt box — there is no chat
 *     prompt in this product, and a fake one would be a dead input.
 *   - The Use Cases personas drop "Students and Educators" — there is no
 *     academic deck type in the registry to back that claim up.
 *   - The brief's "Meet Your AI Presentation Assistant" section (with a
 *     mocked-up input box) is kept as "Every number comes with its reasoning
 *     attached" instead — same slot, but describing the real two-pass
 *     research and audit instead of a prompt UI that doesn't exist, again to
 *     avoid a second dead input on the page.
 * The FAQ keeps its own real answers rather than the brief's placeholder
 * instructions ("Insert your actual pricing here", etc.) — those are notes
 * to the implementer, not copy to publish.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ChevronDown, Globe, Search, Sparkles,
  PencilLine, Layers, FileText, Minus, FileSearch,
  ShieldCheck, LayoutGrid, Zap,
} from "lucide-react";

import HeroSection from "@/components/landing/HeroSection";
import LandingFooter from "@/components/landing/LandingFooter";
import MintStoryGraphic from "@/components/landing/MintStoryGraphic";
import { THEMES, getTheme, ensureDeckFonts } from "@/components/workspace/deckTemplates/themes";
import { sampleDeckVariant } from "@/components/workspace/deckTemplates/sampleDeck";
import { renderSlide } from "@/components/workspace/deckTemplates/TemplatedDeck";
import { FitSlide } from "@/components/workspace/deckTemplates/FitSlide";
import { VIEW_CTX } from "@/components/workspace/deckTemplates/editing/editableText";
import { slideOrder, DECK_TYPES, deckTypeLabel } from "@/components/workspace/deckTemplates/deckTypes";

// ── Facts, each verified against the source ──────────────────────────────────
// 13 deck types ........ backend/app/decks/registry.py
// 40 templates ......... deckTemplates/themes.ts (4 families x 10)
// 5-25 slides .......... resolve_sections() per deck type
// Gemini two-pass ...... agents/master/master_agent.py:332 (_research_pass)
// .pptx with charts .... ppt/engine/renderer.py (add_chart / add_table / add_textbox)

const ORDER = slideOrder("investor");

// "appendix" is a dynamically-generated evidence section, not a deck a
// visitor sets out to buy — excluded here and from pricing, same as the
// backend's app.decks.pricing.
const SELLABLE_DECK_TYPES = Object.keys(DECK_TYPES).filter((k) => k !== "appendix");

const CAPABILITIES = [
  { v: String(SELLABLE_DECK_TYPES.length), label: "deck types, each with its own slide sequence" },
  { v: "40", label: "designs, switchable on any deck at any time" },
  { v: "5–25", label: "slides, decided by the deck type you pick" },
  { v: ".pptx", label: "export with native charts and editable text" },
];

// One-time, per-deck pricing — mirrors app.decks.pricing.DECK_PRICES_INR on
// the backend exactly, since that's what checkout actually charges. Grouped
// by tier, highest first, matching GET /billing/pricing's own ordering.
const DECK_PRICES_INR: { key: string; price: number }[] = [
  { key: "investor", price: 699 },
  { key: "gtm", price: 699 },
  { key: "business", price: 699 },
  { key: "partnership", price: 699 },
  { key: "master", price: 699 },
  { key: "general", price: 599 },
  { key: "vision", price: 599 },
  { key: "sales", price: 499 },
  { key: "product", price: 499 },
  { key: "demoday", price: 499 },
  { key: "update", price: 399 },
  { key: "internal", price: 399 },
  { key: "elevator", price: 399 },
];

// What the research pass actually does, and what checks the output before a
// visitor sees it — the credibility angle the generic "AI assistant" framing
// in the brief didn't have the detail to cover.
const TRUST_POINTS = [
  {
    icon: Search,
    title: "Live research, not recall",
    body: "The first pass runs live web search for your market, competitors and comparable companies, rather than relying on what the model happened to learn in training.",
  },
  {
    icon: FileSearch,
    title: "Confidence scores on every fact",
    body: "Each researched fact carries how sure the model is about it, so a shaky figure is never presented with the same weight as a well-sourced one.",
  },
  {
    icon: ShieldCheck,
    title: "A second pass checks the first",
    body: "Before a deck reaches you, a separate, deterministic check looks for numbers that contradict each other, certifications with no evidence, and figures that don't match what you told it.",
  },
];

const WHY_MINT = [
  "Start faster: go from an idea or a URL to a full slide sequence, not a blank canvas.",
  "Structure your story: every deck type follows the sequence that room actually expects — a sales deck doesn't borrow an investor deck's order.",
  "Create with confidence: research arrives sourced, and a second pass checks the output before you see it.",
  "Adapt to your audience: the same company facts read differently in a sales deck, an investor deck and an internal memo.",
  "Change your mind anytime: 40 designs apply to a deck you've already written, so changing one never means starting over.",
];

// Brief's "Product Introduction" three cards — Card 1 adapted from "describe
// your topic" to "share your website", since that's the real intake.
const PRODUCT_INTRO_CARDS = [
  {
    step: "01",
    title: "Start With Your Website",
    body: "Share your company's website. Get a structured presentation draft tailored to your business.",
  },
  {
    step: "02",
    title: "Create Beautiful Slides",
    body: "Turn your content into visually engaging slides with clear layouts, compelling headlines, and a professional presentation flow.",
  },
  {
    step: "03",
    title: "Present With Confidence",
    body: "Refine your message, personalize your content, and prepare a presentation that is ready to share with your audience.",
  },
];

// Brief's "Features" section, filtered to the six capabilities the product
// actually has — all verified against the same facts listed above.
const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Content Generation",
    blurb: "From a company website to a structured presentation.",
    body: "Mint runs live research on your market and writes slide content from it, so you start from a full draft, not a blank page.",
  },
  {
    icon: Layers,
    title: "Professional Slide Design",
    blurb: "Make every slide look presentation-ready.",
    body: "Every deck comes out laid out in one of 40 designs, with organized layouts, clear typography and a consistent visual style.",
  },
  {
    icon: FileSearch,
    title: "Smart Content Structuring",
    blurb: "Bring clarity to every idea.",
    body: "Each deck type follows the slide sequence that room actually expects, from a five-slide teaser to a full board narrative.",
  },
  {
    icon: PencilLine,
    title: "Customizable Presentations",
    blurb: "Make the presentation your own.",
    body: "Click any headline, bullet or number to edit it, upload your logo and photos, and download a .pptx you can keep editing.",
  },
  {
    icon: LayoutGrid,
    title: "Multiple Presentation Use Cases",
    blurb: "One tool. Thirteen kinds of room.",
    body: "Build decks for fundraising, sales, internal decisions, partnerships and more — each with its own slide sequence.",
  },
  {
    icon: Zap,
    title: "Faster Presentation Creation",
    blurb: "Less time formatting. More time deciding what to say.",
    body: "Start from your website instead of a blank page, and let the research and first draft happen before you open the editor.",
  },
];

// Brief's "Use Cases" personas — the one persona the registry can't back up,
// Students and Educators, is left out: there's no academic deck type here.
const USE_CASES = [
  {
    title: "Startup Founders",
    tagline: "Turn your vision into an investor-ready story.",
    body: "Build pitch decks that explain your problem, solution, business model, market opportunity, and growth strategy.",
    cta: "Create a Startup Pitch Deck",
    preset: "Startup Pitch",
  },
  {
    title: "Business Professionals",
    tagline: "Make your next business presentation count.",
    body: "Present strategies, business plans, performance updates, and recommendations with greater clarity and structure.",
    cta: "Create a Business Presentation",
    preset: "Business",
  },
  {
    title: "Sales and Marketing Teams",
    tagline: "Communicate value. Build trust. Win opportunities.",
    body: "Develop persuasive sales presentations, marketing proposals, campaign plans, and product pitches.",
    cta: "Create a Sales Deck",
    preset: "Sales",
  },
  {
    title: "Product Teams",
    tagline: "Bring your product vision to life.",
    body: "Present product concepts, roadmaps, feature proposals, and launch strategies in a format that's easy to understand.",
    cta: "Create a Product Deck",
    preset: "Product",
  },
  {
    title: "Consultants and Agencies",
    tagline: "Turn insights into compelling client presentations.",
    body: "Structure recommendations, project proposals, market research, and strategic plans into polished business narratives.",
    cta: "Create a Client Presentation",
    preset: "Partnership",
  },
];

const STEPS = [
  {
    icon: Globe,
    step: "01",
    title: "Start with your website",
    body:
      "Paste a URL. Mint reads your site and the public material around it to work out what you build, who you sell to, and how you make money — so you are correcting a draft instead of facing a blank page.",
  },
  {
    icon: Search,
    step: "02",
    title: "It researches before it writes",
    body:
      "A first pass runs live web research to gather market size, competitors and comparable companies. A second pass turns that into slides. Market figures arrive with the reasoning attached, so you can check a number before an investor does.",
  },
  {
    icon: PencilLine,
    step: "03",
    title: "Edit it, then take it with you",
    body:
      "Click any headline, bullet or figure on any slide to change it. Try all 40 designs on your finished deck. Download a PowerPoint file and keep working in PowerPoint, Keynote or Slides.",
  },
];

// Grouped the way founders actually think about the work, not by the registry's
// internal ordering. Slide counts come from the registry at render time.
const DECK_GROUPS: {
  group: string; blurb: string; keys: string[]; img: string; alt: string;
}[] = [
    {
      group: "Raising money",
      blurb: "From a five-slide teaser to a full narrative for a partner meeting.",
      keys: ["investor", "demoday", "elevator", "update"],
      img: "/images/template_fintech.jpg",
      alt: "A teal and amber glass sculpture balanced at an angle",
    },
    {
      group: "Selling and going to market",
      blurb: "Decks aimed at a buyer or a partner rather than an investor.",
      keys: ["sales", "gtm", "product", "partnership"],
      img: "/images/template_ai_saas.jpg",
      alt: "A white disc balanced on a small sage cube atop a pale plinth",
    },
    {
      group: "Explaining the company",
      blurb: "The longer documents — for a board, a bank, or a new hire.",
      keys: ["general", "business", "vision", "master"],
      img: "/images/template_enterprise.jpg",
      alt: "A geodesic concrete pavilion with illuminated figure sculptures in a reflecting pool",
    },
    {
      group: "Deciding internally",
      blurb: "A written argument for a decision your team has to make.",
      keys: ["internal"],
      img: "/images/template_deeptech.jpg",
      alt: "A swept glossy white and graphite sculptural form",
    },
  ];

const FAMILY_NOTES: Record<string, string> = {
  Classic: "Soft cards and gradients. The safe choice for a partner meeting.",
  Studio: "Distinct compositions — editorial, brutalist, technical, photographic.",
  "Volume 2": "Swiss grids, broadsheets, bold posters, terminals and bento layouts.",
  Infographic: "Data-forward covers: donut charts, heatmaps, radial dashboards.",
};

const FAQS = [
  {
    q: "Who is Mint for?",
    a: "Founders raising a round, teams presenting internally, and anyone pitching a sale or a partnership. The deck type you pick decides the slide sequence and the questions you're asked, so the same tool fits very different rooms.",
  },
  {
    q: "Do I need design experience?",
    a: "No. Each deck comes out already laid out in one of 40 designs, and editing is clicking text and retyping it — there's no layout grid or font picker to learn.",
  },
  {
    q: "What do I have to give it to get a deck?",
    a: "A company name and a website is enough to start. The more you tell it — stage, business model, traction, who you sell to — the less you will have to correct afterwards. You can fill those in as you go rather than up front.",
  },
  {
    q: "How long is the deck, and can I change that?",
    a: "The deck type decides it. Elevator is five slides, Demo Day is ten, Investor is twenty-four, and the Master deck runs to twenty-five. You pick the type when you create the deck, and every slide can be edited afterwards.",
  },
  {
    q: "Can I export to PowerPoint?",
    a: "Yes, as a .pptx file. Download from the project page and you get native PowerPoint: real text boxes you can retype, real tables, and real charts that stay charts. There is also an in-app export that captures each slide exactly as you see it on screen — pixel-accurate, but the slides come through as images rather than editable shapes. Choose based on whether you want to keep editing or want an exact visual copy. There is no PDF export yet.",
  },
  {
    q: "Which AI writes it?",
    a: "Google's Gemini, in two passes. The first researches your company and market with live web search rather than relying only on what the model was trained on; the second writes the slides from that research. Splitting the two is what keeps market figures anchored to something checkable.",
  },
  {
    q: "Can I use my own branding?",
    a: "Upload a logo and it appears on every slide. Upload photos and they fill the gallery slots. Both are applied when the deck is drawn, so they survive a change of template and never pass through the AI.",
  },
  {
    q: "If I switch template, do I lose my edits?",
    a: "No. The words and the design are kept apart. Switching template redraws the same content in a new one, including on decks you generated before that template existed, and your edits come with it.",
  },
  {
    q: "Do I have to re-enter everything for a second deck?",
    a: "No. What you tell Mint about your company is stored on a company profile, separate from any one deck. Each deck type draws the parts it needs from that profile, so the second deck asks far less than the first.",
  },
];

function DeckTypeRow({ k }: { k: string }) {
  const n = useMemo(() => slideOrder(k).length, [k]);
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-200/80 py-2.5 last:border-b-0">
      <span className="text-[14px] font-medium tracking-[-0.01em] text-slate-900">
        {deckTypeLabel(k)}
      </span>
      <span className="l-meta shrink-0 tabular-nums text-[12px]">{n} slides</span>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewKey, setPreviewKey] = useState(THEMES[0].key);
  const [previewDeckIndex, setPreviewDeckIndex] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);

  useMemo(() => { ensureDeckFonts(); return null; }, []);
  const theme = useMemo(() => getTheme(previewKey), [previewKey]);

  const families = useMemo(() => {
    const seen = new Map<string, typeof THEMES>();
    for (const t of THEMES) {
      // themes.ts keeps the four families in order; bucket by 10.
      const i = THEMES.indexOf(t);
      const fam = i < 10 ? "Classic" : i < 20 ? "Studio" : i < 30 ? "Volume 2" : "Infographic";
      seen.set(fam, [...(seen.get(fam) ?? []), t]);
    }
    return [...seen.entries()];
  }, []);

  return (
    <div className="ipr-landing relative min-h-screen selection:bg-blue-600/15">
      <HeroSection />

      {/* ── What the product is, in four numbers ─────────────────────── */}
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid grid-cols-2 gap-px bg-slate-200/70 md:grid-cols-4">
            {CAPABILITIES.map((s) => (
              <div key={s.label} className="l-panel px-5 py-7 sm:px-7">
                <div className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.025em] text-slate-900 tabular-nums sm:text-[2.5rem]">
                  {s.v}
                </div>
                <div className="l-body mt-2.5 text-[13px]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product introduction — benefit-led, mechanics come next ───── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Your ideas deserve better slides.</h2>
          <p className="l-lede">
            Creating a great presentation shouldn't take hours of writing,
            designing, and formatting. Mint helps you transform your ideas into
            structured, visually engaging presentations with the power of AI.
          </p>
        </div>

        <MintStoryGraphic />

        <div className="mt-14 grid gap-px bg-slate-200/70 md:grid-cols-3">
          {PRODUCT_INTRO_CARDS.map((c) => (
            <div key={c.step} className="l-panel p-7">
              <span className="l-meta mb-3 block tabular-nums">{c.step}</span>
              <h3 className="mb-2.5 text-[18px] font-semibold tracking-[-0.015em] text-slate-900">
                {c.title}
              </h3>
              <p className="l-body text-[14px] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Start with a website. Leave with a deck.</h2>
          <p className="l-lede">
            Three steps, and you can stop at any of them. Most of the work is
            correcting what it got wrong, not writing from nothing.
          </p>
        </div>

        <div className="grid gap-px bg-slate-200/70 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="l-panel p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <s.icon size={16} />
                </span>
                <span className="l-meta tabular-nums">{s.step}</span>
              </div>
              <h3 className="mb-2.5 text-[18px] font-semibold tracking-[-0.015em] text-slate-900">
                {s.title}
              </h3>
              <p className="l-body text-[14px] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live deck preview — the real renderer, not a screenshot ───── */}
      <section id="showcase" className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-[46rem]">
            <h2 className="l-title mb-4">What you actually get</h2>
            <p className="l-lede">
              Rendered live by the same code that draws your deck in the editor —
              not a screenshot. Change the design and watch the same content
              redraw, exactly as it does on a deck you have already made.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(0,0,0,.10)]">
            <FitSlide render={() => renderSlide(theme, sampleDeckVariant(previewDeckIndex), slideIdx, VIEW_CTX, ORDER)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {ORDER.slice(0, 6).map((slot, i) => (
                <button
                  key={slot.key}
                  onClick={() => setSlideIdx(i)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${i === slideIdx
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                >
                  {slot.eyebrow || slot.key}
                </button>
              ))}
            </div>
            <span className="l-meta text-[12px]">
              Slide {slideIdx + 1} · {theme.name}
            </span>
          </div>

          <div className="mt-8 flex gap-1.5 overflow-x-auto pb-2">
            {THEMES.map((t, i) => (
              <button
                key={t.key}
                onClick={() => { setPreviewKey(t.key); setPreviewDeckIndex(i); }}
                title={`${t.name} — ${t.mood}`}
                aria-label={`Preview the ${t.name} design`}
                className="shrink-0 overflow-hidden rounded-md transition"
                style={{
                  width: 84,
                  border: t.key === previewKey ? `2px solid ${t.accent}` : "2px solid rgba(0,0,0,.10)",
                }}
              >
                <FitSlide render={() => renderSlide(t, sampleDeckVariant(i), 0, VIEW_CTX, ORDER)} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's actually behind the deck ─────────────────────────────
          The brief's "AI assistant" section, reframed: this product has no
          chat prompt, so the honest version of "meet the AI" is explaining
          the two-pass research and the audit pass that checks it. ────── */}
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-[46rem]">
            <h2 className="l-title mb-4">Every number comes with its reasoning attached.</h2>
            <p className="l-lede">
              A deck is only useful if you can defend what's on it. Here's what
              actually happens between pasting a URL and getting a deck back.
            </p>
          </div>

          <div className="grid gap-px bg-slate-200/70 md:grid-cols-3">
            {TRUST_POINTS.map((t) => (
              <div key={t.title} className="l-panel p-7">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <t.icon size={16} />
                </span>
                <h3 className="mb-2.5 text-[18px] font-semibold tracking-[-0.015em] text-slate-900">
                  {t.title}
                </h3>
                <p className="l-body text-[14px] leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13 deck types, browsable by room ─────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Or browse by deck type.</h2>
          <p className="l-lede">
            A demo-day teaser is not a shortened investor deck, and a sales deck
            is not a pitch with the price added. Each of the {SELLABLE_DECK_TYPES.length}{" "}
            types here has its own slide sequence, written for the room it is
            going into.
          </p>
        </div>

        <div className="grid gap-px bg-slate-200/70 md:grid-cols-2 lg:grid-cols-4">
          {DECK_GROUPS.map((g) => (
            <div key={g.group} className="l-panel flex flex-col">
              <img
                src={g.img}
                alt={g.alt}
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="p-7">
                <h3 className="mb-1.5 text-[16px] font-semibold tracking-[-0.015em] text-slate-900">
                  {g.group}
                </h3>
                <p className="l-body mb-4 text-[13px] leading-relaxed">{g.blurb}</p>
                <div>
                  {g.keys.map((k) => (
                    <DeckTypeRow key={k} k={k} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Designs ──────────────────────────────────────────────────── */}
      <section id="designs" className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-[46rem]">
            <h2 className="l-title mb-4">Forty designs for every purpose.</h2>
            <p className="l-lede">
              The words and the design are stored separately, so switching
              template redraws the same deck rather than starting a new one —
              including on decks you made before that design existed.
            </p>
          </div>

          <div className="grid gap-px bg-slate-200/70 md:grid-cols-2 lg:grid-cols-4">
            {families.map(([fam, list], famIdx) => (
              <div key={fam} className="l-panel p-7">
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-slate-900">{fam}</h3>
                  <span className="l-meta tabular-nums text-[12px]">{list.length}</span>
                </div>
                <p className="l-body mb-5 text-[13px] leading-relaxed">{FAMILY_NOTES[fam]}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {list.slice(0, 4).map((t, i) => (
                    <span
                      key={t.key}
                      className="overflow-hidden rounded border border-slate-200"
                    >
                      <FitSlide render={() => renderSlide(t, sampleDeckVariant(famIdx * 4 + i), 0, VIEW_CTX, ORDER)} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Everything you need to build a better presentation.</h2>
          <p className="l-lede">
            A smarter way to turn complex ideas into clear stories and
            professional presentations.
          </p>
        </div>
        <div className="grid gap-px bg-slate-200/70 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((c) => (
            <div key={c.title} className="l-panel p-7">
              <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <c.icon size={16} />
              </span>
              <h3 className="mb-1.5 text-[18px] font-semibold tracking-[-0.015em] text-slate-900">
                {c.title}
              </h3>
              <p className="mb-2.5 text-[13px] font-medium text-slate-500">{c.blurb}</p>
              <p className="l-body text-[14px] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases — the brief's personas, mapped to real deck types.
          "Students and Educators" is dropped: there's no academic deck type
          in the registry to back that claim up. ─────────────────────────── */}
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-[46rem]">
            <h2 className="l-title mb-4">One platform for every big idea.</h2>
            <p className="l-lede">
              Whatever you're working on, turn your company's story into a
              presentation built for the room you're walking into.
            </p>
          </div>

          <div className="grid gap-px bg-slate-200/70 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="l-panel flex flex-col p-7">
                <h3 className="mb-1.5 text-[16px] font-semibold tracking-[-0.015em] text-slate-900">
                  {u.title}
                </h3>
                <p className="mb-3 text-[14px] font-medium text-slate-700">{u.tagline}</p>
                <p className="l-body mb-5 flex-1 text-[13px] leading-relaxed">{u.body}</p>
                <button
                  onClick={() => navigate(`/register?prompt=${encodeURIComponent(`Build a ${u.preset} deck`)}`)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700"
                >
                  {u.cta} <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Company profile ──────────────────────────────────────────── */}
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="l-title mb-4">Answer once, not once per deck</h2>
            <p className="l-lede mb-6">
              What you know about your company — your model, your numbers, your
              customers — is kept on a company profile, not buried inside one
              deck. Each deck type pulls the parts it needs.
            </p>
            <ul className="space-y-3">
              {[
                "Your first deck asks the most; every deck after it asks less.",
                "A sales deck and an investor deck read the same facts and choose differently.",
                "Values carry where they came from — you, your website, or research.",
                "Figures that follow from others are worked out rather than asked for.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 shrink-0 text-blue-600" />
                  <span className="l-body text-[14px]">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-7">
            <div className="l-meta mb-4">What a deck is built from</div>
            {[
              ["Your website", "read on the way in"],
              ["Live market research", "gathered before writing"],
              ["What you tell it", "confirmed, not retyped"],
              ["Figures it derives", "worked out from the rest"],
            ].map(([a, b], i) => (
              <div
                key={a}
                className="flex items-baseline justify-between gap-4 border-b border-slate-200/80 py-3 last:border-b-0"
              >
                <span className="flex items-center gap-2.5 text-[14px] font-medium text-slate-900">
                  <span className="l-meta tabular-nums text-[11px]">0{i + 1}</span>
                  {a}
                </span>
                <span className="l-meta text-right text-[12px]">{b}</span>
              </div>
            ))}
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-slate-900" />
              <p className="l-body text-[13px] leading-relaxed">
                Market figures come back with the reasoning attached, so you can
                check a number before someone else does.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Before / after — the brief's "Before and After" section, grounded
          in capabilities this page already documents (company profile, live
          research, a full slide sequence) rather than the brief's generic,
          unverifiable claims. ────────────────────────────────────────────── */}
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-[46rem]">
            <h2 className="l-title mb-4">From scattered notes to a structured deck.</h2>
            <p className="l-lede">
              The problem was never your idea. It was turning it into slides.
            </p>
          </div>

          <div className="grid gap-px bg-slate-200/70 md:grid-cols-2">
            <div className="l-panel p-7">
              <div className="l-meta mb-5 text-[11px] uppercase tracking-[0.07em]">Before Mint</div>
              <ul className="space-y-3">
                {[
                  "Company facts scattered across your website, old decks, and your head.",
                  "Market research you have to go find and check yourself.",
                  "A blank slide and a blinking cursor.",
                  "Re-typing the same company facts into every new deck.",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Minus size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="l-body text-[14px] leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="l-panel p-7">
              <div className="l-meta mb-5 text-[11px] uppercase tracking-[0.07em]">With Mint</div>
              <ul className="space-y-3">
                {[
                  "One company profile, built from your website, that every deck draws from.",
                  "Market research gathered live and shown with its reasoning, not asserted.",
                  "A full slide sequence waiting before you write a word.",
                  "A second deck that asks for far less than the first.",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-blue-600" />
                    <span className="l-body text-[14px] leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Mint, paired with what it doesn't do — confident about what's
          real, honest about what isn't, which is the brief's "Why Choose"
          section done the way this page already does everything else. ──── */}
      <section id="why-mint" className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-8 max-w-[46rem]">
          <h2 className="l-title mb-4">A smarter way to start a presentation.</h2>
          <p className="l-lede">
            Great decks do more than display information — they tell a story,
            build understanding, and survive the room they're presented in.
          </p>
        </div>
        <ul className="mb-16 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {WHY_MINT.map((t) => (
            <li key={t} className="flex gap-2.5">
              <Check size={15} className="mt-0.5 shrink-0 text-blue-600" />
              <span className="l-body text-[14px] leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>

        <div className="mb-8 max-w-[46rem]">
          <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-slate-900">What it does not do yet</h3>
          <p className="l-lede mt-2">
            Worth knowing before you sign up, rather than after.
          </p>
        </div>
        <div className="grid gap-px bg-slate-200/70 sm:grid-cols-3">
          {[
            ["No PDF export", "PowerPoint only for now. PowerPoint will export a PDF for you."],
            ["No shareable link", "You send the file. There is no hosted link for investors yet."],
            ["No view tracking", "Nothing tells you when a deck was opened or for how long."],
          ].map(([t, b]) => (
            <div key={t} className="l-panel p-7">
              <div className="mb-2.5 flex items-center gap-2">
                <Minus size={14} className="shrink-0 text-slate-400" />
                <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-slate-900">{t}</h3>
              </div>
              <p className="l-body text-[13px] leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing — one-time, per deck type. Mirrors GET /billing/pricing
          and app.decks.pricing.DECK_PRICES_INR exactly, since this is what
          checkout actually charges. ─────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Pay once per deck. No subscription.</h2>
          <p className="l-lede">
            Every deck type is a one-time purchase — pay when you generate it,
            keep it and re-generate it as often as you like. Nothing recurs,
            nothing expires.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Deck type</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {DECK_PRICES_INR.map((d) => (
                <tr key={d.key} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-3 font-medium text-slate-900">{deckTypeLabel(d.key)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">₹{d.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[12px] text-slate-500">
          Payments are processed securely by Razorpay. Prices shown in INR.
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[820px] px-4 py-20 sm:px-6">
          <h2 className="l-title mb-10">Questions</h2>
          <div className="border-t border-slate-200/80">
            {FAQS.map((f, i) => (
              <div key={f.q} className="border-b border-slate-200/80">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[15px] font-medium tracking-[-0.015em] text-slate-900">
                    {f.q}
                  </span>
                  <ChevronDown
                    size={17}
                    className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="l-body max-w-[62ch] pb-5 text-[14px] leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto mb-5 max-w-[18ch] font-[family-name:var(--font-display)] text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[3.25rem]">
          Your next deck starts with a website, not a blank page.
        </h2>
        <p className="l-lede mx-auto mb-9 max-w-[46ch]">
          From ₹399 a deck, one-time. Nothing to install, nothing recurring.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="l-press inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-slate-800"
          >
            Create Your Pitch Deck <ArrowRight size={16} />
          </button>
          <Link
            to="/login"
            className="l-press inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-medium text-slate-900 no-underline"
          >
            <FileText size={16} /> Sign in
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
