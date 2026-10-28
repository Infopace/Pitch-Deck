/**
 * TemplatedDeck — the 10-theme deck renderer.
 *
 * Ported from the Claude template artifact (React.createElement style kept to
 * stay faithful to the original layouts). Renders a fixed 1280×720 slide and
 * scales it to fit the container; includes prev/next + dot navigation.
 *
 * Slides are addressed by SECTION KEY, not by position: `renderSlide` looks up
 * slot `index` in the deck's order (see deckTypes.ts) and calls that slot's
 * renderer with the key to read and the eyebrow to show. That indirection is
 * what lets one renderer serve several sections — `probsol` draws the
 * problem/solution slide, the risks/mitigations slide and the partnership
 * "what each side brings" slide, each reading its own key and writing its own
 * edit paths.
 *
 * `renderSlide(theme, data, index, editCtx, order)` is also exported for thumbnails.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, X as XIcon } from "lucide-react";
import {
  Theme, mix, border, fD,
  tRadius, tCards, tCover, tChrome, tFigure, tOrnament, tPad, tInset, tH1, tCoverSize,
} from "./themes";
import {
  TemplateDeckData,
  sec,
  EMPTY_ASK, EMPTY_CLOSING, EMPTY_COMPETITION, EMPTY_GALLERY, EMPTY_MARKET,
  EMPTY_MODEL, EMPTY_PERSONA, EMPTY_PROBSOL, EMPTY_PRODUCT, EMPTY_PROOF,
  EMPTY_ROADMAP, EMPTY_SUMMARY, EMPTY_TEAM, EMPTY_TRACTION, EMPTY_VISION,
} from "./types";
import { DEFAULT_DECK_TYPE, RendererId, SlideSlot, slideOrder } from "./deckTypes";
import { EditCtx, VIEW_CTX, editableText, editableSvgText, EditPath, ActiveEdit } from "./editing/editableText";
import { FloatingTextEditor } from "./editing/FloatingTextEditor";

const e = React.createElement;
type N = React.ReactNode;

/**
 * What a slide needs beyond the theme and the data: which section key it is
 * rendering, what eyebrow to show, and how long the deck is (for the footer).
 * Bundled rather than passed as three positional params, since every renderer
 * takes all three and the list would otherwise keep growing.
 */
export interface SlideArgs {
  k: string;
  eb: string;
  total: number;
}

type SlideFn = (T: Theme, C: TemplateDeckData, i: number, X: EditCtx, A: SlideArgs) => N;

// ── Shared bits ──────────────────────────────────────────────────────────────

function eyebrow(T: Theme, txt: N): N {
  return e("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 } },
    e("span", { key: "d", style: { width: 26, height: 3, borderRadius: 2, background: T.accent } }),
    e("span", { key: "t", style: { fontFamily: fD(T), fontSize: 13, fontWeight: 600, letterSpacing: T.upper ? ".16em" : ".04em", textTransform: T.upper ? "uppercase" : "none", color: T.accent } }, txt)
  );
}

function h1(T: Theme, txt: N, size?: number): N {
  // `tH1` lets a template set one headline size for the whole deck. Templates
  // that declare none fall through to the slide's own literal, unchanged.
  return e("h1", { style: { margin: 0, fontFamily: fD(T), fontWeight: T.serif ? 600 : 700, fontSize: tH1(T, size || 48), lineHeight: 1.04, letterSpacing: T.serif ? "-0.01em" : "-0.025em", color: T.text, textWrap: "balance" } as React.CSSProperties }, txt);
}

function logo(T: Theme, C: TemplateDeckData): N {
  const logoUrl = C._assets?.logoUrl;
  const badge = logoUrl
    ? e("img", { key: "m", src: logoUrl, alt: C.company, style: { height: 24, maxWidth: 120, objectFit: "contain", display: "block" } })
    : e("div", { key: "m", style: { width: 22, height: 22, borderRadius: 6, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", color: T.mode === "dark" ? T.bg : "#fff", fontFamily: fD(T), fontWeight: 700, fontSize: 13 } }, C.mark);
  return e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
    badge,
    e("span", { key: "n", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 14, letterSpacing: ".01em", color: T.text } }, C.company)
  );
}

interface ShellOpts { noFoot?: boolean; deco?: N; pad?: number; total?: number }
function shell(T: Theme, C: TemplateDeckData, no: number, inner: N, opts: ShellOpts = {}): N {
  // Deck length varies by type, so the page counter reads it from the slide's
  // args rather than assuming the investor deck's 12.
  const total = opts.total ?? 12;
  const inset = tInset(T, opts.pad);
  const chrome = tChrome(T);
  const num = (no < 9 ? "0" : "") + (no + 1) + " / " + total;

  let foot: N = null;
  if (!opts.noFoot) {
    if (chrome === "none") {
      foot = null;
    } else if (chrome === "dot") {
      // A run of dots marking position, instead of a logo + counter line.
      foot = e("div", { key: "foot", style: { position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", gap: 9 } },
        Array.from({ length: Math.min(total, 14) }, (_, d) =>
          e("span", { key: d, style: { width: 6, height: 6, borderRadius: "50%", background: d === no ? T.accent : mix(T.text, 20, "transparent") } })));
    } else if (chrome === "corner") {
      // Registration marks — a drawing, not a document.
      foot = e("div", { key: "foot" },
        e("div", { key: "tl", style: { position: "absolute", left: 26, top: 26, width: 18, height: 18, borderLeft: `1px solid ${mix(T.accent, 45)}`, borderTop: `1px solid ${mix(T.accent, 45)}` } }),
        e("div", { key: "br", style: { position: "absolute", right: 26, bottom: 26, width: 18, height: 18, borderRight: `1px solid ${mix(T.accent, 45)}`, borderBottom: `1px solid ${mix(T.accent, 45)}` } }),
        e("span", { key: "n", style: { position: "absolute", right: 34, top: 30, fontFamily: fD(T), fontSize: 11, letterSpacing: ".1em", color: T.muted } }, `${C.mark || ""}-${num.split(" / ")[0]}`));
    } else if (chrome === "rule") {
      // A ruled foot — the printed-report treatment.
      foot = e("div", { key: "foot", style: { position: "absolute", left: inset, right: inset, bottom: 30, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${border(T, true)}`, paddingTop: 11 } },
        e("span", { key: "c", style: { fontFamily: T.fontB, fontSize: 12, letterSpacing: ".05em", color: T.muted } }, C.company),
        e("span", { key: "p", style: { fontFamily: fD(T), fontSize: 11.5, fontWeight: 500, letterSpacing: ".06em", color: T.muted } }, num));
    } else {
      foot = e("div", { key: "foot", style: { position: "absolute", left: inset, right: inset, bottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" } },
        logo(T, C),
        e("span", { key: "p", style: { fontFamily: fD(T), fontSize: 12, fontWeight: 500, letterSpacing: ".04em", color: T.muted } }, num));
    }
  }

  // The "dot" footer is position:absolute, so it never claims space from the
  // flex column above it — a template whose content stretches with flex:1
  // (every multi-column card layout does) runs its last row straight into
  // the dots instead of stopping short of them. Reserving that band here,
  // once, fixes every such template instead of padding each one individually.
  const dotBand = !opts.noFoot && chrome === "dot" ? 58 : 0;

  return e("div", { style: { position: "relative", width: 1280, height: 720, background: T.bg, color: T.text, fontFamily: T.fontB + ", sans-serif", padding: tPad(T, opts.pad), display: "flex", flexDirection: "column", overflow: "hidden" } },
    opts.deco || null,
    dotBand ? e("div", { key: "in-wrap", style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingBottom: dotBand } }, inner) : inner,
    foot);
}

function areaChart(T: Theme, series: { y: string; v: number }[], w: number, h: number, X: EditCtx = VIEW_CTX, basePath: EditPath = ["traction", "series"]): N {
  const hasRealData = !!(series && series.length);
  const safe = hasRealData ? series : [{ y: "", v: 1 }];
  const max = Math.max(...safe.map((s) => s.v)) * 1.12 || 1;
  const n = safe.length;
  const px = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const py = (v: number) => h - (v / max) * h;
  const pts = safe.map((s, i) => [px(i), py(s.v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "g" + T.key;
  return e("svg", { viewBox: `0 0 ${w} ${h + 34}`, style: { width: "100%", height: "auto", overflow: "visible" } },
    e("defs", { key: "def" },
      e("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        e("stop", { key: 0, offset: "0%", stopColor: T.accent, stopOpacity: 0.34 }),
        e("stop", { key: 1, offset: "100%", stopColor: T.accent, stopOpacity: 0 })
      )),
    [0.25, 0.5, 0.75, 1].map((g, i) => e("line", { key: "gl" + i, x1: 0, y1: h * g, x2: w, y2: h * g, stroke: border(T), strokeWidth: 1 })),
    e("path", { key: "a", d: area, fill: `url(#${gid})` }),
    e("path", { key: "l", d: line, fill: "none", stroke: T.accent, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }),
    pts.map((p, i) => e("circle", { key: "c" + i, cx: p[0], cy: p[1], r: 5, fill: T.bg, stroke: T.accent, strokeWidth: 3 })),
    safe.map((s, i) => e("text", { key: "lx" + i, x: px(i), y: h + 24, textAnchor: i === 0 ? "start" : i === n - 1 ? "end" : "middle", fontSize: 13, fontFamily: T.fontB, fill: T.muted },
      hasRealData ? editableSvgText(s.y, [...basePath, i, "y"], X, undefined, "n" + i) : s.y)),
    // No "$" / "M" here: template_data carries no currency, and these are the
    // same figures the kpi tiles beside this chart already state correctly
    // (in whatever currency the project is in) — this bare number is just
    // the chart's own axis value, not a second, wrongly-labelled claim.
    safe.map((s, i) => e("text", { key: "lv" + i, x: px(i), y: py(s.v) - 14, textAnchor: "middle", fontSize: 13, fontWeight: 700, fontFamily: fD(T), fill: T.text },
      hasRealData ? editableSvgText(String(s.v), [...basePath, i, "v"], X, { numeric: true }, "n" + i) : s.v))
  );
}

function check(T: Theme, on: boolean): N {
  if (on) return e("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" }, e("path", { d: "M5 12.5l4 4 10-10", stroke: T.accent, strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" }));
  return e("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" }, e("path", { d: "M7 7l10 10M17 7L7 17", stroke: T.muted, strokeWidth: 2, strokeLinecap: "round", opacity: 0.5 }));
}

function kpiTiles(T: Theme, kpis: { k: string; l: string }[], basePath: EditPath, X: EditCtx, cols?: number): N {
  return e("div", { style: { display: "grid", gridTemplateColumns: `repeat(${cols || (kpis || []).length || 1},1fr)`, gap: 14 } },
    // NB: the 75% surface mix here is deliberately *not* cardStyle's 72% — they
    // were always different and matching them would move the original themes.
    (kpis || []).map((k, i) => e("div", { key: i, style: tCards(T) === "none"
      ? { borderLeft: `3px solid ${border(T, true)}`, padding: "4px 0 4px 16px" }
      : { background: T.mode === "dark" ? mix(T.surface, 75, T.bg) : T.surface, border: `1px solid ${border(T)}`, borderRadius: Math.max(tRadius(T) - 4, 0), padding: "18px 18px 16px" } },
      e("div", { key: "k", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: T.accent, lineHeight: 1 } }, editableText(k.k, [...basePath, i, "k"], X)),
      e("div", { key: "l", style: { marginTop: 8, fontSize: 13, lineHeight: 1.35, color: T.muted } }, editableText(k.l, [...basePath, i, "l"], X))
    ))
  );
}

// Image placeholder tile — our decks have no uploaded images yet, so render a
// themed empty-media state (icon + caption). Swap for a real <img> once images
// are wired into template_data.
function imgSlot(T: Theme, caption: N): N {
  return e("div", { style: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.muted } },
    e("svg", { key: "ic", width: 34, height: 34, viewBox: "0 0 24 24", fill: "none" },
      e("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2.5, stroke: mix(T.accent, 55), strokeWidth: 1.6 }),
      e("circle", { cx: 8.5, cy: 9.5, r: 1.8, fill: mix(T.accent, 70) }),
      e("path", { d: "M3.5 18l5-5 4 4 3-3 5 5", stroke: mix(T.accent, 55), strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" })
    ),
    e("span", { key: "cap", style: { fontSize: 13.5, fontWeight: 500, letterSpacing: ".01em" } }, caption)
  );
}

// Avatar image slot — our decks have no per-member photos, so render the
// initials placeholder in a themed circle (matches the artifact's empty state).
function avatar(T: Theme, initials: N): N {
  return e("div", { style: { width: 84, height: 84, borderRadius: "50%", padding: 3, background: mix(T.accent, T.mode === "dark" ? 22 : 13, T.mode === "dark" ? "transparent" : "#fff"), border: `1px solid ${mix(T.accent, 32)}`, flexShrink: 0 } },
    e("div", { style: { width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fD(T), fontWeight: 700, fontSize: 24, color: T.accent, background: mix(T.accent, T.mode === "dark" ? 14 : 8, T.mode === "dark" ? "transparent" : "#fff") } }, initials)
  );
}

// The repeated container across most slides.
//
// `cards` is the single token that changes a template's *medium* rather than
// its palette: "none" drops the box entirely for a left rule, which is what
// makes Broadsheet and Atrium read as print rather than as a reskin of the
// card-based original.
function cardStyle(T: Theme, accented = false): React.CSSProperties {
  const variant = tCards(T);
  if (variant === "none") {
    return {
      background: "transparent",
      border: "none",
      borderLeft: `3px solid ${accented ? T.accent : border(T, true)}`,
      borderRadius: 0,
    };
  }
  if (variant === "outline") {
    return {
      background: "transparent",
      border: `1px solid ${accented ? mix(T.accent, 55) : border(T, true)}`,
      borderRadius: tRadius(T),
    };
  }
  return {
    background: accented
      ? mix(T.accent, T.mode === "dark" ? 13 : 7, T.mode === "dark" ? "transparent" : "#fff")
      : (T.mode === "dark" ? mix(T.surface, 72, T.bg) : T.surface),
    border: `1px solid ${accented ? mix(T.accent, 42) : border(T)}`,
    borderRadius: tRadius(T),
  };
}

/** Non-blob ornament variants, shared by `closing` and `vision`.
 *
 *  Returns null for "blobs" so each slide keeps its OWN original blob
 *  expression verbatim — closing and vision use different opacities (16/10 vs
 *  15/9) and collapsing them into one helper would have moved the original ten. */
function ornamentLayer(T: Theme): N {
  const v = tOrnament(T);
  if (v === "none") return null;
  if (v === "grid") {
    return e("div", { key: "dc", style: { position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(${mix(T.accent, 6, "transparent")} 1px, transparent 1px), linear-gradient(90deg, ${mix(T.accent, 6, "transparent")} 1px, transparent 1px)`, backgroundSize: "40px 40px" } });
  }
  if (v === "rule") {
    return e("div", { key: "dc", style: { position: "absolute", left: 0, right: 0, top: 0, height: 4, background: T.accent, pointerEvents: "none" } });
  }
  return null;   // "blobs" — the caller supplies its own
}

// ── Slides ───────────────────────────────────────────────────────────────────

/* ── Cover compositions ───────────────────────────────────────────────────────
   The cover is the slide that sells a template, so it is the one place where a
   template gets a genuinely different composition rather than different tokens
   applied to a shared one. `tCover(T)` picks; "centered" is the original and is
   what every family-1 template resolves to.                                   */

/** Cover headline size, clamped for length.
 *
 *  Cover type is set at campaign scale (up to 200px), which only works for a
 *  short name. Real companies range from "CyDI" to "Strategic Change
 *  Management", and CSS cannot shrink type to fit — so the size steps down by
 *  character count. Deterministic, and it keeps the name inside the frame
 *  instead of running under the next element, which is exactly how the
 *  reference comps fail.                                                     */
function coverFit(T: Theme, name: string | undefined, base?: number): number {
  const size = base ?? tCoverSize(T);
  const n = (name || "").trim().length;
  if (n <= 10) return size;
  if (n <= 16) return Math.round(size * 0.72);
  if (n <= 24) return Math.round(size * 0.54);
  return Math.round(size * 0.40);
}

/** Company name + tagline, shared by the variants that want the plain pair. */
const coverTitle = (T: Theme, C: TemplateDeckData, X: EditCtx, size: number, opts: { weight?: number; color?: string; lh?: number } = {}): N =>
  e("h1", { key: "co", style: { margin: 0, fontFamily: fD(T), fontWeight: opts.weight ?? (T.serif ? 600 : 700), fontSize: coverFit(T, C.company, size), lineHeight: opts.lh ?? 0.96, letterSpacing: "-0.035em", color: opts.color ?? T.text } },
    editableText(C.company, ["company"], X));

const coverTag = (T: Theme, C: TemplateDeckData, X: EditCtx, size = 23, color?: string, max = 560): N =>
  e("p", { key: "tg", style: { margin: "22px 0 0", fontSize: size, lineHeight: 1.4, color: color ?? T.muted, maxWidth: max, fontWeight: 400 } },
    editableText(C.tagline, ["tagline"], X));

const coverVariants: Record<string, SlideFn> = {
  /** Newspaper masthead — rule above the name, rule below, no cards anywhere. */
  masthead: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%" } },
      e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `3px solid ${T.text}`, paddingBottom: 12 } },
        e("span", { key: "e", style: { fontFamily: T.fontB, fontSize: 12.5, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", color: T.text } }, editableText(C.eyebrow, ["eyebrow"], X)),
        e("span", { key: "r", style: { fontFamily: T.fontB, fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted } }, editableText(C.round, ["round"], X))),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto" } },
        coverTitle(T, C, X, tCoverSize(T), { weight: 300, lh: 0.92 }),
        e("div", { key: "r2", style: { height: 1, background: mix(T.text, 30, "transparent"), margin: "26px 0" } }),
        coverTag(T, C, X, 24, T.muted, 620)),
      e("div", { key: "bot", style: { display: "flex", gap: 34, borderTop: `1px solid ${mix(T.text, 30, "transparent")}`, paddingTop: 13 } },
        e("span", { key: "a", style: { fontSize: 13, color: T.muted } }, C.company),
        e("span", { key: "b", style: { fontSize: 13, color: T.muted } }, editableText(C.year, ["year"], X)))),
    { noFoot: true, total: A.total }),

  /** Poster slab — a full-bleed accent field with the name at campaign scale,
   *  over a fixed contrast band carrying the tagline and the ask.
   *
   *  Proportions follow the reference at 1920x1080, divided by 1.5 for this
   *  1280x720 frame: 128px margin -> 85, a 280px bottom band -> 187, and a
   *  300px headline -> 200 (set per template via `coverSize`). The band is a
   *  fixed strip rather than a flex row so its depth holds whatever the
   *  tagline's length, and the name wraps instead of clipping.                */
  slab: (T, C, i, X, A) => {
    const M = 85;                 // 128px margin at 1920
    const BAND = 187;             // 280px band at 1920
    const inked = T.mode === "light";
    const bandBg = inked ? T.accent2 : T.bg;
    const bandInk = inked ? T.bg : T.text;
    const askText = C.ask?.headline || C.round || "";
    return e("div", { style: { position: "relative", width: 1280, height: 720, background: T.accent, color: "#111", fontFamily: T.fontB + ", sans-serif", overflow: "hidden" } },
      e("div", { key: "body", style: { position: "absolute", left: M, right: M, top: M, bottom: BAND + 26, display: "flex", flexDirection: "column", minWidth: 0 } },
        e("div", { key: "eb", style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 } },
          e("span", { key: "a", style: { fontFamily: fD(T), fontSize: 21, fontWeight: 500, letterSpacing: 4, textTransform: "uppercase", color: "#111" } },
            editableText(C.eyebrow, ["eyebrow"], X), " — ", editableText(C.year, ["year"], X)),
          e("span", { key: "b", style: { fontFamily: fD(T), fontSize: 21, fontWeight: 500, letterSpacing: 4, textTransform: "uppercase", color: "#111", whiteSpace: "nowrap" } },
            editableText(C.round, ["round"], X))),
        e("h1", { key: "h", style: { margin: "auto 0 0", fontFamily: fD(T), fontWeight: 700, fontSize: coverFit(T, C.company), lineHeight: 0.9, letterSpacing: "-0.018em", textTransform: "uppercase", color: "#111", overflowWrap: "anywhere" } },
          editableText(C.company, ["company"], X))),
      e("div", { key: "band", style: { position: "absolute", left: 0, right: 0, bottom: 0, height: BAND, background: bandBg, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, padding: `0 ${M}px` } },
        e("p", { key: "t", style: { margin: 0, fontFamily: T.fontB, fontSize: 27, lineHeight: 1.3, maxWidth: 735, color: bandInk } },
          editableText(C.tagline, ["tagline"], X)),
        askText ? e("span", { key: "r", style: { fontFamily: fD(T), fontSize: 37, fontWeight: 700, textTransform: "uppercase", textAlign: "right", color: inked ? T.accent : T.accent2, whiteSpace: "nowrap" } }, askText) : null));
  },

  /** Technical drawing — faint grid ground and coordinate annotations. */
  grid: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%" } },
      eyebrow(T, editableText(C.eyebrow || "Investor Presentation", ["eyebrow"], X)),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto" } },
        coverTitle(T, C, X, tCoverSize(T), { weight: 400 }),
        coverTag(T, C, X, 21, T.muted, 620)),
      e("div", { key: "bot", style: { display: "flex", gap: 30, fontFamily: fD(T), fontSize: 12.5, letterSpacing: ".08em", color: T.accent } },
        e("span", { key: 1 }, editableText(C.round, ["round"], X)),
        e("span", { key: 2 }, editableText(C.year, ["year"], X)))),
    {
      noFoot: false, total: A.total,
      deco: e("div", { key: "g", style: { position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(${mix(T.accent, 7, "transparent")} 1px, transparent 1px), linear-gradient(90deg, ${mix(T.accent, 7, "transparent")} 1px, transparent 1px)`, backgroundSize: "40px 40px" } }),
    }),

  /** Photographic — type over a scrim. The gradient stands in for imagery. */
  scrim: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%" } },
      eyebrow(T, editableText(C.eyebrow || "Investor Presentation", ["eyebrow"], X)),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto" } },
        coverTitle(T, C, X, tCoverSize(T), { weight: 300, color: "#fff" }),
        coverTag(T, C, X, 22, "rgba(255,255,255,.72)", 520)),
      e("span", { key: "r", style: { fontFamily: fD(T), fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" } }, editableText(C.round, ["round"], X))),
    {
      noFoot: true, total: A.total,
      deco: e("div", { key: "sc", style: { position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(120% 80% at 78% 18%, ${mix(T.accent, 50, "transparent")} 0%, transparent 58%), radial-gradient(90% 70% at 15% 92%, ${mix(T.accent2, 42, "transparent")} 0%, transparent 60%), linear-gradient(104deg, rgba(5,5,7,0) 0%, rgba(5,5,7,.8) 46%, rgba(5,5,7,.95) 78%)` } }),
    }),

  /** Report title page — ruled header, a fact table where a blob would be. */
  document: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%" } },
      e("div", { key: "hd", style: { display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${border(T, true)}`, paddingBottom: 11 } },
        e("span", { key: "a", style: { fontFamily: fD(T), fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted } }, C.company, " / Confidential"),
        e("span", { key: "b", style: { fontFamily: fD(T), fontSize: 12, letterSpacing: ".1em", color: T.muted } }, editableText(C.year, ["year"], X))),
      e("div", { key: "mid", style: { marginTop: "auto" } },
        e("span", { key: "e", style: { fontFamily: T.fontB, fontSize: 12.5, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: T.accent } }, editableText(C.eyebrow, ["eyebrow"], X)),
        e("div", { key: "t", style: { marginTop: 14 } }, coverTitle(T, C, X, tCoverSize(T))),
        coverTag(T, C, X, 20, T.muted, 620)),
      e("div", { key: "bot", style: { marginTop: "auto", display: "flex", gap: 0, flexDirection: "column" } },
        (C.summary?.highlights || []).slice(0, 4).map((k, n) =>
          e("div", { key: n, style: { display: "flex", justifyContent: "space-between", borderTop: `1px solid ${border(T)}`, padding: "9px 0" } },
            e("span", { key: "l", style: { fontSize: 13, color: T.muted } }, k.l),
            e("span", { key: "v", style: { fontFamily: fD(T), fontSize: 13, fontWeight: 600, color: T.text } }, k.k))))),
    { noFoot: false, total: A.total }),

  /** Radical minimal — centred, small, the whitespace doing the talking. */
  minimal: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", textAlign: "center" } },
      coverTitle(T, C, X, tCoverSize(T), { weight: 300, lh: 1.05 }),
      e("div", { key: "r", style: { width: 34, height: 1, background: T.text, margin: "32px 0" } }),
      e("p", { key: "t", style: { margin: 0, fontSize: 18, fontWeight: 300, lineHeight: 1.5, color: T.muted, maxWidth: 440 } }, editableText(C.tagline, ["tagline"], X))),
    { noFoot: false, total: A.total }),

  /** Horizontal bands — the composition IS the colour strata. */
  bands: (T, C, i, X, A) => e("div", { style: { position: "relative", width: 1280, height: 720, background: T.bg, color: T.text, fontFamily: T.fontB + ", sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" } },
    e("div", { key: "b1", style: { height: 152, background: T.accent, display: "flex", alignItems: "center", padding: "0 72px" } },
      e("span", { style: { fontFamily: fD(T), fontSize: 14, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", color: "#fff" } }, editableText(C.eyebrow, ["eyebrow"], X))),
    e("div", { key: "b2", style: { flex: 1, background: T.surface, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" } },
      coverTitle(T, C, X, tCoverSize(T), { weight: 800 }),
      coverTag(T, C, X, 22, T.muted, 700)),
    e("div", { key: "b3", style: { height: 112, background: T.accent2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 72px" } },
      e("span", { key: "a", style: { fontSize: 14.5, fontWeight: 500, color: "#fff" } }, C.company),
      e("span", { key: "b", style: { fontSize: 14.5, color: "rgba(255,255,255,.82)" } }, editableText(C.round, ["round"], X)))),

  /** Poster — angled badge, soft chroma discs, oversized name. */
  poster: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%" } },
      e("span", { key: "bd", style: { alignSelf: "flex-start", background: T.accent, color: "#fff", fontFamily: T.fontB, fontSize: 13, fontWeight: 700, padding: "8px 17px", borderRadius: 999, transform: "rotate(-2deg)" } }, editableText(C.round, ["round"], X)),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto" } },
        coverTitle(T, C, X, tCoverSize(T), { weight: 800, lh: 0.9 }),
        coverTag(T, C, X, 24, T.muted, 660))),
    {
      noFoot: false, total: A.total,
      deco: e("div", { key: "d", style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" } },
        e("div", { key: 1, style: { position: "absolute", right: -100, top: -100, width: 430, height: 430, borderRadius: "50%", background: mix(T.accent, 16, "transparent") } }),
        e("div", { key: 2, style: { position: "absolute", right: 80, bottom: -80, width: 280, height: 280, borderRadius: "50%", background: mix(T.accent2, 16, "transparent") } })),
    }),

  /** Letterpress plate — a ruled frame inside the margin. */
  plate: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flex: 1, border: `1px solid ${mix(T.text, 26, "transparent")}`, flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 } },
      e("span", { key: "e", style: { fontFamily: T.fontB, fontSize: 12, fontWeight: 600, letterSpacing: ".26em", textTransform: "uppercase", color: T.accent } }, editableText(C.eyebrow, ["eyebrow"], X)),
      e("div", { key: "t", style: { marginTop: 26 } }, coverTitle(T, C, X, tCoverSize(T), { weight: 400, lh: 1 })),
      e("div", { key: "r", style: { width: 52, height: 1, background: mix(T.text, 34, "transparent"), margin: "26px 0" } }),
      e("p", { key: "g", style: { margin: 0, fontSize: 19, lineHeight: 1.5, color: T.muted, maxWidth: 560 } }, editableText(C.tagline, ["tagline"], X)),
      e("span", { key: "rd", style: { marginTop: 32, fontSize: 13, color: T.muted } }, editableText(C.round, ["round"], X))),
    { noFoot: true, total: A.total }),

  /** Colour panel beside the content — Swiss Grid and Split Panel. */
  panel: (T, C, i, X, A) => e("div", { style: { position: "relative", width: 1280, height: 720, background: T.bg, color: T.text, fontFamily: T.fontB + ", sans-serif", display: "flex", overflow: "hidden" } },
    e("div", { key: "main", style: { flex: 1, padding: "62px 56px 62px 80px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 } },
      e("div", { key: "top", style: { display: "flex", gap: 32, alignItems: "baseline" } },
        e("span", { key: "a", style: { fontFamily: fD(T), fontSize: 15, fontWeight: 700, color: T.text } }, C.company),
        e("span", { key: "b", style: { fontSize: 15, color: T.muted } }, editableText(C.eyebrow, ["eyebrow"], X)),
        e("span", { key: "c", style: { fontSize: 15, color: T.muted } }, editableText(C.year, ["year"], X))),
      e("div", { key: "mid" },
        coverTitle(T, C, X, tCoverSize(T), { weight: 700, lh: 0.94 }),
        e("div", { key: "r", style: { height: 3, background: T.text, margin: "26px 0 22px" } }),
        e("p", { key: "t", style: { margin: 0, fontSize: 21, lineHeight: 1.35, color: T.text, maxWidth: 520 } }, editableText(C.tagline, ["tagline"], X))),
      e("div", { key: "bot", style: { display: "flex", gap: 26 } },
        (C.summary?.highlights || []).slice(0, 3).map((k, n) =>
          e("span", { key: n, style: { fontSize: 14, color: T.muted } }, k.k, " ", k.l)))),
    e("div", { key: "pan", style: { width: 340, flexShrink: 0, background: T.accent, padding: "62px 34px", display: "flex", flexDirection: "column", justifyContent: "space-between" } },
      e("span", { key: "r", style: { fontFamily: fD(T), fontSize: 16, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#fff", lineHeight: 1.35 } }, editableText(C.round, ["round"], X)),
      e("span", { key: "m", style: { fontFamily: fD(T), fontSize: 62, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 } }, C.mark))),

  /** Tile grid — Bento. The name tile is generously sized and wraps, because
   *  the pack's own version clips an eight-character company name. */
  bento: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, flex: 1 } },
      e("div", { key: "name", style: { gridColumn: "1", gridRow: "1 / span 2", ...cardStyle(T), background: mix(T.accent, 14, "#fff"), padding: "26px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 } },
        e("span", { key: "e", style: { fontFamily: T.fontB, fontSize: 11.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: T.muted } }, editableText(C.eyebrow, ["eyebrow"], X)),
        e("div", { key: "n" },
          e("h1", { key: "h", style: { margin: 0, fontFamily: fD(T), fontWeight: 700, fontSize: coverFit(T, C.company), lineHeight: 0.98, letterSpacing: "-0.035em", color: T.text, overflowWrap: "anywhere" } }, editableText(C.company, ["company"], X)),
          e("p", { key: "t", style: { margin: "14px 0 0", fontSize: 15, lineHeight: 1.45, color: T.muted } }, editableText(C.tagline, ["tagline"], X)))),
      (C.summary?.highlights || []).slice(0, 4).map((k, n) =>
        e("div", { key: n, style: { ...cardStyle(T), background: mix([T.accent2, T.accent, T.accent2, T.accent][n] || T.accent, n % 2 ? 12 : 18, "#fff"), padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, minWidth: 0 } },
          e("span", { key: "k", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 34, letterSpacing: "-0.03em", color: T.text, lineHeight: 1 } }, editableText(k.k, ["summary", "highlights", n, "k"], X)),
          e("span", { key: "l", style: { fontSize: 13, lineHeight: 1.35, color: T.muted } }, editableText(k.l, ["summary", "highlights", n, "l"], X))))),
    { noFoot: false, total: A.total }),

  /** Serif statement with a figure row beneath — Gazette. */
  statement: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%" } },
      e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${border(T, true)}`, paddingBottom: 12 } },
        e("span", { key: "a", style: { fontFamily: T.fontB, fontSize: 12.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: T.text } }, C.company),
        e("span", { key: "b", style: { fontSize: 13.5, color: T.muted } }, editableText(C.eyebrow, ["eyebrow"], X), " · ", editableText(C.round, ["round"], X))),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto", maxWidth: 880 } },
        e("p", { key: "k", style: { margin: "0 0 18px", fontFamily: fD(T), fontSize: 22, fontStyle: "italic", color: T.accent } }, editableText(C.tagline, ["tagline"], X)),
        coverTitle(T, C, X, tCoverSize(T), { weight: 400, lh: 1.02 })),
      e("div", { key: "bot", style: { display: "flex", gap: 56, borderTop: `1px solid ${border(T, true)}`, paddingTop: 16 } },
        (C.summary?.highlights || []).slice(0, 3).map((k, n) =>
          e("div", { key: n, style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
            e("span", { key: "k", style: { fontFamily: fD(T), fontWeight: 400, fontSize: 32, letterSpacing: "-0.02em", color: T.text } }, editableText(k.k, ["summary", "highlights", n, "k"], X)),
            e("span", { key: "l", style: { fontSize: 13, color: T.muted } }, editableText(k.l, ["summary", "highlights", n, "l"], X)))))),
    { noFoot: true, total: A.total }),

  /** Terminal — a lit status dot, a gradient hairline, near-black ground. */
  terminal: (T, C, i, X, A) => shell(T, C, i,
    e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%" } },
      e("div", { key: "st", style: { display: "flex", alignItems: "center", gap: 11, fontFamily: fD(T), fontSize: 12.5, letterSpacing: ".14em", textTransform: "uppercase", color: T.accent } },
        e("span", { key: "d", style: { width: 7, height: 7, borderRadius: "50%", background: T.accent, boxShadow: `0 0 12px ${T.accent}` } }),
        e("span", { key: "t" }, editableText(C.eyebrow, ["eyebrow"], X))),
      e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto" } },
        coverTitle(T, C, X, tCoverSize(T), { weight: 600 }),
        e("div", { key: "r", style: { height: 1, background: `linear-gradient(90deg, ${T.accent}, transparent)`, margin: "26px 0" } }),
        coverTag(T, C, X, 21, T.muted, 620)),
      e("span", { key: "rd", style: { fontFamily: fD(T), fontSize: 13, letterSpacing: ".08em", color: T.muted } }, editableText(C.round, ["round"], X))),
    {
      noFoot: false, total: A.total,
      deco: e("div", { key: "d", style: { position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(70% 50% at 20% 100%, ${mix(T.accent, 13, "transparent")} 0%, transparent 70%)` } }),
    }),

  /**
   * Radial Dashboard — neon progress ring behind the company name, three
   * floating KPI cards at the bottom. Works for every deck type because it
   * reads `summary.highlights` (the four AI-produced key metrics) rather than
   * investor-specific fields.
   */
  radial: (T, C, i, X, A) => {
    const highlights = (C.summary?.highlights || []).slice(0, 3);
    // SVG arc helper: returns a stroked arc path on a cx/cy circle of radius r
    // from startAngle to endAngle (degrees, 0 = top).
    const arc = (cx: number, cy: number, r: number, start: number, end: number) => {
      const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(start));
      const y1 = cy + r * Math.sin(toRad(start));
      const x2 = cx + r * Math.cos(toRad(end));
      const y2 = cy + r * Math.sin(toRad(end));
      const large = end - start > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    };
    const W = 520; const H = 400;
    const cx = W / 2; const cy = H / 2 + 20;
    const rings = [
      { r: 180, pct: 0.82, opacity: 0.28 },
      { r: 148, pct: 0.64, opacity: 0.45 },
      { r: 116, pct: 0.91, opacity: 1 },
    ];
    const ringsSvg = e("svg", { viewBox: `0 0 ${W} ${H}`, style: { position: "absolute", right: -20, top: -30, width: W, height: H, pointerEvents: "none" } },
      // track rings (faint full circles)
      rings.map((r, k) => e("circle", { key: "tr" + k, cx, cy, r: r.r, fill: "none", stroke: mix(T.accent, 12, "transparent"), strokeWidth: 2 })),
      // progress arcs
      rings.map((r, k) => e("path", { key: "ar" + k, d: arc(cx, cy, r.r, 0, r.pct * 360), fill: "none", stroke: T.accent, strokeWidth: k === 2 ? 4 : 2.5, strokeLinecap: "round", opacity: r.opacity })),
      // glow dot at arc end for innermost ring
      e("circle", { key: "gd", cx: cx + rings[2].r * Math.cos(((rings[2].pct * 360 - 90) * Math.PI) / 180), cy: cy + rings[2].r * Math.sin(((rings[2].pct * 360 - 90) * Math.PI) / 180), r: 7, fill: T.accent, filter: `blur(2px)`, opacity: 0.9 })
    );
    const kpiCards = highlights.length > 0
      ? e("div", { key: "kpi", style: { display: "flex", gap: 14, marginTop: "auto" } },
          highlights.map((h, k) =>
            e("div", { key: k, style: { flex: 1, padding: "14px 18px", borderRadius: tRadius(T) || 12, background: "rgba(255,255,255,0.06)", border: `1px solid ${mix(T.accent, 22, "transparent")}`, backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: 5 } },
              e("div", { key: "v", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", color: T.accent, lineHeight: 1 } }, editableText(h.k, ["summary", "highlights", k, "k"], X)),
              e("div", { key: "l", style: { fontSize: 12.5, color: T.muted, lineHeight: 1.3 } }, editableText(h.l, ["summary", "highlights", k, "l"], X))
            )
          ))
      : null;
    return shell(T, C, i,
      e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" } },
        e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          logo(T, C),
          e("span", { key: "rd", style: { fontFamily: fD(T), fontSize: 12, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: T.accent, padding: "6px 14px", borderRadius: 999, border: `1px solid ${mix(T.accent, 35)}` } }, editableText(C.round || C.eyebrow, ["round"], X))
        ),
        e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto", maxWidth: 660, position: "relative", zIndex: 1 } },
          coverTitle(T, C, X, tCoverSize(T)),
          coverTag(T, C, X, 22, T.muted, 540)
        ),
        ringsSvg,
        kpiCards
      ),
      { noFoot: true, total: A.total,
        deco: e("div", { key: "rd", style: { position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(55% 65% at 72% 38%, ${mix(T.accent, 9, "transparent")} 0%, transparent 70%)` } }) }
    );
  },

  /**
   * Gradient Flow — smooth flowing wave curves as the background, the company
   * name centred over them, round metric badge pills below. The three pills
   * show the eyebrow, round, and year — always available regardless of deck
   * type, so this cover works for every deck (sales, GTM, product, etc.).
   */
  gradient: (T, C, i, X, A) => {
    const pills = [
      { v: editableText(C.eyebrow || "Pitch Deck", ["eyebrow"], X) },
      { v: editableText(C.round, ["round"], X) },
      { v: editableText(C.year, ["year"], X) },
    ].filter(p => p.v);
    // Flowing wave SVG drawn as bezier curves across the full 1280×720 canvas.
    const waveSvg = e("svg", { viewBox: "0 0 1280 720", preserveAspectRatio: "none",
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } },
      e("defs", { key: "df" },
        e("linearGradient", { id: "wg1", x1: 0, y1: 0, x2: 1, y2: 1 },
          e("stop", { key: 0, offset: "0%", stopColor: T.accent, stopOpacity: 0.55 }),
          e("stop", { key: 1, offset: "100%", stopColor: T.accent2, stopOpacity: 0.35 })
        ),
        e("linearGradient", { id: "wg2", x1: 1, y1: 0, x2: 0, y2: 1 },
          e("stop", { key: 0, offset: "0%", stopColor: T.accent2, stopOpacity: 0.40 }),
          e("stop", { key: 1, offset: "100%", stopColor: T.accent, stopOpacity: 0.20 })
        )
      ),
      e("path", { key: "w1", d: "M0 460 C320 300 640 560 960 380 S1280 480 1280 480 L1280 720 L0 720Z", fill: "url(#wg1)" }),
      e("path", { key: "w2", d: "M0 520 C280 420 560 600 840 460 S1120 560 1280 540 L1280 720 L0 720Z", fill: "url(#wg2)", opacity: 0.7 }),
      e("path", { key: "w3", d: "M0 580 C200 520 500 640 800 560 S1100 600 1280 590 L1280 720 L0 720Z", fill: T.accent2, opacity: 0.12 })
    );
    return e("div", { style: { position: "relative", width: 1280, height: 720, background: T.bg, color: T.text, fontFamily: T.fontB + ", sans-serif", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } },
      waveSvg,
      e("div", { key: "body", style: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 } },
        coverTitle(T, C, X, tCoverSize(T)),
        e("p", { key: "tg", style: { margin: "22px 0 40px", fontSize: 22, lineHeight: 1.45, color: T.muted, maxWidth: 620, fontWeight: 400 } },
          editableText(C.tagline, ["tagline"], X)),
        e("div", { key: "pills", style: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" } },
          pills.map((p, k) =>
            e("span", { key: k, style: { padding: "9px 20px", borderRadius: 999, background: "rgba(255,255,255,0.09)", border: `1px solid rgba(255,255,255,0.18)`, backdropFilter: "blur(6px)", fontFamily: fD(T), fontSize: 13.5, fontWeight: 500, color: T.text, letterSpacing: ".03em" } }, p.v)
          )
        )
      )
    );
  },

  /**
   * Donut Stats — dynamic multi-tier ring donut infographic with glowing center
   * callout, company identity on left, and key metric badges. Directly mirrors
   * the top-right design from the infographic showcase comp.
   */
  donut: (T, C, i, X, A) => {
    const rawHighlights = (C.summary?.highlights || []).slice(0, 3);
    const highlights = rawHighlights.length > 0 ? rawHighlights : [
      { k: "140+", l: "Countries Deployed" },
      { k: "2.4M", l: "Active Users" },
      { k: "4.9★", l: "Customer Rating" },
    ];

    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const arcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));
      const large = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    };

    const cx = 240;
    const cy = 240;
    const r = 135;
    const strokeWidth = 32;

    const seg1 = arcPath(cx, cy, r, 0, 190);
    const seg2 = arcPath(cx, cy, r, 202, 294);
    const seg3 = arcPath(cx, cy, r, 306, 350);

    const donutSvg = e("svg", {
      viewBox: "0 0 480 480",
      style: { width: 440, height: 440, flexShrink: 0, overflow: "visible" },
    },
      e("circle", { key: "out", cx, cy, r: 172, fill: "none", stroke: mix(T.accent, 16, "transparent"), strokeWidth: 1.5, strokeDasharray: "4 8" }),
      e("circle", { key: "base", cx, cy, r, fill: "none", stroke: mix(T.text, 6, "transparent"), strokeWidth }),
      e("path", { key: "s1", d: seg1, fill: "none", stroke: T.accent, strokeWidth, strokeLinecap: "round" }),
      e("path", { key: "s2", d: seg2, fill: "none", stroke: T.accent2 || mix(T.accent, 50), strokeWidth, strokeLinecap: "round" }),
      e("path", { key: "s3", d: seg3, fill: "none", stroke: mix(T.text, 24, "transparent"), strokeWidth, strokeLinecap: "round" }),
      e("circle", { key: "glowDot", cx: cx + r * Math.cos(toRad(190)), cy: cy + r * Math.sin(toRad(190)), r: 8, fill: T.accent, filter: "blur(2px)", opacity: 0.9 }),
      e("circle", { key: "innerBg", cx, cy, r: 96, fill: T.mode === "dark" ? "rgba(10,20,35,0.75)" : "rgba(255,255,255,0.85)", stroke: border(T), strokeWidth: 1, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.12))" }),
      e("text", { key: "val", x: cx, y: cy - 4, textAnchor: "middle", dominantBaseline: "middle", fill: T.accent, fontFamily: fD(T), fontWeight: 800, fontSize: 36, letterSpacing: "-0.03em" }, "+148%"),
      e("text", { key: "lbl", x: cx, y: cy + 30, textAnchor: "middle", dominantBaseline: "middle", fill: T.muted, fontFamily: T.fontB + ", sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.14em" }, "YOY SCALE"),
      e("line", { key: "l1", x1: cx + 115, y1: cy - 115, x2: cx + 160, y2: cy - 150, stroke: mix(T.accent, 40), strokeWidth: 1 }),
      e("circle", { key: "d1", cx: cx + 115, cy: cy - 115, r: 3, fill: T.accent }),
      e("line", { key: "l2", x1: cx + 115, y1: cy + 115, x2: cx + 160, y2: cy + 145, stroke: mix(T.accent2, 40), strokeWidth: 1 }),
      e("circle", { key: "d2", cx: cx + 115, cy: cy + 115, r: 3, fill: T.accent2 || T.accent })
    );

    return shell(T, C, i,
      e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%", zIndex: 1 } },
        e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          logo(T, C),
          e("span", { key: "badge", style: { fontFamily: fD(T), fontSize: 12, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: T.accent, padding: "7px 18px", borderRadius: 999, background: mix(T.accent, T.mode === "dark" ? 14 : 9, "transparent"), border: `1px solid ${mix(T.accent, 35)}` } },
            editableText(C.round || C.eyebrow || "GLOBAL OVERVIEW", ["round"], X))
        ),
        e("div", { key: "main", style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, gap: 40, marginTop: 12 } },
          e("div", { key: "left", style: { maxWidth: 620, display: "flex", flexDirection: "column" } },
            eyebrow(T, editableText(C.eyebrow || "DATA PLATFORM", ["eyebrow"], X)),
            coverTitle(T, C, X, tCoverSize(T), { weight: 700 }),
            coverTag(T, C, X, 21, T.muted, 540),
            e("div", { key: "stats", style: { display: "flex", gap: 14, marginTop: 36, flexWrap: "wrap" } },
              highlights.map((h, k) =>
                e("div", { key: k, style: { padding: "14px 20px", borderRadius: tRadius(T) || 14, background: T.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: `1px solid ${border(T, true)}`, backdropFilter: "blur(10px)", minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" } },
                  e("div", { key: "v", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", color: k === 0 ? T.accent : T.text, lineHeight: 1 } },
                    editableText(h.k, ["summary", "highlights", k, "k"], X)),
                  e("div", { key: "l", style: { fontSize: 12, color: T.muted, marginTop: 6, fontWeight: 500 } },
                    editableText(h.l, ["summary", "highlights", k, "l"], X))
                )
              )
            )
          ),
          e("div", { key: "right", style: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" } },
            e("div", { key: "glow", style: { position: "absolute", width: 340, height: 340, borderRadius: "50%", background: mix(T.accent, T.mode === "dark" ? 18 : 10, "transparent"), filter: "blur(36px)", pointerEvents: "none" } }),
            donutSvg
          )
        )
      ),
      { noFoot: true, total: A.total }
    );
  },

  /**
   * Heatmap / Global Network — dark canvas with matrix dot-grid world coordinates,
   * glowing network nodes, interconnected curved data arcs, and live telemetry cards.
   * Directly mirrors the bottom-left design from the infographic showcase comp.
   */
  heatmap: (T, C, i, X, A) => {
    const mapDots = [
      { cx: 210, cy: 190 }, { cx: 230, cy: 180 }, { cx: 260, cy: 180 }, { cx: 290, cy: 190 },
      { cx: 200, cy: 210 }, { cx: 230, cy: 210 }, { cx: 270, cy: 210 }, { cx: 310, cy: 210 },
      { cx: 220, cy: 240 }, { cx: 250, cy: 240 }, { cx: 290, cy: 240 }, { cx: 330, cy: 230 },
      { cx: 250, cy: 270 }, { cx: 280, cy: 280 }, { cx: 300, cy: 300 },
      { cx: 330, cy: 380 }, { cx: 350, cy: 390 }, { cx: 370, cy: 410 },
      { cx: 340, cy: 440 }, { cx: 360, cy: 450 }, { cx: 350, cy: 490 }, { cx: 340, cy: 530 },
      { cx: 580, cy: 180 }, { cx: 610, cy: 170 }, { cx: 640, cy: 170 }, { cx: 670, cy: 180 },
      { cx: 590, cy: 210 }, { cx: 620, cy: 210 }, { cx: 650, cy: 220 }, { cx: 680, cy: 210 },
      { cx: 600, cy: 280 }, { cx: 630, cy: 270 }, { cx: 660, cy: 280 },
      { cx: 610, cy: 330 }, { cx: 640, cy: 340 }, { cx: 680, cy: 350 },
      { cx: 630, cy: 390 }, { cx: 660, cy: 410 }, { cx: 650, cy: 460 },
      { cx: 750, cy: 170 }, { cx: 790, cy: 170 }, { cx: 830, cy: 160 }, { cx: 880, cy: 160 }, { cx: 930, cy: 170 },
      { cx: 730, cy: 210 }, { cx: 770, cy: 210 }, { cx: 820, cy: 210 }, { cx: 870, cy: 200 }, { cx: 920, cy: 210 }, { cx: 970, cy: 200 },
      { cx: 760, cy: 260 }, { cx: 800, cy: 260 }, { cx: 850, cy: 260 }, { cx: 900, cy: 250 }, { cx: 950, cy: 260 },
      { cx: 790, cy: 310 }, { cx: 830, cy: 320 }, { cx: 880, cy: 320 },
      { cx: 890, cy: 380 }, { cx: 920, cy: 400 },
      { cx: 950, cy: 470 }, { cx: 990, cy: 460 }, { cx: 1030, cy: 470 },
      { cx: 960, cy: 510 }, { cx: 1010, cy: 510 }, { cx: 1040, cy: 520 },
    ];

    const hubs = [
      { id: "sf", cx: 220, cy: 240, label: "SF · US-WEST" },
      { id: "nyc", cx: 330, cy: 230, label: "NYC · US-EAST" },
      { id: "lon", cx: 600, cy: 190, label: "LDN · EU-CENTRAL" },
      { id: "fra", cx: 650, cy: 210, label: "FRA · CORE" },
      { id: "tko", cx: 970, cy: 200, label: "TYO · AP-NORTH" },
      { id: "sg", cx: 890, cy: 380, label: "SIN · AP-SOUTH" },
      { id: "syd", cx: 1010, cy: 510, label: "SYD · OC-EAST" },
    ];

    const arcs = [
      "M 220 240 Q 275 190 330 230",
      "M 330 230 Q 465 140 600 190",
      "M 600 190 Q 625 180 650 210",
      "M 650 210 Q 810 120 970 200",
      "M 970 200 Q 940 290 890 380",
      "M 890 380 Q 960 440 1010 510",
      "M 220 240 Q 590 60 970 200",
    ];

    const mapSvg = e("svg", {
      viewBox: "0 0 1280 720",
      preserveAspectRatio: "xMidYMid slice",
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }
    },
      e("defs", { key: "d" },
        e("pattern", { id: "hmGrid", width: 60, height: 60, patternUnits: "userSpaceOnUse" },
          e("path", { d: "M 60 0 L 0 0 0 60", fill: "none", stroke: mix(T.accent, 6, "transparent"), strokeWidth: 1 }),
          e("circle", { cx: 0, cy: 0, r: 1.5, fill: mix(T.accent, 20, "transparent") })
        ),
        e("linearGradient", { id: "arcGrad", x1: 0, y1: 0, x2: 1, y2: 0 },
          e("stop", { offset: "0%", stopColor: T.accent, stopOpacity: 0.8 }),
          e("stop", { offset: "50%", stopColor: T.accent2 || T.accent, stopOpacity: 0.95 }),
          e("stop", { offset: "100%", stopColor: T.accent, stopOpacity: 0.6 })
        )
      ),
      e("rect", { key: "bgGrid", width: "100%", height: "100%", fill: "url(#hmGrid)" }),
      mapDots.map((pt, k) =>
        e("circle", { key: "md" + k, cx: pt.cx, cy: pt.cy, r: 3.5, fill: T.mode === "dark" ? mix(T.text, 22, "transparent") : mix(T.text, 14, "transparent") })
      ),
      arcs.map((d, k) =>
        e("path", { key: "arc" + k, d, fill: "none", stroke: "url(#arcGrad)", strokeWidth: 1.8, strokeDasharray: k === 6 ? "5 6" : "none", opacity: 0.75 })
      ),
      hubs.map((h, k) =>
        e("g", { key: "hub" + k },
          e("circle", { cx: h.cx, cy: h.cy, r: 14, fill: "none", stroke: T.accent, strokeWidth: 1.5, opacity: 0.35 }),
          e("circle", { cx: h.cx, cy: h.cy, r: 6, fill: T.accent, filter: "blur(3px)", opacity: 0.8 }),
          e("circle", { cx: h.cx, cy: h.cy, r: 4, fill: "#FFFFFF" })
        )
      )
    );

    const telemetryItems = [
      { k: "NETWORK LATENCY", v: "< 14ms Edge" },
      { k: "ACTIVE COVERAGE", v: "180+ Data Hubs" },
      { k: "SYSTEM RELIABILITY", v: "99.999% SLA" },
      { k: "INTELLIGENCE MESH", v: "REAL-TIME SYNC" },
    ];

    return shell(T, C, i,
      e("div", { key: "in", style: { position: "relative", display: "flex", flexDirection: "column", height: "100%", zIndex: 1 } },
        mapSvg,
        e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 } },
          logo(T, C),
          e("div", { key: "status", style: { display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderRadius: 999, background: "rgba(0,0,0,0.45)", border: `1px solid ${mix(T.accent, 40)}`, backdropFilter: "blur(12px)" } },
            e("span", { key: "dot", style: { width: 8, height: 8, borderRadius: "50%", background: T.accent, boxShadow: `0 0 10px ${T.accent}` } }),
            e("span", { key: "txt", style: { fontFamily: fD(T), fontSize: 11.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: T.accent } },
              editableText(C.round || "GLOBAL MESH TELEMETRY", ["round"], X))
          )
        ),
        e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto", maxWidth: 760, position: "relative", zIndex: 2, padding: "20px 0" } },
          eyebrow(T, editableText(C.eyebrow || "GLOBAL INTELLIGENCE NETWORK", ["eyebrow"], X)),
          coverTitle(T, C, X, tCoverSize(T), { weight: 800, lh: 0.94 }),
          coverTag(T, C, X, 22, T.muted, 600)
        ),
        e("div", { key: "bot", style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: "auto", position: "relative", zIndex: 2 } },
          telemetryItems.map((item, k) =>
            e("div", { key: k, style: { padding: "14px 18px", borderRadius: tRadius(T) || 10, background: T.mode === "dark" ? "rgba(10,18,30,0.72)" : "rgba(255,255,255,0.72)", border: `1px solid ${border(T, true)}`, backdropFilter: "blur(12px)", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" } },
              e("div", { key: "k", style: { fontSize: 10.5, fontFamily: fD(T), fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accent } }, item.k),
              e("div", { key: "v", style: { fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4, letterSpacing: "-0.01em" } }, item.v)
            )
          )
        )
      ),
      { noFoot: true, total: A.total }
    );
  },
};

const cover: SlideFn = (T, C, i, X, A) => {
  const variant = coverVariants[tCover(T)];
  if (variant) return variant(T, C, i, X, A);

  const deco = e("div", { key: "dc", style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" } },
    e("div", { key: 1, style: { position: "absolute", right: -120, top: -120, width: 460, height: 460, borderRadius: "50%", background: mix(T.accent2, T.mode === "dark" ? 22 : 16, "transparent"), filter: "blur(10px)" } }),
    e("div", { key: 2, style: { position: "absolute", right: 120, bottom: -160, width: 380, height: 380, borderRadius: "50%", background: mix(T.accent, T.mode === "dark" ? 20 : 14, "transparent"), filter: "blur(6px)" } }),
    e("div", { key: 3, style: { position: "absolute", right: 90, top: 150, width: 220, height: 220, borderRadius: "50%", border: `1.5px solid ${border(T, true)}` } })
  );
  const inner = e("div", { key: "in", style: { display: "flex", flexDirection: "column", height: "100%" } },
    e("div", { key: "top", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      logo(T, C),
      e("span", { key: "y", style: { fontFamily: fD(T), fontSize: 12, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: T.muted } },
        editableText(C.eyebrow, ["eyebrow"], X), " · ", editableText(C.year, ["year"], X))
    ),
    e("div", { key: "mid", style: { marginTop: "auto", marginBottom: "auto", maxWidth: 760 } },
      eyebrow(T, editableText(C.eyebrow || "Investor Presentation", ["eyebrow"], X)),
      e("h1", { key: "co", style: { margin: "0 0 4px", fontFamily: fD(T), fontWeight: T.serif ? 600 : 700, fontSize: 96, lineHeight: 0.96, letterSpacing: "-0.035em", color: T.text } }, editableText(C.company, ["company"], X)),
      e("p", { key: "tg", style: { margin: "22px 0 0", fontSize: 23, lineHeight: 1.4, color: T.muted, maxWidth: 560, fontWeight: 400 } }, editableText(C.tagline, ["tagline"], X))
    ),
    e("div", { key: "bot", style: { display: "flex", alignItems: "center", gap: 16 } },
      e("span", { key: "r", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 15, color: T.text, padding: "9px 16px", borderRadius: 999, background: mix(T.accent, T.mode === "dark" ? 18 : 12, T.mode === "dark" ? "transparent" : "#fff"), border: `1px solid ${mix(T.accent, 34)}` } }, editableText(C.round, ["round"], X)),
      e("span", { key: "c", style: { fontSize: 13, color: T.muted, letterSpacing: ".04em" } }, "Confidential")
    )
  );
  return shell(T, C, i, inner, { noFoot: true, deco, total: A.total });
};

const summary: SlideFn = (T, C, i, X, A) => {
  const S = sec(C, A.k, EMPTY_SUMMARY);
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 920 } },
      h1(T, editableText(S.headline, [A.k, "headline"], X), 50),
      e("p", { key: "l", style: { margin: "24px 0 0", fontSize: 20, lineHeight: 1.6, color: T.muted, maxWidth: 860 } }, editableText(S.lead, [A.k, "lead"], X, { multiline: true }))
    ),
    e("div", { key: "kp", style: { marginTop: 52 } }, kpiTiles(T, S.highlights || [], [A.k, "highlights"], X, 4))
  );
  return shell(T, C, i, inner, { total: A.total });
};

const probsol: SlideFn = (T, C, i, X, A) => {
  const PS = sec(C, A.k, EMPTY_PROBSOL);
  const card = (titlePath: EditPath, title: string, leadPath: EditPath, lead: string, itemsPath: EditPath, items: { k: string; t: string }[], footPath: EditPath, foot: string, solution: boolean): N =>
    e("div", { style: { ...cardStyle(T, solution), flex: 1, display: "flex", flexDirection: "column", padding: "28px 30px" } },
      e("div", { key: "lab", style: { fontSize: 12, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: solution ? T.accent : T.muted } }, editableText(title, titlePath, X)),
      e("div", { key: "ld", style: { marginTop: 11, fontFamily: fD(T), fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.01em", color: T.text } }, editableText(lead, leadPath, X)),
      e("div", { key: "it", style: { marginTop: 24, display: "flex", flexDirection: "column", gap: 18 } },
        (items || []).map((it, k) => e("div", { key: k, style: { display: "flex", gap: 13, alignItems: "flex-start" } },
          e("span", { key: "d", style: { width: 8, height: 8, borderRadius: "50%", marginTop: 8, flexShrink: 0, background: solution ? T.accent : mix(T.muted, 70) } }),
          e("div", { key: "t", style: { fontSize: 15.5, lineHeight: 1.55, color: T.muted } },
            e("span", { key: "k", style: { fontWeight: 700, color: T.text } }, editableText(it.k, [...itemsPath, k, "k"], X)),
            " — ",
            editableText(it.t, [...itemsPath, k, "t"], X, { multiline: true }))
        ))
      ),
      e("div", { key: "ft", style: { marginTop: "auto", paddingTop: 20, borderTop: `1px solid ${border(T)}`, display: "flex", gap: 11, alignItems: "center" } },
        e("span", { key: "b", style: { width: 24, height: 3, borderRadius: 2, flexShrink: 0, background: solution ? T.accent : mix(T.muted, 60) } }),
        e("span", { key: "t", style: { fontSize: 14.5, lineHeight: 1.45, fontWeight: 600, color: solution ? T.accent : T.text } }, editableText(foot, footPath, X, { multiline: true }))
      )
    );
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 860 } },
      h1(T, editableText(PS.headline, [A.k, "headline"], X), 44),
      e("p", { key: "s", style: { margin: "16px 0 0", fontSize: 18, color: T.muted } }, editableText(PS.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "cards", style: { display: "flex", gap: 22, marginTop: 26, flex: 1 } },
      card([A.k, "problemTitle"], PS.problemTitle, [A.k, "problemLead"], PS.problemLead, [A.k, "problem"], PS.problem, [A.k, "problemFoot"], PS.problemFoot, false),
      card([A.k, "solutionTitle"], PS.solutionTitle, [A.k, "solutionLead"], PS.solutionLead, [A.k, "solution"], PS.solution, [A.k, "solutionFoot"], PS.solutionFoot, true)
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const product: SlideFn = (T, C, i, X, A) => {
  const P = sec(C, A.k, EMPTY_PRODUCT);
  const steps = P.steps || [];
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 820 } }, h1(T, editableText(P.headline, [A.k, "headline"], X), 46),
      e("p", { key: "s", style: { margin: "18px 0 0", fontSize: 18, lineHeight: 1.5, color: T.muted } }, editableText(P.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "st", style: { display: "flex", gap: 20, marginTop: 34, flex: 1 } },
      steps.map((s, k) => e("div", { key: k, style: { ...cardStyle(T), flex: 1, display: "flex", flexDirection: "column", padding: "28px 28px 26px" } },
        e("div", { key: "row", style: { display: "flex", alignItems: "center", gap: 14 } },
          e("div", { key: "n", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 17, color: T.accent, width: 46, height: 46, borderRadius: 13, background: mix(T.accent, T.mode === "dark" ? 20 : 12, T.mode === "dark" ? "transparent" : "#fff"), display: "flex", alignItems: "center", justifyContent: "center" } }, editableText(s.n, [A.k, "steps", k, "n"], X)),
          e("div", { key: "ln", style: { flex: 1, height: 2, background: mix(T.accent, 28) } })
        ),
        e("div", { key: "mid", style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" } },
          e("div", { key: "t", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 26, color: T.text, letterSpacing: "-0.01em" } }, editableText(s.t, [A.k, "steps", k, "t"], X)),
          e("div", { key: "d", style: { marginTop: 12, fontSize: 15.5, lineHeight: 1.55, color: T.muted } }, editableText(s.d, [A.k, "steps", k, "d"], X, { multiline: true }))
        ),
        e("div", { key: "tg", style: { paddingTop: 16, display: "flex", flexWrap: "wrap", gap: 8 } },
          (s.tags || []).map((tg, n) => e("span", { key: n, style: { fontSize: 12.5, fontWeight: 500, color: T.muted, padding: "5px 12px", borderRadius: 999, border: `1px solid ${border(T, true)}` } }, editableText(tg, [A.k, "steps", k, "tags", n], X))))
      ))
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const market: SlideFn = (T, C, i, X, A) => {
  const M = sec(C, A.k, EMPTY_MARKET);
  const keys = ["tam", "sam", "som"] as const;
  const rings = [{ d: 360, key: keys[0], k: M.tam, op: T.mode === "dark" ? 0.16 : 0.1 }, { d: 248, key: keys[1], k: M.sam, op: T.mode === "dark" ? 0.26 : 0.18 }, { d: 140, key: keys[2], k: M.som, op: 1 }];
  const circle = e("div", { key: "cir", style: { position: "relative", width: 360, height: 360, flexShrink: 0 } },
    rings.map((r, k) => e("div", { key: k, style: { position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: r.d, height: r.d, borderRadius: "50%", background: k === 2 ? T.accent : mix(T.accent, r.op * 100, T.mode === "dark" ? "transparent" : "#fff"), border: `1.5px solid ${mix(T.accent, k === 2 ? 100 : 45)}`, display: "flex", alignItems: k === 2 ? "center" : "flex-start", justifyContent: "center", paddingTop: k === 2 ? 0 : 14 } },
      e("span", { style: { fontFamily: fD(T), fontWeight: 700, fontSize: k === 2 ? 30 : 17, color: k === 2 ? (T.mode === "dark" ? T.bg : "#fff") : T.text } }, editableText(r.k?.v || "", [A.k, r.key, "v"], X))
    ))
  );
  const legendItems: N[] = keys.map((key, k) => {
    const r = M[key];
    return e("div", { key: k, style: { display: "flex", gap: 16, alignItems: "flex-start" } },
      e("span", { key: "sw", style: { width: 14, height: 14, borderRadius: 4, marginTop: 5, background: mix(T.accent, [40, 68, 100][k]), flexShrink: 0 } }),
      e("div", { key: "tx" },
        e("div", { key: "r", style: { display: "flex", alignItems: "baseline", gap: 10 } },
          e("span", { key: "a", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 13, letterSpacing: ".12em", color: T.accent } }, ["TAM", "SAM", "SOM"][k]),
          e("span", { key: "v", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: T.text } }, editableText(r?.v || "", [A.k, key, "v"], X))
        ),
        e("div", { key: "l", style: { marginTop: 4, fontSize: 15.5, color: T.muted, lineHeight: 1.4 } }, editableText(r?.l || "", [A.k, key, "l"], X))
      )
    );
  });
  legendItems.push(e("div", { key: "note", style: { marginTop: 8, padding: "14px 18px", borderRadius: 12, background: T.mode === "dark" ? mix(T.surface, 70, T.bg) : mix(T.accent, 6, "#fff"), border: `1px solid ${border(T)}`, fontSize: 14, lineHeight: 1.5, color: T.muted } }, editableText(M.note, [A.k, "note"], X, { multiline: true })));
  const legend = e("div", { key: "leg", style: { display: "flex", flexDirection: "column", gap: 22, flex: 1 } }, legendItems);

  // How the three figures are drawn is a template decision. "rings" is the
  // original nested-circle diagram; the rest replace it wholesale rather than
  // recolouring it, because a data treatment is a large part of a deck's voice.
  const fig = tFigure(T);
  const labels = ["TAM", "SAM", "SOM"] as const;
  const widths = [100, 42, 13];

  let body: N;
  if (fig === "rings") {
    body = e("div", { key: "g", style: { display: "flex", gap: 64, alignItems: "center", marginTop: "auto", marginBottom: "auto" } }, circle, legend);
  } else if (fig === "bars") {
    body = e("div", { key: "g", style: { display: "flex", flexDirection: "column", gap: 26, marginTop: "auto", marginBottom: "auto" } },
      keys.map((key, k) => e("div", { key: k, style: { display: "flex", flexDirection: "column", gap: 9 } },
        e("div", { key: "r", style: { display: "flex", alignItems: "baseline", gap: 14 } },
          e("span", { key: "a", style: { fontFamily: fD(T), fontSize: 13, fontWeight: 600, letterSpacing: ".12em", color: T.muted, width: 46 } }, labels[k]),
          e("span", { key: "v", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", color: k === 0 ? T.accent : T.text } }, editableText(M[key]?.v || "", [A.k, key, "v"], X)),
          e("span", { key: "l", style: { marginLeft: "auto", fontSize: 15, color: T.muted, maxWidth: 480, textAlign: "right" } }, editableText(M[key]?.l || "", [A.k, key, "l"], X))),
        e("div", { key: "t", style: { height: 12, background: mix(T.text, 10, "transparent"), borderRadius: tRadius(T) ? 6 : 0 } },
          e("div", { style: { width: `${widths[k]}%`, height: "100%", background: k === 0 ? T.accent : mix(T.accent, 45), borderRadius: "inherit" } })))),
      e("p", { key: "n", style: { marginTop: 6, fontSize: 14, lineHeight: 1.5, color: T.muted, maxWidth: 780 } }, editableText(M.note, [A.k, "note"], X, { multiline: true })));
  } else if (fig === "blocks") {
    body = e("div", { key: "g", style: { display: "flex", flexDirection: "column", gap: 20, marginTop: "auto", marginBottom: "auto" } },
      e("div", { key: "row", style: { display: "flex", gap: 20, alignItems: "flex-end", height: 300 } },
        keys.map((key, k) => e("div", { key: k, style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14, height: `${44 + widths[k] * 0.56}%` } },
          e("span", { key: "v", style: { fontFamily: fD(T), fontWeight: 900, fontSize: 40, letterSpacing: "-0.03em", color: T.text } }, editableText(M[key]?.v || "", [A.k, key, "v"], X)),
          e("div", { key: "b", style: { flex: 1, background: k === 0 ? T.accent : mix(T.accent, 40), borderRadius: tRadius(T) } }),
          e("div", { key: "t" },
            e("div", { key: "a", style: { fontFamily: fD(T), fontSize: 13, fontWeight: 700, letterSpacing: ".1em", color: T.text } }, labels[k]),
            e("div", { key: "l", style: { marginTop: 5, fontSize: 13.5, lineHeight: 1.4, color: T.muted } }, editableText(M[key]?.l || "", [A.k, key, "l"], X)))))),
      e("p", { key: "n", style: { fontSize: 13.5, lineHeight: 1.5, color: T.muted, maxWidth: 780 } }, editableText(M.note, [A.k, "note"], X, { multiline: true })));
  } else if (fig === "table") {
    body = e("div", { key: "g", style: { display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" } },
      e("div", { key: "hd", style: { display: "grid", gridTemplateColumns: "90px 210px 1fr", borderBottom: `2px solid ${T.text}`, paddingBottom: 9 } },
        ["", "Value", "Definition"].map((hd, k) => e("span", { key: k, style: { fontFamily: T.fontB, fontSize: 12, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted } }, hd))),
      keys.map((key, k) => e("div", { key: k, style: { display: "grid", gridTemplateColumns: "90px 210px 1fr", alignItems: "baseline", borderBottom: `1px solid ${border(T)}`, padding: "16px 0" } },
        e("span", { key: "a", style: { fontFamily: fD(T), fontSize: 15, fontWeight: 700, color: T.text } }, labels[k]),
        e("span", { key: "v", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", color: k === 0 ? T.accent : T.text } }, editableText(M[key]?.v || "", [A.k, key, "v"], X)),
        e("span", { key: "l", style: { fontSize: 14.5, lineHeight: 1.45, color: T.muted } }, editableText(M[key]?.l || "", [A.k, key, "l"], X)))),
      e("p", { key: "n", style: { marginTop: 18, fontSize: 13, lineHeight: 1.5, color: T.muted, maxWidth: 800 } }, editableText(M.note, [A.k, "note"], X, { multiline: true })));
  } else {
    // rows — ruled, editorial: no chart at all, the figures set as type.
    body = e("div", { key: "g", style: { display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" } },
      keys.map((key, k) => e("div", { key: k, style: { display: "flex", alignItems: "baseline", gap: 24, borderTop: `1px solid ${border(T, true)}`, padding: "18px 0" } },
        e("span", { key: "a", style: { fontFamily: T.fontB, fontSize: 12.5, fontWeight: 600, letterSpacing: ".14em", color: T.muted, width: 56 } }, labels[k]),
        e("span", { key: "v", style: { fontFamily: fD(T), fontWeight: T.serif ? 400 : 600, fontSize: 42, letterSpacing: "-0.02em", color: k === 0 ? T.accent : T.text, width: 230 } }, editableText(M[key]?.v || "", [A.k, key, "v"], X)),
        e("span", { key: "l", style: { fontSize: 16, lineHeight: 1.45, color: T.muted } }, editableText(M[key]?.l || "", [A.k, key, "l"], X)))),
      e("p", { key: "n", style: { marginTop: 22, fontSize: 14, lineHeight: 1.55, color: T.muted, maxWidth: 780 } }, editableText(M.note, [A.k, "note"], X, { multiline: true })));
  }

  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    h1(T, editableText(M.headline, [A.k, "headline"], X), 46),
    body
  );
  return shell(T, C, i, inner, { total: A.total });
};

const model: SlideFn = (T, C, i, X, A) => {
  const M = sec(C, A.k, EMPTY_MODEL);
  const flowArr = M.flow || [];
  const flow = e("div", { key: "flow", style: { display: "flex", alignItems: "center", gap: 0, marginTop: 6 } },
    flowArr.map((f, k) => [
      e("div", { key: "n" + k, style: { flex: 1, textAlign: "center", padding: "13px 10px", borderRadius: 10, background: k === flowArr.length - 1 ? mix(T.accent, T.mode === "dark" ? 20 : 12, T.mode === "dark" ? "transparent" : "#fff") : (T.mode === "dark" ? mix(T.surface, 70, T.bg) : T.surface), border: `1px solid ${k === flowArr.length - 1 ? mix(T.accent, 40) : border(T)}`, fontSize: 13.5, fontWeight: 600, color: k === flowArr.length - 1 ? T.accent : T.text, fontFamily: fD(T) } }, editableText(f, [A.k, "flow", k], X)),
      k < flowArr.length - 1 ? e("span", { key: "ar" + k, style: { padding: "0 12px", color: T.accent, fontSize: 20, fontWeight: 700 } }, "→") : null
    ])
  );
  const streams = e("div", { key: "str", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 20, flex: 1 } },
    (M.streams || []).map((s, k) => e("div", { key: k, style: { ...cardStyle(T), borderRadius: 16, padding: "26px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 } },
      e("div", { key: "l" },
        e("div", { key: "t", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 19, color: T.text, letterSpacing: "-0.01em" } }, editableText(s.t, [A.k, "streams", k, "t"], X)),
        e("div", { key: "d", style: { marginTop: 8, fontSize: 14, lineHeight: 1.5, color: T.muted, maxWidth: 300 } }, editableText(s.d, [A.k, "streams", k, "d"], X, { multiline: true }))
      ),
      e("div", { key: "v", style: { textAlign: "right", flexShrink: 0 } },
        e("div", { key: "a", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", color: T.accent, lineHeight: 1 } }, editableText(s.v, [A.k, "streams", k, "v"], X)),
        e("div", { key: "b", style: { fontSize: 12, color: T.muted, marginTop: 4 } }, editableText(s.vl, [A.k, "streams", k, "vl"], X))
      )
    ))
  );
  const tiers = e("div", { key: "tier", style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20 } },
    (M.tiers || []).map((t, k) => e("div", { key: k, style: { border: `1px solid ${k === 1 ? mix(T.accent, 45) : border(T)}`, borderRadius: 13, padding: "16px 18px", background: k === 1 ? mix(T.accent, T.mode === "dark" ? 12 : 7, T.mode === "dark" ? "transparent" : "#fff") : "transparent" } },
      e("div", { key: "t", style: { fontSize: 13, fontWeight: 600, letterSpacing: ".04em", color: T.muted, textTransform: "uppercase" } }, editableText(t.t, [A.k, "tiers", k, "t"], X)),
      e("div", { key: "p", style: { marginTop: 8, display: "flex", alignItems: "baseline", gap: 3 } },
        e("span", { key: "a", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 24, color: T.text } }, editableText(t.p, [A.k, "tiers", k, "p"], X)),
        e("span", { key: "s", style: { fontSize: 13, color: T.muted } }, editableText(t.s, [A.k, "tiers", k, "s"], X))),
      e("div", { key: "d", style: { marginTop: 6, fontSize: 13.5, color: T.muted } }, editableText(t.d, [A.k, "tiers", k, "d"], X, { multiline: true }))
    ))
  );
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    h1(T, editableText(M.headline, [A.k, "headline"], X), 42),
    flow, streams, tiers
  );
  return shell(T, C, i, inner, { total: A.total });
};

const traction: SlideFn = (T, C, i, X, A) => {
  const Tr = sec(C, A.k, EMPTY_TRACTION);
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    h1(T, editableText(Tr.headline, [A.k, "headline"], X), 44),
    e("div", { key: "g", style: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 44, marginTop: 30, alignItems: "center", flex: 1 } },
      e("div", { key: "ch" },
        e("div", { key: "lab", style: { fontSize: 13, fontWeight: 600, letterSpacing: ".04em", color: T.muted, marginBottom: 16, textTransform: "uppercase" } }, editableText(Tr.sub, [A.k, "sub"], X)),
        areaChart(T, Tr.series || [], 520, 232, X, [A.k, "series"])
      ),
      e("div", { key: "kp", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
        (Tr.kpis || []).map((k, n) => e("div", { key: n, style: { ...cardStyle(T), borderRadius: 14, padding: "18px 18px" } },
          e("div", { key: "k", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", color: T.accent, lineHeight: 1 } }, editableText(k.k, [A.k, "kpis", n, "k"], X)),
          e("div", { key: "l", style: { marginTop: 7, fontSize: 13, lineHeight: 1.35, color: T.muted } }, editableText(k.l, [A.k, "kpis", n, "l"], X))
        ))
      )
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const competition: SlideFn = (T, C, i, X, A) => {
  const Co = sec(C, A.k, EMPTY_COMPETITION);
  const cols = Co.cols || [];
  const rows = Co.rows || [];
  const grid = `1.6fr repeat(${Math.max(cols.length, 1)},1fr)`;
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    h1(T, editableText(Co.headline, [A.k, "headline"], X), 44),
    e("div", { key: "tbl", style: { marginTop: 34, border: `1px solid ${border(T)}`, borderRadius: 16, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" } },
      e("div", { key: "hd", style: { display: "grid", gridTemplateColumns: grid, background: T.mode === "dark" ? mix(T.surface, 80, T.bg) : mix(T.accent, 5, "#fff"), borderBottom: `1px solid ${border(T)}` } },
        e("div", { key: "f", style: { padding: "16px 22px" } }),
        cols.map((c, k) => e("div", { key: k, style: { padding: "16px 10px", textAlign: "center", fontFamily: fD(T), fontWeight: k === 0 ? 700 : 600, fontSize: 14.5, color: k === 0 ? T.accent : T.text, background: k === 0 ? mix(T.accent, T.mode === "dark" ? 12 : 7, "transparent") : "transparent" } }, editableText(c, [A.k, "cols", k], X)))
      ),
      rows.map((r, k) => e("div", { key: k, style: { display: "grid", gridTemplateColumns: grid, borderBottom: k < rows.length - 1 ? `1px solid ${border(T)}` : "none", flex: 1, alignItems: "center" } },
        e("div", { key: "f", style: { padding: "0 22px", fontSize: 15, fontWeight: 500, color: T.text } }, editableText(r.f, [A.k, "rows", k, "f"], X)),
        (r.v || []).map((v, n) => e("div", { key: n, style: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", background: n === 0 ? mix(T.accent, T.mode === "dark" ? 12 : 7, "transparent") : "transparent" } }, check(T, v)))
      ))
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const roadmap: SlideFn = (T, C, i, X, A) => {
  const R = sec(C, A.k, EMPTY_ROADMAP);
  const items = R.items || [];
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 760 } }, h1(T, editableText(R.headline, [A.k, "headline"], X), 44),
      e("p", { key: "s", style: { margin: "16px 0 0", fontSize: 18, color: T.muted } }, editableText(R.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "tl", style: { display: "flex", gap: 20, marginTop: 34, flex: 1 } },
      items.map((it, k) => e("div", { key: k, style: { flex: 1, display: "flex", flexDirection: "column" } },
        e("div", { key: "hd", style: { display: "flex", alignItems: "center", marginBottom: 18 } },
          e("span", { key: "dot", style: { width: 16, height: 16, borderRadius: "50%", background: T.accent, flexShrink: 0, boxShadow: `0 0 0 4px ${mix(T.accent, 20, T.bg)}` } }),
          e("span", { key: "ln", style: { flex: 1, height: 2, marginLeft: 4, background: k < items.length - 1 ? mix(T.accent, 28) : "transparent" } })
        ),
        e("div", { key: "card", style: { ...cardStyle(T), borderRadius: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 24px" } },
          e("div", { key: "q", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 13, letterSpacing: ".06em", color: T.accent } }, editableText(it.q, [A.k, "items", k, "q"], X)),
          e("div", { key: "t", style: { marginTop: 12, fontFamily: fD(T), fontWeight: 600, fontSize: 21, color: T.text, letterSpacing: "-0.01em" } }, editableText(it.t, [A.k, "items", k, "t"], X)),
          e("div", { key: "d", style: { marginTop: 12, fontSize: 14.5, lineHeight: 1.55, color: T.muted } }, editableText(it.d, [A.k, "items", k, "d"], X, { multiline: true }))
        )
      ))
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const gallerySlide: SlideFn = (T, C, i, X, A) => {
  const G = sec(C, A.k, EMPTY_GALLERY);
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 840 } }, h1(T, editableText(G.headline, [A.k, "headline"], X), 44),
      e("p", { key: "s", style: { margin: "16px 0 0", fontSize: 18, color: T.muted } }, editableText(G.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "grid", style: { marginTop: 30, flex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gridTemplateRows: "1fr 1fr", gap: 16 } },
      (G.slots || []).map((s, k) => {
        // Match an uploaded image by slot id, else by position.
        const imgs = C._assets?.galleryImages || [];
        const found = imgs.find((g) => g.slot === s.id) || imgs[k];
        return e("div", { key: s.id || k, style: { gridColumn: s.span ? "span 2" : "span 1", position: "relative", borderRadius: 16, overflow: "hidden", background: T.mode === "dark" ? mix(T.surface, 72, T.bg) : mix(T.accent, 5, "#fff"), border: `1px solid ${border(T)}` } },
          found
            ? e("img", { key: "im", src: found.url, alt: s.ph, style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" } })
            : imgSlot(T, editableText(s.ph, [A.k, "slots", k, "ph"], X))
        );
      })
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const team: SlideFn = (T, C, i, X, A) => {
  const Tm = sec(C, A.k, EMPTY_TEAM);
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    h1(T, editableText(Tm.headline, [A.k, "headline"], X), 44),
    e("div", { key: "g", style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginTop: 30, flex: 1 } },
      (Tm.members || []).map((m, k) => e("div", { key: k, style: { ...cardStyle(T), display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "30px 26px" } },
        avatar(T, editableText(m.i, [A.k, "members", k, "i"], X)),
        e("div", { key: "tx" },
          e("div", { key: "n", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 19, color: T.text, letterSpacing: "-0.01em" } }, editableText(m.n, [A.k, "members", k, "n"], X)),
          e("div", { key: "r", style: { marginTop: 4, fontSize: 13.5, fontWeight: 600, color: T.accent } }, editableText(m.r, [A.k, "members", k, "r"], X)),
          e("div", { key: "b", style: { marginTop: 11, fontSize: 13.5, lineHeight: 1.5, color: T.muted } }, editableText(m.b, [A.k, "members", k, "b"], X, { multiline: true }))
        )
      ))
    ),
    Tm.advisors ? e("div", { key: "adv", style: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${border(T)}`, fontSize: 15, color: T.muted } }, editableText(Tm.advisors, [A.k, "advisors"], X, { multiline: true })) : null
  );
  return shell(T, C, i, inner, { total: A.total });
};

const ask: SlideFn = (T, C, i, X, A) => {
  const Ak = sec(C, A.k, EMPTY_ASK);
  const use = Ak.use || [];
  const colors = [T.accent, mix(T.accent, 72), mix(T.accent2, 80), mix(T.muted, 55)];
  const bar = e("div", { key: "bar", style: { display: "flex", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 26 } },
    use.map((u, k) => e("div", { key: k, style: { width: u.p + "%", background: colors[k % colors.length] } })));
  const legend = e("div", { key: "leg", style: { display: "flex", flexDirection: "column", gap: 16 } },
    use.map((u, k) => e("div", { key: k, style: { display: "flex", alignItems: "center", gap: 14 } },
      e("span", { key: "s", style: { width: 13, height: 13, borderRadius: 4, background: colors[k % colors.length] } }),
      e("span", { key: "l", style: { flex: 1, fontSize: 16, color: T.text, fontWeight: 500 } }, editableText(u.l, [A.k, "use", k, "l"], X)),
      e("span", { key: "p", style: { fontFamily: fD(T), fontWeight: 700, fontSize: 18, color: T.text } },
        editableText(String(u.p), [A.k, "use", k, "p"], X, { numeric: true }), "%")
    )));
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "g", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, marginTop: "auto", marginBottom: "auto", alignItems: "center" } },
      e("div", { key: "l" },
        e("h1", { key: "h", style: { margin: 0, fontFamily: fD(T), fontWeight: T.serif ? 600 : 700, fontSize: 54, lineHeight: 1.02, letterSpacing: "-0.03em", color: T.text } }, editableText(Ak.headline, [A.k, "headline"], X)),
        e("p", { key: "s", style: { margin: "22px 0 0", fontSize: 18.5, lineHeight: 1.5, color: T.muted, maxWidth: 420 } }, editableText(Ak.sub, [A.k, "sub"], X, { multiline: true }))
      ),
      e("div", { key: "r", style: { ...cardStyle(T), padding: "30px 32px" } },
        e("div", { key: "t", style: { fontSize: 13, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: T.muted, marginBottom: 18 } }, A.k === "ask" ? "Use of funds" : "Allocation"),
        bar, legend
      )
    )
  );
  return shell(T, C, i, inner, { total: A.total });
};

const closing: SlideFn = (T, C, i, X, A) => {
  const Cl = sec(C, A.k, EMPTY_CLOSING);
  const deco = tOrnament(T) !== "blobs" ? ornamentLayer(T) : e("div", { key: "dc", style: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" } },
    e("div", { key: 1, style: { position: "absolute", left: -140, bottom: -160, width: 420, height: 420, borderRadius: "50%", background: mix(T.accent, T.mode === "dark" ? 16 : 10, "transparent"), filter: "blur(8px)" } }),
    e("div", { key: 2, style: { position: "absolute", right: -100, top: -120, width: 320, height: 320, borderRadius: "50%", background: mix(T.accent2, T.mode === "dark" ? 18 : 12, "transparent"), filter: "blur(8px)" } })
  );;
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 820 } },
    eyebrow(T, A.eb),
    e("h1", { key: "h", style: { margin: 0, fontFamily: fD(T), fontWeight: T.serif ? 600 : 700, fontSize: 62, lineHeight: 1.02, letterSpacing: "-0.03em", color: T.text } }, editableText(Cl.headline, [A.k, "headline"], X)),
    e("p", { key: "s", style: { margin: "24px 0 36px", fontSize: 20, lineHeight: 1.5, color: T.muted, maxWidth: 560 } }, editableText(Cl.sub, [A.k, "sub"], X, { multiline: true })),
    e("div", { key: "c", style: { display: "flex", gap: 14, flexWrap: "wrap" } },
      X.editable
        ? e("span", { key: "m", style: { textDecoration: "none", fontFamily: fD(T), fontWeight: 600, fontSize: 16, color: T.mode === "dark" ? T.bg : "#fff", background: T.accent, padding: "13px 24px", borderRadius: 999, display: "inline-block" } }, editableText(Cl.contact, [A.k, "contact"], X))
        : e("a", { key: "m", href: "mailto:" + Cl.contact, style: { textDecoration: "none", fontFamily: fD(T), fontWeight: 600, fontSize: 16, color: T.mode === "dark" ? T.bg : "#fff", background: T.accent, padding: "13px 24px", borderRadius: 999 } }, Cl.contact),
      e("span", { key: "w", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 16, color: T.text, padding: "13px 24px", borderRadius: 999, border: `1px solid ${border(T, true)}` } }, editableText(Cl.site, [A.k, "site"], X))
    )
  );
  return shell(T, C, i, inner, { deco, total: A.total });
};

// ── Sales: customer proof ────────────────────────────────────────────────────

const proof: SlideFn = (T, C, i, X, A) => {
  const P = sec(C, A.k, EMPTY_PROOF);
  const cases = P.cases || [];
  const logos = P.logos || [];
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 840 } },
      h1(T, editableText(P.headline, [A.k, "headline"], X), 44),
      e("p", { key: "s", style: { margin: "16px 0 0", fontSize: 18, lineHeight: 1.5, color: T.muted } }, editableText(P.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "cs", style: { display: "flex", gap: 20, marginTop: 32, flex: 1 } },
      cases.map((c, k) => e("div", { key: k, style: { ...cardStyle(T, k === 0), flex: 1, display: "flex", flexDirection: "column", padding: "28px 28px 24px" } },
        e("div", { key: "cust", style: { fontSize: 12, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: k === 0 ? T.accent : T.muted } }, editableText(c.c, [A.k, "cases", k, "c"], X)),
        e("div", { key: "m", style: { marginTop: 18, fontFamily: fD(T), fontWeight: 700, fontSize: 46, letterSpacing: "-0.03em", lineHeight: 1, color: T.accent } }, editableText(c.m, [A.k, "cases", k, "m"], X)),
        e("div", { key: "ml", style: { marginTop: 8, fontSize: 14, lineHeight: 1.4, color: T.muted } }, editableText(c.ml, [A.k, "cases", k, "ml"], X)),
        e("div", { key: "d", style: { marginTop: 18, fontSize: 14.5, lineHeight: 1.55, color: T.muted } }, editableText(c.d, [A.k, "cases", k, "d"], X, { multiline: true })),
        c.q
          ? e("div", { key: "q", style: { marginTop: "auto", paddingTop: 18, borderTop: `1px solid ${border(T)}`, fontSize: 14, lineHeight: 1.5, fontStyle: "italic", color: T.text } },
              "“", editableText(c.q, [A.k, "cases", k, "q"], X, { multiline: true }), "”")
          : null
      ))
    ),
    logos.length
      ? e("div", { key: "lg", style: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${border(T)}`, display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" } },
          logos.map((l, k) => e("span", { key: k, style: { fontFamily: fD(T), fontWeight: 600, fontSize: 15, letterSpacing: ".02em", color: T.muted } }, editableText(l, [A.k, "logos", k], X))))
      : null
  );
  return shell(T, C, i, inner, { total: A.total });
};

// ── Product: who it's for ────────────────────────────────────────────────────

const persona: SlideFn = (T, C, i, X, A) => {
  const P = sec(C, A.k, EMPTY_PERSONA);
  const list = (title: string, items: { k: string; t: string }[], field: string, accent: boolean): N =>
    e("div", { style: { ...cardStyle(T, accent), flex: 1, display: "flex", flexDirection: "column", padding: "26px 28px" } },
      e("div", { key: "lab", style: { fontSize: 12, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: accent ? T.accent : T.muted } }, title),
      e("div", { key: "it", style: { marginTop: 20, display: "flex", flexDirection: "column", gap: 16 } },
        (items || []).map((it, k) => e("div", { key: k, style: { display: "flex", gap: 12, alignItems: "flex-start" } },
          e("span", { key: "d", style: { width: 8, height: 8, borderRadius: "50%", marginTop: 8, flexShrink: 0, background: accent ? T.accent : mix(T.muted, 70) } }),
          e("div", { key: "t", style: { fontSize: 15, lineHeight: 1.5, color: T.muted } },
            e("span", { key: "k", style: { fontWeight: 700, color: T.text } }, editableText(it.k, [A.k, field, k, "k"], X)),
            " — ",
            editableText(it.t, [A.k, field, k, "t"], X, { multiline: true }))
        ))
      )
    );
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column" } },
    eyebrow(T, A.eb),
    e("div", { key: "hd", style: { maxWidth: 880 } },
      h1(T, editableText(P.headline, [A.k, "headline"], X), 44),
      e("p", { key: "s", style: { margin: "14px 0 0", fontSize: 18, lineHeight: 1.5, color: T.muted } }, editableText(P.sub, [A.k, "sub"], X, { multiline: true }))),
    e("div", { key: "who", style: { marginTop: 22, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" } },
      e("span", { key: "w", style: { fontFamily: fD(T), fontWeight: 600, fontSize: 17, color: T.text, padding: "11px 18px", borderRadius: 999, background: mix(T.accent, T.mode === "dark" ? 18 : 12, T.mode === "dark" ? "transparent" : "#fff"), border: `1px solid ${mix(T.accent, 34)}` } }, editableText(P.who, [A.k, "who"], X, { multiline: true })),
      e("span", { key: "c", style: { fontSize: 15, lineHeight: 1.5, color: T.muted, paddingTop: 12 } }, editableText(P.context, [A.k, "context"], X, { multiline: true }))
    ),
    e("div", { key: "cols", style: { display: "flex", gap: 20, marginTop: 24, flex: 1 } },
      list("Jobs to be done", P.jobs, "jobs", true),
      list("Today's friction", P.pains, "pains", false)
    ),
    P.quote
      ? e("div", { key: "q", style: { marginTop: 20, fontSize: 16, lineHeight: 1.5, fontStyle: "italic", color: T.text } },
          "“", editableText(P.quote, [A.k, "quote"], X, { multiline: true }), "”")
      : null
  );
  return shell(T, C, i, inner, { total: A.total });
};

// ── Vision: one idea, stated plainly ─────────────────────────────────────────

const vision: SlideFn = (T, C, i, X, A) => {
  const V = sec(C, A.k, EMPTY_VISION);
  const deco = tOrnament(T) !== "blobs" ? ornamentLayer(T) : e("div", { key: "dc", style: { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" } },
    e("div", { key: 1, style: { position: "absolute", right: -180, top: -140, width: 520, height: 520, borderRadius: "50%", background: mix(T.accent, T.mode === "dark" ? 15 : 9, "transparent"), filter: "blur(12px)" } }),
    e("div", { key: 2, style: { position: "absolute", left: -120, bottom: -180, width: 400, height: 400, borderRadius: "50%", background: mix(T.accent2, T.mode === "dark" ? 14 : 9, "transparent"), filter: "blur(10px)" } })
  );;
  const inner = e("div", { key: "in", style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 940 } },
    eyebrow(T, A.eb),
    V.horizon
      ? e("div", { key: "hz", style: { marginBottom: 18 } },
          e("span", { style: { fontFamily: fD(T), fontWeight: 600, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: T.text, padding: "8px 16px", borderRadius: 999, border: `1px solid ${mix(T.accent, 40)}`, background: mix(T.accent, T.mode === "dark" ? 14 : 9, T.mode === "dark" ? "transparent" : "#fff") } }, editableText(V.horizon, [A.k, "horizon"], X)))
      : null,
    e("h1", { key: "h", style: { margin: 0, fontFamily: fD(T), fontWeight: T.serif ? 600 : 700, fontSize: 58, lineHeight: 1.08, letterSpacing: "-0.03em", color: T.text, textWrap: "balance" } as React.CSSProperties }, editableText(V.headline, [A.k, "headline"], X, { multiline: true })),
    V.statement
      ? e("p", { key: "st", style: { margin: "26px 0 0", fontSize: 21, lineHeight: 1.5, color: T.accent, fontWeight: 500, maxWidth: 720 } }, editableText(V.statement, [A.k, "statement"], X, { multiline: true }))
      : null,
    e("p", { key: "sb", style: { margin: "18px 0 0", fontSize: 17, lineHeight: 1.55, color: T.muted, maxWidth: 660 } }, editableText(V.sub, [A.k, "sub"], X, { multiline: true })),
    (V.proofPoints || []).length
      ? e("div", { key: "pp", style: { marginTop: 40 } }, kpiTiles(T, V.proofPoints, [A.k, "proofPoints"], X, Math.min((V.proofPoints || []).length, 3)))
      : null
  );
  return shell(T, C, i, inner, { deco, total: A.total });
};

// ── Renderer table ───────────────────────────────────────────────────────────

/**
 * Renderer id → slide function. The id comes from the deck-type registry, and
 * `backend/test_deck_registry.py::test_spec_is_complete` fails if the backend
 * ever names one that is missing here.
 */
const RENDERERS: Record<RendererId, SlideFn> = {
  cover, summary, probsol, product, market, model, traction, competition,
  roadmap, gallery: gallerySlide, team, ask, closing, proof, persona, vision,
};

const DEFAULT_ORDER = slideOrder(DEFAULT_DECK_TYPE);

/** Render a single 1280×720 slide (used by the deck view and thumbnails). */
export function renderSlide(
  theme: Theme,
  data: TemplateDeckData,
  index: number,
  editCtx: EditCtx = VIEW_CTX,
  order: SlideSlot[] = DEFAULT_ORDER
): N {
  const slot = order[index] ?? order[0] ?? DEFAULT_ORDER[0];
  const fn = RENDERERS[slot.renderer] ?? cover;
  return fn(theme, data, index, editCtx, { k: slot.key, eb: slot.eyebrow, total: order.length });
}

// ── Interactive deck component ───────────────────────────────────────────────

interface TemplatedDeckProps {
  data: TemplateDeckData;
  theme: Theme;
  /** The deck's slide sequence. Defaults to the investor order, which is what
   * every project generated before multi-deck support is. */
  order?: SlideSlot[];
  /** Enables click-to-edit on the deck's text/numbers. Fullscreen present mode
   * always stays view-only regardless of this flag — presenting should never
   * be interactive. */
  editable?: boolean;
  onEdit?: (path: EditPath, value: string | number) => void;
}

export function TemplatedDeck({ data, theme, order = DEFAULT_ORDER, editable = false, onEdit }: TemplatedDeckProps): JSX.Element {
  const [si, setSi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fsRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [fs, setFs] = useState(false);
  const [vp, setVp] = useState({ w: 1280, h: 720 });
  const [active, setActive] = useState<ActiveEdit | null>(null);

  const LAST = Math.max(0, order.length - 1);

  const editCtx: EditCtx = React.useMemo(
    () => ({
      editable,
      active,
      onActivate: (path, value, opts) => setActive({ key: path.join("."), path, value: String(value), ...opts }),
    }),
    [editable, active]
  );

  const commitEdit = (path: EditPath, value: string | number) => {
    onEdit?.(path, value);
    setActive(null);
  };
  const cancelEdit = () => setActive(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.1, el.clientWidth / 1280));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A shorter deck (or a switch between deck types) can leave the cursor past
  // the end — clamp rather than rendering a blank slide.
  useEffect(() => {
    setSi((s) => Math.min(s, LAST));
  }, [LAST]);

  const next = () => setSi((s) => Math.min(s + 1, LAST));
  const prev = () => setSi((s) => Math.max(s - 1, 0));

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (active) return; // an edit input is open — let its own keydown handler own the keyboard
      if (ev.key === "ArrowRight") next();
      else if (ev.key === "ArrowLeft") prev();
      else if (ev.key === "Escape" && fs) setFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fs, active, LAST]);

  // Fullscreen: track viewport, lock page scroll, try native fullscreen.
  useEffect(() => {
    if (!fs) return;
    const measure = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fsRef.current?.requestFullscreen?.().catch(() => {});
    const onFsChange = () => { if (!document.fullscreenElement) setFs(false); };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("resize", measure);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [fs]);

  const fsScale = Math.max(0.1, Math.min((vp.w - 48) / 1280, (vp.h - 110) / 720));

  const dots = (
    <div className="flex items-center gap-1.5">
      {order.map((s, k) => (
        <button key={s.key} onClick={() => setSi(k)} title={s.eyebrow || s.key}
          style={{ width: k === si ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: k === si ? theme.accent : "rgba(120,120,140,.35)", transition: "all .18s ease" }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Slide stage */}
      <div ref={wrapRef} style={{ width: "100%", position: "relative" }}>
        <button
          onClick={() => setFs(true)}
          title="Fullscreen (present)"
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
        >
          <Maximize2 size={14} /> Fullscreen
        </button>
        <div style={{ width: "100%", height: 720 * scale, overflow: "hidden", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {renderSlide(theme, data, si, editCtx, order)}
          </div>
        </div>
        {editable && (
          <FloatingTextEditor active={active} containerRef={wrapRef} scale={scale} onCommit={commitEdit} onCancel={cancelEdit} />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={si === 0}
          className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-sm disabled:opacity-40 hover:bg-surface transition-colors">
          ← Prev
        </button>
        {dots}
        <button onClick={next} disabled={si === LAST}
          className="px-3 py-1.5 rounded-lg border border-border text-text-secondary text-sm disabled:opacity-40 hover:bg-surface transition-colors">
          Next →
        </button>
      </div>

      {/* Fullscreen presentation overlay */}
      {fs && (
        <div ref={fsRef} style={{ position: "fixed", inset: 0, zIndex: 1000, background: theme.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <button onClick={() => setFs(false)} title="Exit (Esc)"
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ color: theme.text, background: mix(theme.accent, theme.mode === "dark" ? 18 : 12, theme.mode === "dark" ? "transparent" : "#fff"), border: `1px solid ${mix(theme.accent, 34)}` }}>
            <XIcon size={16} /> Exit
          </button>

          <div style={{ width: 1280, height: 720, transform: `scale(${fsScale})`, transformOrigin: "center center", borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,.5)" }}>
            {renderSlide(theme, data, si, VIEW_CTX, order)}
          </div>

          {/* Edge nav zones */}
          <button onClick={prev} disabled={si === 0} aria-label="Previous"
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "12%", border: "none", background: "transparent", cursor: si === 0 ? "default" : "pointer" }} />
          <button onClick={next} disabled={si === LAST} aria-label="Next"
            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "12%", border: "none", background: "transparent", cursor: si === LAST ? "default" : "pointer" }} />

          <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {dots}
            <span style={{ font: "400 12px var(--font-body)", color: theme.muted }}>
              {si + 1} / {order.length} · ← → to navigate · Esc to exit
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
