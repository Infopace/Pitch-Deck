/**
 * DeckWorkspace — the full-height editing surface for a generated deck.
 *
 * Two panes under one toolbar: a slide navigator on the left listing every
 * generated slide as a live thumbnail, and a scrolling canvas on the right
 * where those slides are previewed and edited in place.
 *
 * This replaces the one-slide-at-a-time carousel for editing. That carousel
 * paged through slides with a row of dots, which stops working once a deck
 * reaches the 20-30 slides the longer deck types now generate — 24 dots is not
 * a navigator. A rail scales to any length and shows position at a glance.
 *
 * `TemplatedDeckSection` still serves the project overview page, where the deck
 * is one card among status panels rather than the whole screen.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X as XIcon, Palette, Check, ChevronLeft, ChevronRight } from "lucide-react";

import {
  CLASSIC_THEMES, STUDIO_THEMES, VOLUME2_THEMES, INFOGRAPHIC_THEMES,
  getTheme, ensureDeckFonts, DEFAULT_THEME_KEY,
} from "./themes";
import type { DeckTemplate } from "./themes";
import type { TemplateDeckData } from "./types";
import { deckTypeLabel, slideOrder } from "./deckTypes";
import { renderSlide } from "./TemplatedDeck";
import { exportTemplatedDeckToPptx } from "./exportDeck";
import { FloatingTextEditor } from "./editing/FloatingTextEditor";
import { VIEW_CTX } from "./editing/editableText";
import { FitSlide } from "./FitSlide";
import type { EditPath, EditCtx, ActiveEdit } from "./editing/editableText";

// Uploaded image URLs are relative ("/uploads/..") and served by the backend,
// not the Vite dev server — prefix them with the API origin.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1")
  .replace(/\/api\/v1\/?$/, "");
const absUrl = (u?: string) => (!u ? u : /^https?:\/\//.test(u) ? u : API_ORIGIN + u);

const FAMILIES: [string, DeckTemplate[]][] = [
  ["Classic", CLASSIC_THEMES],
  ["Studio", STUDIO_THEMES],
  ["Volume 2", VOLUME2_THEMES],
  ["Infographic", INFOGRAPHIC_THEMES],
];

/** Fallback rail label for a section with no eyebrow (e.g. cover). */
const titleCase = (k: string) =>
  k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const RAIL_W = 180;

interface RawAssets {
  logoUrl?: string; logo_url?: string;
  galleryImages?: { slot: string; url: string }[];
  gallery_images?: { slot: string; url: string }[];
}

interface Props {
  data: TemplateDeckData;
  deckType?: string | null;
  /** The deck's own persisted section order — authoritative when present. */
  slideOrder?: readonly string[] | null;
  initialKey?: string | null;
  assets?: RawAssets | null;
  onPersist?: (key: string) => void;
  fileName?: string;
  registerExport?: (fn: () => Promise<void>) => void;
  editable?: boolean;
  onEdit?: (path: EditPath, value: string | number) => void;
  /** Rendered at the toolbar's left edge — the back link and deck name. */
  lead?: React.ReactNode;
  /** Rendered at the toolbar's right edge — e.g. Discard / Save. */
  actions?: React.ReactNode;
}

export function DeckWorkspace({
  data: rawData, deckType, slideOrder: storedOrder, initialKey, assets,
  onPersist, fileName, registerExport, editable, onEdit, lead, actions,
}: Props) {
  useEffect(() => { ensureDeckFonts(); }, []);

  const order = useMemo(
    () => slideOrder(deckType, storedOrder, rawData as unknown as Record<string, unknown>),
    [deckType, storedOrder, rawData]
  );

  // Normalize backend assets (camel/snake) → absolute URLs, inject into deck data.
  const data = useMemo(() => {
    const logo = assets?.logoUrl ?? assets?.logo_url;
    const imgs = assets?.galleryImages ?? assets?.gallery_images ?? [];
    if (!logo && !imgs.length) return rawData;
    return {
      ...rawData,
      _assets: {
        logoUrl: absUrl(logo),
        galleryImages: imgs.map((g) => ({ slot: g.slot, url: absUrl(g.url) as string })),
      },
    };
  }, [rawData, assets]);

  const [activeKey, setActiveKey] = useState(initialKey || data.theme_suggestion || DEFAULT_THEME_KEY);
  const theme = useMemo(() => getTheme(activeKey), [activeKey]);
  useEffect(() => { if (initialKey) setActiveKey(initialKey); }, [initialKey]);

  useEffect(() => {
    if (!registerExport) return;
    registerExport(() => exportTemplatedDeckToPptx(data, theme, fileName || "pitch-deck", order));
  }, [registerExport, data, theme, fileName, order]);

  const selectTemplate = (key: string) => {
    if (key !== activeKey) { setActiveKey(key); onPersist?.(key); }
    setPickerOpen(false);
  };

  // ── Canvas scale ──────────────────────────────────────────────────────────
  // Every slide on the canvas is the same width, so one measurement drives all
  // of them. Container queries can't do this: scale() needs a unitless number
  // and calc(100cqw / 1280) is a length, so the declaration is dropped.
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.1, el.clientWidth / 1280));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Which slide the canvas is showing ─────────────────────────────────────
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const railRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  // Set while a rail click is animating, so observer noise doesn't fight it.
  const jumpingTo = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !scale) return;
    const io = new IntersectionObserver(
      (entries) => {
        // The slide covering the most of the viewport wins, which keeps the
        // selection stable mid-scroll instead of flickering between neighbours.
        let best = -1, bestRatio = 0;
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.slide);
          if (e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = i; }
        }
        if (best < 0) return;
        if (jumpingTo.current !== null && jumpingTo.current !== best) return;
        jumpingTo.current = null;
        setCurrent(best);
      },
      { root, threshold: [0.25, 0.5, 0.75] }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [scale, order.length]);

  // Keep the rail's selection in view as the canvas scrolls past it.
  useEffect(() => {
    railRefs.current[current]?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const goTo = useCallback((i: number) => {
    jumpingTo.current = i;
    setCurrent(i);
    slideRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── In-place editing ──────────────────────────────────────────────────────
  // One slide owns the open editor at a time. The index is tracked alongside
  // the edit so the floating input can be positioned against that slide's own
  // box — each slide is its own positioning context on a scrolling canvas.
  const [active, setActive] = useState<ActiveEdit | null>(null);
  const [activeSlide, setActiveSlide] = useState<number | null>(null);

  const commitEdit = (path: EditPath, value: string | number) => {
    onEdit?.(path, value);
    setActive(null); setActiveSlide(null);
  };
  const cancelEdit = () => { setActive(null); setActiveSlide(null); };

  const ctxFor = (i: number): EditCtx => ({
    editable: !!editable,
    active: activeSlide === i ? active : null,
    onActivate: (path, value, opts) => {
      setActiveSlide(i);
      setActive({ key: path.join("."), path, value: String(value), ...opts });
    },
  });

  // ── Present mode ──────────────────────────────────────────────────────────
  const [present, setPresent] = useState(false);
  const [pIdx, setPIdx] = useState(0);
  const [vp, setVp] = useState({ w: 1280, h: 720 });
  const presentRef = useRef<HTMLDivElement>(null);
  const LAST = Math.max(0, order.length - 1);

  useEffect(() => {
    if (!present) return;
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    presentRef.current?.requestFullscreen?.().catch(() => {});
    const onFsChange = () => { if (!document.fullscreenElement) setPresent(false); };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("resize", measure);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [present]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (active) return; // an edit input owns the keyboard
      if (present) {
        if (ev.key === "ArrowRight" || ev.key === " ") setPIdx((s) => Math.min(s + 1, LAST));
        else if (ev.key === "ArrowLeft") setPIdx((s) => Math.max(s - 1, 0));
        else if (ev.key === "Escape") setPresent(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, active, LAST]);

  const startPresenting = () => { setPIdx(current); setPresent(true); };
  const pScale = Math.max(0.1, Math.min((vp.w - 48) / 1280, (vp.h - 96) / 720));

  // ── Template picker ───────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (ev: MouseEvent) => {
      if (!pickerRef.current?.contains(ev.target as Node)) setPickerOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setPickerOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="relative z-30 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white/85 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 basis-full items-center gap-3 md:basis-auto">{lead}</div>

        <span className="ml-auto hidden shrink-0 text-[12px] text-slate-400 lg:inline">
          {deckTypeLabel(deckType)} · {order.length} slides
        </span>

        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Palette size={14} /> {theme.name}
          </button>

          {pickerOpen && (
            <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(560px,90vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,.18)]">
              {FAMILIES.map(([label, group]) => (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[.1em] text-slate-400">
                    {label}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
                    {group.map((t) => {
                      const selected = t.key === activeKey;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => selectTemplate(t.key)}
                          title={`${t.name} — ${t.mood}`}
                          className="overflow-hidden rounded-lg text-left transition"
                          style={{
                            border: selected ? `2px solid ${t.accent}` : "2px solid rgb(226 232 240)",
                            boxShadow: selected ? `0 4px 14px ${t.accent}40` : "none",
                          }}
                        >
                          <FitSlide render={() => renderSlide(t, data, 0, VIEW_CTX, order)} />
                          <span className="flex items-center gap-1 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {selected && <Check size={11} className="shrink-0 text-emerald-600" />}
                            <span className="truncate">{t.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={startPresenting}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Maximize2 size={14} /> Present
        </button>

        {actions}
      </div>

      {/* ── Panes ─────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Slide navigator */}
        <aside
          className="hidden shrink-0 flex-col border-r border-slate-200 bg-white md:flex"
          style={{ width: RAIL_W }}
        >
          <div className="flex shrink-0 items-center justify-between px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-slate-400">Slides</span>
            <span className="text-[11px] tabular-nums text-slate-400">{current + 1} / {order.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {order.map((slot, i) => {
              const selected = i === current;
              return (
                <button
                  key={slot.key}
                  ref={(el) => { railRefs.current[i] = el; }}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`Slide ${i + 1}: ${slot.eyebrow || titleCase(slot.key)}`}
                  className="mb-2 flex w-full items-start gap-2 text-left"
                >
                  <span
                    className={`mt-0.5 w-[18px] shrink-0 text-right text-[11px] tabular-nums ${
                      selected ? "font-semibold text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      aria-hidden
                      className="block overflow-hidden rounded-md transition"
                      style={{
                        position: "relative",
                        outline: selected ? `2px solid ${theme.accent}` : "1px solid rgb(226 232 240)",
                        outlineOffset: selected ? -1 : 0,
                        boxShadow: selected ? `0 3px 12px ${theme.accent}33` : "none",
                      }}
                    >
                      <FitSlide render={() => renderSlide(theme, data, i, VIEW_CTX, order)} />
                    </span>
                    <span
                      className={`mt-1 block truncate text-[10.5px] ${
                        selected ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {slot.eyebrow || titleCase(slot.key)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <div ref={scrollerRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-5 md:px-8">
            <div ref={stageRef}>
            {scale > 0 && order.map((slot, i) => (
              <div
                key={slot.key}
                data-slide={i}
                ref={(el) => { slideRefs.current[i] = el; }}
                className="relative mb-6 scroll-mt-5 last:mb-0"
              >
                <div
                  className="overflow-hidden rounded-xl bg-white"
                  style={{
                    height: 720 * scale,
                    boxShadow: "0 1px 2px rgba(15,23,42,.06), 0 12px 32px rgba(15,23,42,.10)",
                  }}
                >
                  <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                    {renderSlide(theme, data, i, editable ? ctxFor(i) : VIEW_CTX, order)}
                  </div>
                </div>
                {editable && activeSlide === i && (
                  <FloatingTextEditor
                    active={active}
                    containerRef={{ current: slideRefs.current[i] }}
                    scale={scale}
                    onCommit={commitEdit}
                    onCancel={cancelEdit}
                  />
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Present overlay ───────────────────────────────────────────────── */}
      {present && (
        <div
          ref={presentRef}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center"
          style={{ background: theme.bg }}
        >
          <button
            type="button"
            onClick={() => setPresent(false)}
            title="Exit (Esc)"
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ color: theme.text, background: "rgba(127,127,140,.18)" }}
          >
            <XIcon size={16} /> Exit
          </button>

          <div
            style={{
              width: 1280, height: 720,
              transform: `scale(${pScale})`, transformOrigin: "center center",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 30px 90px rgba(0,0,0,.5)",
            }}
          >
            {renderSlide(theme, data, pIdx, VIEW_CTX, order)}
          </div>

          <button
            type="button" aria-label="Previous" onClick={() => setPIdx((s) => Math.max(s - 1, 0))}
            disabled={pIdx === 0}
            className="absolute bottom-0 left-0 top-0 w-[12%] cursor-pointer border-0 bg-transparent disabled:cursor-default"
          />
          <button
            type="button" aria-label="Next" onClick={() => setPIdx((s) => Math.min(s + 1, LAST))}
            disabled={pIdx === LAST}
            className="absolute bottom-0 right-0 top-0 w-[12%] cursor-pointer border-0 bg-transparent disabled:cursor-default"
          />

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
            <button
              type="button" onClick={() => setPIdx((s) => Math.max(s - 1, 0))} disabled={pIdx === 0}
              className="rounded-md p-1 disabled:opacity-30" style={{ color: theme.muted }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ font: "400 12px var(--font-body)", color: theme.muted }}>
              {pIdx + 1} / {order.length} · ← → to navigate · Esc to exit
            </span>
            <button
              type="button" onClick={() => setPIdx((s) => Math.min(s + 1, LAST))} disabled={pIdx === LAST}
              className="rounded-md p-1 disabled:opacity-30" style={{ color: theme.muted }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
