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
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ChevronDown, Globe, Search, Sparkles,
  PencilLine, Download, Layers, FileText, Minus,
} from "lucide-react";

import HeroSection from "@/components/landing/HeroSection";
import { THEMES, getTheme, ensureDeckFonts } from "@/components/workspace/deckTemplates/themes";
import { SAMPLE_DECK, sampleDeckVariant } from "@/components/workspace/deckTemplates/sampleDeck";
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

const CAPABILITIES = [
  { v: "13", label: "deck types, each with its own slide sequence" },
  { v: "40", label: "designs, switchable on any deck at any time" },
  { v: "5–25", label: "slides, decided by the deck type you pick" },
  { v: ".pptx", label: "export with native charts and editable text" },
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

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">A website goes in. A deck comes out.</h2>
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
            <h2 className="l-title mb-4">This is the actual output</h2>
            <p className="l-lede">
              Rendered live by the same code that draws your deck in the editor —
              not a screenshot. Change the design and watch the same content
              redraw, exactly as it does on a deck you have already made.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(0,0,0,.10)]">
            <FitSlide render={() => renderSlide(theme, SAMPLE_DECK, slideIdx, VIEW_CTX, ORDER)} />
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
                onClick={() => setPreviewKey(t.key)}
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

      {/* ── 13 deck types ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-[46rem]">
          <h2 className="l-title mb-4">Not every deck is a pitch deck</h2>
          <p className="l-lede">
            A demo-day teaser is not a shortened investor deck, and a sales deck
            is not a pitch with the price added. Each of the {Object.keys(DECK_TYPES).length}{" "}
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
      <section className="l-panel border-y border-slate-200/80">
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-[46rem]">
            <h2 className="l-title mb-4">Forty designs, and you can change your mind</h2>
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

      {/* ── Editing, branding, export ────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="grid gap-px bg-slate-200/70 md:grid-cols-3">
          {[
            {
              icon: PencilLine,
              title: "Edit the words in place",
              body:
                "Click a headline, a bullet or a number on the slide itself and retype it. No separate form, no round trip through the AI. Your edits stay yours — regenerating never silently overwrites them.",
            },
            {
              icon: Layers,
              title: "Your logo, your photos",
              body:
                "Upload a logo and it sits on every slide. Upload product shots and they fill the gallery slots. Both are applied when the deck is drawn, so they survive a change of design.",
            },
            {
              icon: Download,
              title: "Leave with a real file",
              body:
                "Download a .pptx with native text boxes, tables and charts that are still charts in PowerPoint. Or take a pixel-exact image export if you would rather it look identical to the screen.",
            },
          ].map((c) => (
            <div key={c.title} className="l-panel p-7">
              <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <c.icon size={16} />
              </span>
              <h3 className="mb-2.5 text-[18px] font-semibold tracking-[-0.015em] text-slate-900">
                {c.title}
              </h3>
              <p className="l-body text-[14px] leading-relaxed">{c.body}</p>
            </div>
          ))}
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

      {/* ── What it does not do ──────────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6">
        <div className="mb-8 max-w-[46rem]">
          <h2 className="l-title mb-4">What it does not do yet</h2>
          <p className="l-lede">
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="l-panel border-y border-slate-200/80">
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
          Start with your website.
        </h2>
        <p className="l-lede mx-auto mb-9 max-w-[46ch]">
          Three decks on the free plan. No card, and nothing to install.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("/register")}
            className="l-press inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-slate-800"
          >
            Build your first deck <ArrowRight size={16} />
          </button>
          <Link
            to="/login"
            className="l-press inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-[15px] font-medium text-slate-900 no-underline"
          >
            <FileText size={16} /> Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
