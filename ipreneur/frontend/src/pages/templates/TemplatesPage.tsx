/**
 * Templates — browse every deck design before committing to one.
 *
 * Thumbnails are LIVE renders, not screenshots: each card runs the real
 * `renderSlide` at 1280×720 and scales it down, so the gallery can never drift
 * from what a deck actually looks like. Adding a template to the registry makes
 * it appear here with no extra work.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Check } from "lucide-react";

import { renderSlide } from "@/components/workspace/deckTemplates/TemplatedDeck";
import {
  CLASSIC_THEMES,
  STUDIO_THEMES,
  VOLUME2_THEMES,
  INFOGRAPHIC_THEMES,
  ensureDeckFonts,
} from "@/components/workspace/deckTemplates/themes";
import type { DeckTemplate } from "@/components/workspace/deckTemplates/themes";
import { slideOrder } from "@/components/workspace/deckTemplates/deckTypes";
import { SAMPLE_DECK as SAMPLE, sampleDeckVariant } from "@/components/workspace/deckTemplates/sampleDeck";
import type { TemplateDeckData } from "@/components/workspace/deckTemplates/types";

/** A short, realistic deck so every template renders with plausible content
 *  rather than lorem — the point of the gallery is judging real output. */


/** The families, in the order they should read. */
const FAMILIES: { id: string; label: string; note: string; items: DeckTemplate[] }[] = [
  { id: "classic", label: "Classic", note: "Soft cards and gradients", items: CLASSIC_THEMES },
  { id: "studio", label: "Studio", note: "Distinct compositions", items: STUDIO_THEMES },
  { id: "volume2", label: "Volume 2", note: "Editorial and poster styles", items: VOLUME2_THEMES },
  { id: "infographic", label: "Infographic", note: "Data-driven covers with KPI rings & gradient waves", items: INFOGRAPHIC_THEMES },
];

const ORDER = slideOrder("investor");
/** Cover, problem/solution, market, traction, team — the five that expose a
 *  template's composition fastest. */
const PREVIEW_SLIDES = [0, 3, 8, 11, 20];

/** Scales a real 1280×720 slide to whatever width its card happens to be.
 *
 *  Measured with a ResizeObserver rather than CSS, because the cards are grid
 *  `1fr` tracks whose width isn't known up front. Container query units look
 *  like the tidy answer but cannot work here: `scale()` takes a unitless
 *  number and `calc(100cqw / 1280)` is a length, so the browser drops the
 *  whole declaration and the slide renders at 1:1, cropped to its box.
 *  `TemplatedDeck` scales its own stage the same way.                        */
function useFitScale() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / 1280);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

function Thumb({ t, index = 0, data = SAMPLE }: { t: DeckTemplate; index?: number; data?: TemplateDeckData }) {
  const { ref, scale } = useFitScale();
  return (
    <div
      ref={ref}
      className="tpl-thumb"
      aria-hidden
      style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}
    >
      {scale > 0 && (
        <div
          className="tpl-stage"
          style={{
            width: 1280,
            height: 720,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {renderSlide(t, data, index, undefined, ORDER)}
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<DeckTemplate | null>(null);

  useMemo(() => ensureDeckFonts(), []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAMILIES
      .filter((f) => family === "all" || f.id === family)
      .map((f) => ({
        ...f,
        items: f.items.filter(
          (t) => !q || t.name.toLowerCase().includes(q) || t.mood.toLowerCase().includes(q)
        ),
      }))
      .filter((f) => f.items.length > 0);
  }, [family, query]);

  const total = groups.reduce((n, f) => n + f.items.length, 0);

  return (
    <div className="px-6 py-6 md:px-10 md:py-8 max-w-[1500px] mx-auto">
      <header className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Templates</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Every deck design, rendered live. Pick one when you create a deck, or switch any
          existing deck to it at any time.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="template-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            className="h-9 w-[240px] rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ id: "all", label: "All" }, ...FAMILIES].map((f) => {
            const on = family === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFamily(f.id)}
                aria-pressed={on}
                className={`h-9 rounded-full px-4 text-[13px] font-semibold transition ${
                  on
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <span className="ml-auto text-[13px] text-slate-400 tabular-nums">
          {total} template{total === 1 ? "" : "s"}
        </span>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-[15px] font-semibold text-slate-700">No templates match “{query}”</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setFamily("all"); }}
            className="mt-2 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      )}

      {(() => {
        let runningIndex = 0;
        return groups.map((f) => {
          const startIdx = runningIndex;
          runningIndex += f.items.length;
          return (
            <section key={f.id} className="mb-10">
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-[15px] font-bold text-slate-900">{f.label}</h2>
                <span className="text-[13px] text-slate-400">{f.note}</span>
              </div>

              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
                {f.items.map((t, i) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setPreview(t)}
                    className="group text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 rounded-xl"
                  >
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:border-slate-300">
                      <Thumb t={t} data={sampleDeckVariant(startIdx + i)} />
                    </div>
                    <div className="mt-2.5 px-0.5">
                      <div className="text-[14px] font-semibold text-slate-900">{t.name}</div>
                      <div className="text-[12.5px] text-slate-500">
                        {t.mood} · {t.mode === "dark" ? "Dark" : "Light"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        });
      })()}

      {/* Preview */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.name} preview`}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 md:p-8 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
        >
          <div className="w-full max-w-[1120px] rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start gap-4 border-b border-slate-100 p-5">
              <div className="min-w-0">
                <h3 className="text-[19px] font-bold tracking-tight text-slate-900">{preview.name}</h3>
                <p className="mt-0.5 text-[13.5px] text-slate-500">
                  {preview.mood} · {preview.mode === "dark" ? "Dark" : "Light"} ·{" "}
                  {preview.fontD} / {preview.fontB}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/projects/new?template=${preview.key}`)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800"
                >
                  Use this template <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              {PREVIEW_SLIDES.map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
                  <Thumb t={preview} index={i} />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 px-5 py-3 text-[12.5px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-600" /> Works with all 13 deck types
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-600" /> Can be applied to existing decks
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-600" /> Editable text on every slide
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
