/**
 * The deck templates — 20 of them, in two families.
 *
 * FAMILY 1 (keys meridian…slate) are the original ten. They are ten *recolours*
 * of one composition: the same 1280×720 frame, the same padding, the same cover
 * blobs, the same grids. Only colour and typeface ever differed.
 *
 * FAMILY 2 (keys broadsheet…circuit) differ in COMPOSITION. That is what the
 * layout tokens below exist for — `cover` picks a different cover entirely,
 * `cards: "none"` removes the container language, `figure` redraws TAM/SAM/SOM.
 *
 * Every layout token is OPTIONAL and every accessor falls back to the original
 * literal, so family 1 renders byte-identically to before these fields existed.
 * That is the contract: adding a token must never move an existing deck.
 */

/** Cover compositions. `centered` is the original. */
export type CoverVariant =
  | "centered" | "masthead" | "slab" | "grid" | "scrim"
  | "document" | "minimal" | "bands" | "poster" | "plate" | "terminal"
  | "panel" | "bento" | "statement"
  | "radial" | "gradient" | "donut" | "heatmap";

/** Container language for the repeated card. `filled` is the original. */
export type CardVariant = "filled" | "outline" | "none";

/** Slide chrome — the footer/page-number treatment. `footer` is the original. */
export type ChromeVariant = "footer" | "rule" | "corner" | "dot" | "none";

/** Background ornament on the cover/closing/vision slides.
 *  `blobs` is the original pair of blurred accent circles. */
export type OrnamentVariant = "blobs" | "rule" | "grid" | "none";

/** How TAM/SAM/SOM is drawn. `rings` is the original nested circles. */
export type FigureVariant = "rings" | "rows" | "bars" | "blocks" | "table";

export interface DeckTemplate {
  key: string;
  name: string;
  mood: string;
  mode: "dark" | "light";
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  fontD: string; // display font
  fontB: string; // body font
  upper: boolean; // uppercase eyebrows
  serif: boolean;

  // ── Layout tokens (family 2). Absent ⇒ the original composition. ──────────
  mono?: boolean;            // display face is monospaced
  radius?: number;           // card corner radius (original: 18)
  cards?: CardVariant;
  cover?: CoverVariant;
  chrome?: ChromeVariant;
  figure?: FigureVariant;
  ornament?: OrnamentVariant;
  density?: "airy" | "normal" | "tight";
  /** Headline size overrides, in px on the 1280×720 canvas. */
  h1?: number;               // section headlines (original: per-slide 42–50)
  coverSize?: number;        // company name on the cover (original: 96)
}

/** Back-compat alias — the renderer and its callers still say `Theme`. */
export type Theme = DeckTemplate;

// ── Family 1 · the original ten recolours ────────────────────────────────────

export const CLASSIC_THEMES: DeckTemplate[] = [
  { key: "meridian", name: "Meridian Navy", mood: "Classic VC", mode: "dark", bg: "#0A1838", surface: "#102350", text: "#EAF0FF", muted: "#9DB0D6", accent: "#5B8DEF", accent2: "#62D6C4", fontD: "Space Grotesk", fontB: "Inter", upper: true, serif: false },
  { key: "onyx", name: "Onyx Coral", mood: "Minimalist", mode: "dark", bg: "#141519", surface: "#1E2027", text: "#F5F5F6", muted: "#A1A3AD", accent: "#FF6B53", accent2: "#FFC178", fontD: "Archivo", fontB: "Inter", upper: true, serif: false },
  { key: "abyss", name: "Abyss Teal", mood: "Deep tech", mode: "dark", bg: "#04212A", surface: "#0A3340", text: "#E6F6F4", muted: "#8DB8B6", accent: "#27D2C1", accent2: "#56B8FF", fontD: "Sora", fontB: "IBM Plex Sans", upper: false, serif: false },
  { key: "nocturne", name: "Nocturne Violet", mood: "Modern SaaS", mode: "dark", bg: "#130D2C", surface: "#1F1745", text: "#F1ECFF", muted: "#A99FCB", accent: "#9A7BFF", accent2: "#FF8FCB", fontD: "Outfit", fontB: "Inter", upper: false, serif: false },
  { key: "forest", name: "Forest Lime", mood: "Growth", mode: "dark", bg: "#0B1D15", surface: "#112C20", text: "#E9F3EC", muted: "#92B5A1", accent: "#3FBF7A", accent2: "#C4E25F", fontD: "Manrope", fontB: "Manrope", upper: false, serif: false },
  { key: "verdant", name: "Verdant", mood: "Fintech light", mode: "light", bg: "#F5F8F4", surface: "#FFFFFF", text: "#152319", muted: "#566359", accent: "#1F8A5B", accent2: "#5FA63C", fontD: "Plus Jakarta Sans", fontB: "Inter", upper: false, serif: false },
  { key: "indigo", name: "Indigo SaaS", mood: "Modern SaaS", mode: "light", bg: "#F4F4FB", surface: "#FFFFFF", text: "#15152E", muted: "#5C5C78", accent: "#4F46E5", accent2: "#0EA5B7", fontD: "DM Sans", fontB: "DM Sans", upper: false, serif: false },
  { key: "editorial", name: "Editorial Mono", mood: "Premium serif", mode: "light", bg: "#FAFAF7", surface: "#FFFFFF", text: "#121211", muted: "#6B6B63", accent: "#16150F", accent2: "#C2410C", fontD: "Newsreader", fontB: "Inter", upper: false, serif: true },
  { key: "terra", name: "Terracotta", mood: "Warm earth", mode: "light", bg: "#FBF4EC", surface: "#FFFFFF", text: "#2A1D14", muted: "#7C6A5B", accent: "#C2683D", accent2: "#7C8B4F", fontD: "Bricolage Grotesque", fontB: "Inter", upper: false, serif: false },
  { key: "slate", name: "Slate Amber", mood: "Corporate", mode: "light", bg: "#F3F6F8", surface: "#FFFFFF", text: "#162033", muted: "#586677", accent: "#E08A0B", accent2: "#2563EB", fontD: "Schibsted Grotesk", fontB: "Inter", upper: true, serif: false },
];

// ── Family 2 · ten new compositions ──────────────────────────────────────────

export const STUDIO_THEMES: DeckTemplate[] = [
  {
    key: "broadsheet", name: "Broadsheet", mood: "Editorial", mode: "light",
    bg: "#F7F5F0", surface: "#F7F5F0", text: "#14130F", muted: "#6F6A5E",
    accent: "#8C2F13", accent2: "#2E4A3C",
    fontD: "Newsreader", fontB: "Instrument Sans", upper: true, serif: true,
    radius: 0, cards: "none", cover: "masthead", chrome: "rule", figure: "rows", ornament: "rule",
    density: "airy", h1: 46, coverSize: 118,
  },
  {
    key: "monolith", name: "Monolith", mood: "Brutalist", mode: "dark",
    bg: "#111111", surface: "#1C1C1C", text: "#F2F2F0", muted: "#8E8E8A",
    accent: "#E8FF3A", accent2: "#FF4D1F",
    fontD: "Archivo", fontB: "Archivo", upper: true, serif: false,
    radius: 0, cards: "filled", cover: "slab", chrome: "none", figure: "blocks", ornament: "none",
    density: "tight", coverSize: 176, h1: 50,
  },
  {
    key: "blueprint", name: "Blueprint", mood: "Technical", mode: "dark",
    bg: "#0E1A24", surface: "#132430", text: "#DCEAF2", muted: "#6E8C9E",
    accent: "#4FC3F7", accent2: "#B8E986",
    fontD: "Azeret Mono", fontB: "Instrument Sans", upper: true, serif: false,
    mono: true, radius: 2, cards: "outline", cover: "grid", chrome: "corner",
    figure: "bars", ornament: "grid", density: "normal", h1: 40, coverSize: 86,
  },
  {
    key: "aperture", name: "Aperture", mood: "Photographic", mode: "dark",
    bg: "#0A0A0C", surface: "#16161A", text: "#FFFFFF", muted: "#9A9AA2",
    accent: "#E5B769", accent2: "#7FB3C8",
    fontD: "Jost", fontB: "Jost", upper: true, serif: false,
    radius: 0, cards: "none", cover: "scrim", chrome: "none", figure: "rows", ornament: "blobs",
    density: "airy", h1: 44, coverSize: 104,
  },
  {
    key: "ledger", name: "Ledger", mood: "Financial report", mode: "light",
    bg: "#FFFFFF", surface: "#F6F7F8", text: "#10161C", muted: "#5C6670",
    accent: "#12604A", accent2: "#9A3412",
    fontD: "Libre Franklin", fontB: "Libre Franklin", upper: true, serif: false,
    radius: 2, cards: "outline", cover: "document", chrome: "rule", figure: "table", ornament: "none",
    density: "tight", h1: 38, coverSize: 82,
  },
  {
    key: "atrium", name: "Atrium", mood: "Minimal", mode: "light",
    bg: "#FCFCFC", surface: "#FCFCFC", text: "#1A1A1A", muted: "#959595",
    accent: "#1A1A1A", accent2: "#B0B0B0",
    fontD: "Jost", fontB: "Jost", upper: false, serif: false,
    radius: 0, cards: "none", cover: "minimal", chrome: "dot", figure: "rows", ornament: "none",
    density: "airy", h1: 40, coverSize: 64,
  },
  {
    key: "strata", name: "Strata", mood: "Banded", mode: "light",
    bg: "#F4F6F8", surface: "#FFFFFF", text: "#131A24", muted: "#5E6B7A",
    accent: "#1D4ED8", accent2: "#0F766E",
    fontD: "Schibsted Grotesk", fontB: "Schibsted Grotesk", upper: true, serif: false,
    radius: 0, cards: "filled", cover: "bands", chrome: "rule", figure: "bars", ornament: "none",
    density: "normal", h1: 44, coverSize: 96,
  },
  {
    key: "kiosk", name: "Kiosk", mood: "Poster", mode: "light",
    bg: "#FFF8E7", surface: "#FFFFFF", text: "#16130C", muted: "#6B6353",
    accent: "#E0245E", accent2: "#1B8AE0",
    fontD: "Bricolage Grotesque", fontB: "Instrument Sans", upper: false, serif: false,
    radius: 14, cards: "filled", cover: "poster", chrome: "dot", figure: "blocks", ornament: "blobs",
    density: "normal", h1: 48, coverSize: 120,
  },
  {
    key: "vellum", name: "Vellum", mood: "Warm premium", mode: "light",
    bg: "#EFE9DF", surface: "#F7F3EC", text: "#231C14", muted: "#7A6E5F",
    accent: "#7A4419", accent2: "#3E5540",
    fontD: "Fraunces", fontB: "Instrument Sans", upper: false, serif: true,
    radius: 3, cards: "outline", cover: "plate", chrome: "rule", figure: "rows", ornament: "rule",
    density: "airy", h1: 44, coverSize: 90,
  },
  {
    key: "circuit", name: "Circuit", mood: "Deep tech", mode: "dark",
    bg: "#07090D", surface: "#0E1219", text: "#E6EDF5", muted: "#6B7688",
    accent: "#00E5A0", accent2: "#7C6BFF",
    fontD: "Sora", fontB: "Sora", upper: true, serif: false,
    radius: 4, cards: "outline", cover: "terminal", chrome: "corner", figure: "bars", ornament: "grid",
    density: "normal", h1: 42, coverSize: 102,
  },
];


// ── Family 3 · Volume 2, design language extracted from the pack ─────────────
//
// Palettes, typefaces and compositional intent are lifted from
// `pitch-deck-designs.zip`. The pack's own HTML is NOT used: it is 140 static
// comps sized for its sample copy (537 hardcoded widths, 85 `white-space:nowrap`,
// overflow handling in 3 files), and its bento cover already clips its own
// sample company name. Rendering these as tokens through the flex-based engine
// means real, variable, AI-written content cannot clip.

export const VOLUME2_THEMES: DeckTemplate[] = [
  {
    key: "swiss", name: "Swiss Grid", mood: "International style", mode: "light",
    bg: "#F1EFEA", surface: "#FFFFFF", text: "#141414", muted: "#5E5B55",
    accent: "#C4331F", accent2: "#141414",
    fontD: "Work Sans", fontB: "Work Sans", upper: true, serif: false,
    radius: 0, cards: "none", cover: "panel", chrome: "rule", figure: "rows",
    ornament: "rule", density: "airy", h1: 46, coverSize: 116,
  },
  {
    key: "gazette", name: "Gazette", mood: "Magazine serif", mode: "dark",
    bg: "#1D2A23", surface: "#24332B", text: "#F3ECDF", muted: "#B9B3A3",
    accent: "#E8B23A", accent2: "#8C2F2A",
    fontD: "Fraunces", fontB: "Work Sans", upper: false, serif: true,
    radius: 0, cards: "none", cover: "statement", chrome: "rule", figure: "rows",
    ornament: "rule", density: "airy", h1: 46, coverSize: 82,
  },
  {
    key: "billboard", name: "Billboard", mood: "Condensed poster", mode: "light",
    bg: "#F4F1E8", surface: "#FFFFFF", text: "#1B1B1F", muted: "#57544C",
    accent: "#F2C230", accent2: "#1B1B1F",
    fontD: "Oswald", fontB: "Work Sans", upper: true, serif: false,
    radius: 0, cards: "filled", cover: "slab", chrome: "none", figure: "blocks",
    ornament: "none", density: "tight", h1: 52, coverSize: 200,
  },
  {
    key: "bento", name: "Bento", mood: "Pastel tiles", mode: "light",
    bg: "#F4F2F8", surface: "#FFFFFF", text: "#1C1830", muted: "#4E4865",
    accent: "#5B47B8", accent2: "#3FA796",
    fontD: "Syne", fontB: "Work Sans", upper: true, serif: false,
    radius: 22, cards: "filled", cover: "bento", chrome: "dot", figure: "blocks",
    ornament: "none", density: "normal", h1: 44, coverSize: 78,
  },
  {
    key: "boardroom", name: "Boardroom", mood: "Consulting", mode: "light",
    bg: "#FBFBF9", surface: "#F2F5F7", text: "#0F2A4A", muted: "#56606C",
    accent: "#1F6F80", accent2: "#0F2A4A",
    fontD: "Fraunces", fontB: "Work Sans", upper: true, serif: true,
    radius: 2, cards: "outline", cover: "document", chrome: "rule", figure: "table",
    ornament: "none", density: "tight", h1: 38, coverSize: 78,
  },
  {
    key: "console", name: "Console", mood: "Developer tool", mode: "dark",
    bg: "#0D1117", surface: "#161B22", text: "#E6EDF3", muted: "#8B949E",
    accent: "#3DDC97", accent2: "#58A6FF",
    fontD: "Azeret Mono", fontB: "Work Sans", upper: true, serif: false,
    mono: true, radius: 6, cards: "outline", cover: "terminal", chrome: "corner",
    figure: "table", ornament: "none", density: "normal", h1: 38, coverSize: 84,
  },
  {
    key: "aurora", name: "Aurora", mood: "Soft gradient", mode: "light",
    bg: "linear-gradient(135deg, #FCE9DA 0%, #EFE4FA 55%, #DCEEF8 100%)",
    surface: "rgba(255,255,255,.72)", text: "#231F3A", muted: "#554F6B",
    accent: "#B42A60", accent2: "#5B47B8",
    fontD: "Work Sans", fontB: "Work Sans", upper: true, serif: false,
    radius: 26, cards: "filled", cover: "minimal", chrome: "dot", figure: "bars",
    ornament: "none", density: "airy", h1: 44, coverSize: 86,
  },
  {
    key: "drafting", name: "Drafting", mood: "Technical sheet", mode: "dark",
    bg: "#163A6B", surface: "#1C4680", text: "#EAF2FB", muted: "#A9C2E0",
    accent: "#FFD166", accent2: "#7FD1E8",
    fontD: "Oswald", fontB: "Work Sans", upper: true, serif: false,
    radius: 0, cards: "outline", cover: "grid", chrome: "corner", figure: "table",
    ornament: "grid", density: "normal", h1: 44, coverSize: 104,
  },
  {
    key: "noir", name: "Noir Luxe", mood: "Black and gold", mode: "dark",
    bg: "#131313", surface: "#1C1C1C", text: "#F2EDE3", muted: "#A39E93",
    accent: "#C9A45C", accent2: "#F2EDE3",
    fontD: "Fraunces", fontB: "Work Sans", upper: true, serif: true,
    radius: 0, cards: "none", cover: "plate", chrome: "rule", figure: "rows",
    ornament: "rule", density: "airy", h1: 44, coverSize: 84,
  },
  {
    key: "panelled", name: "Split Panel", mood: "Panelled", mode: "light",
    bg: "#F6EFE6", surface: "#FFFFFF", text: "#12343B", muted: "#56676A",
    accent: "#B8431F", accent2: "#12343B",
    fontD: "Work Sans", fontB: "Work Sans", upper: true, serif: false,
    radius: 0, cards: "filled", cover: "panel", chrome: "rule", figure: "bars",
    ornament: "none", density: "normal", h1: 44, coverSize: 92,
  },
];

// ── Family 4 · Infographic themes (Volume 3) ────────────────────────────────
//
// These four themes use the new `radial` and `gradient` cover variants which
// render data-driven infographic elements (progress rings, wave curves, KPI
// cards). They are explicitly designed to look great for EVERY deck type —
// not just investor decks — because both covers read from `summary.highlights`
// and the universal eyebrow/round/year fields rather than investor-specific
// fields like `ask`.

export const INFOGRAPHIC_THEMES: DeckTemplate[] = [
  // ── Dark infographic covers ──────────────────────────────────────────────
  {
    // Radial progress rings + floating KPI glass cards · neon cyan on deep navy
    key: "pulse", name: "Data Pulse", mood: "Dashboard dark", mode: "dark",
    bg: "#050E1C", surface: "#0A1628", text: "#E8F4FF", muted: "#6B8BAF",
    accent: "#00D4FF", accent2: "#0087FF",
    fontD: "Sora", fontB: "Inter", upper: true, serif: false,
    cover: "radial", chrome: "corner", cards: "outline", figure: "bars",
    ornament: "none", radius: 8, density: "normal", h1: 46, coverSize: 88,
  },
  {
    // Fluid bezier waves + frosted pill badges · purple→pink on deep violet
    key: "flux", name: "Gradient Flow", mood: "Fluid dark", mode: "dark",
    bg: "#130823", surface: "#1E1035", text: "#F0EAFF", muted: "#9080BA",
    accent: "#A855F7", accent2: "#EC4899",
    fontD: "Outfit", fontB: "Inter", upper: false, serif: false,
    cover: "gradient", chrome: "dot", cards: "filled", figure: "blocks",
    ornament: "none", radius: 20, density: "airy", h1: 44, coverSize: 82,
  },
  {
    // Bold cobalt solid + electric yellow dots · strong corporate energy
    key: "cobalt", name: "Cobalt", mood: "Bold corporate", mode: "dark",
    bg: "#0D2166", surface: "#152B85", text: "#FFFFFF", muted: "#9FB4FF",
    accent: "#FBBF24", accent2: "#60A5FA",
    fontD: "Archivo", fontB: "Inter", upper: true, serif: false,
    cover: "donut", chrome: "corner", cards: "filled", figure: "blocks",
    ornament: "none", radius: 0, density: "tight", h1: 50, coverSize: 160,
  },
  {
    // Charcoal dark + bold amber accent stripe · news editorial energy
    key: "amber", name: "Amber Alert", mood: "Bold editorial", mode: "dark",
    bg: "#141414", surface: "#1E1E1E", text: "#F5F5F5", muted: "#9A9A9A",
    accent: "#F59E0B", accent2: "#EF4444",
    fontD: "Schibsted Grotesk", fontB: "Work Sans", upper: true, serif: false,
    cover: "terminal", chrome: "rule", cards: "filled", figure: "bars",
    ornament: "none", radius: 4, density: "tight", h1: 48, coverSize: 96,
  },
  {
    // Pure black + world heatmap network telemetry · global tech / hardware / cyber
    key: "chrome", name: "Midnight Chrome", mood: "Metallic dark", mode: "dark",
    bg: "#080808", surface: "#141414", text: "#F2F2F2", muted: "#8A8A8A",
    accent: "#00E5FF", accent2: "#3B82F6",
    fontD: "Jost", fontB: "Instrument Sans", upper: true, serif: false,
    cover: "heatmap", chrome: "corner", cards: "outline", figure: "table",
    ornament: "grid", radius: 2, density: "airy", h1: 44, coverSize: 100,
  },
  // ── Light infographic covers ─────────────────────────────────────────────
  {
    // Donut Stats on light blue · data-forward analytics feel
    key: "atlas", name: "Market Atlas", mood: "Data light", mode: "light",
    bg: "#F6FAFE", surface: "#FFFFFF", text: "#0E2040", muted: "#5070A0",
    accent: "#1D6FEB", accent2: "#0DC9B1",
    fontD: "DM Sans", fontB: "DM Sans", upper: false, serif: false,
    cover: "donut", chrome: "rule", cards: "filled", figure: "rings",
    ornament: "none", radius: 14, density: "normal", h1: 44, coverSize: 82,
  },
  {
    // Gradient waves on near-white · creative agency / DTC
    key: "prism", name: "Prismatic", mood: "Creative light", mode: "light",
    bg: "#FDFCFF", surface: "#FFFFFF", text: "#1A1530", muted: "#6B6585",
    accent: "#7C3AED", accent2: "#F59E0B",
    fontD: "Syne", fontB: "Work Sans", upper: true, serif: false,
    cover: "gradient", chrome: "dot", cards: "filled", figure: "blocks",
    ornament: "none", radius: 16, density: "airy", h1: 44, coverSize: 86,
  },
  {
    // Muted sage green + cream · health / sustainability / nature
    key: "sage", name: "Sage", mood: "Natural organic", mode: "light",
    bg: "#EDF4EC", surface: "#FFFFFF", text: "#1A2E1C", muted: "#5E7860",
    accent: "#3B7D3F", accent2: "#8DAE5A",
    fontD: "Plus Jakarta Sans", fontB: "Inter", upper: false, serif: false,
    cover: "donut", chrome: "rule", cards: "filled", figure: "rows",
    ornament: "none", radius: 12, density: "airy", h1: 42, coverSize: 80,
  },
  {
    // Deep crimson + gold serif · law / finance / luxury
    key: "crimson", name: "Crimson", mood: "Luxury premium", mode: "light",
    bg: "#FBF6F6", surface: "#FFFFFF", text: "#2A0A0A", muted: "#7A4040",
    accent: "#8B0000", accent2: "#C9A45C",
    fontD: "Newsreader", fontB: "Instrument Sans", upper: false, serif: true,
    cover: "plate", chrome: "rule", cards: "outline", figure: "rows",
    ornament: "rule", radius: 0, density: "airy", h1: 44, coverSize: 86,
  },
  {
    // Near-white + rose gold arcs · luxury DTC / fashion / consumer
    key: "rosegold", name: "Rose Gold", mood: "Premium feminine", mode: "light",
    bg: "#FFF5F5", surface: "#FFFFFF", text: "#2A1A1A", muted: "#9A6060",
    accent: "#C9847A", accent2: "#D4A5A0",
    fontD: "Fraunces", fontB: "Instrument Sans", upper: false, serif: true,
    cover: "poster", chrome: "dot", cards: "none", figure: "rows",
    ornament: "blobs", radius: 22, density: "airy", h1: 42, coverSize: 82,
  },
];

export const THEMES: DeckTemplate[] = [...CLASSIC_THEMES, ...STUDIO_THEMES, ...VOLUME2_THEMES, ...INFOGRAPHIC_THEMES];

export const DEFAULT_THEME_KEY = "meridian";

export function getTheme(key?: string | null): DeckTemplate {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}

// ── Layout-token accessors ───────────────────────────────────────────────────
// Each falls back to the literal the original renderer used, so a template that
// declares none of these renders exactly as it did before the tokens existed.

export const tRadius = (T: DeckTemplate): number => T.radius ?? 18;
export const tCards = (T: DeckTemplate): CardVariant => T.cards ?? "filled";
export const tCover = (T: DeckTemplate): CoverVariant => T.cover ?? "centered";
export const tChrome = (T: DeckTemplate): ChromeVariant => T.chrome ?? "footer";
export const tFigure = (T: DeckTemplate): FigureVariant => T.figure ?? "rings";
export const tOrnament = (T: DeckTemplate): OrnamentVariant => T.ornament ?? "blobs";
export const tCoverSize = (T: DeckTemplate): number => T.coverSize ?? 96;

/** Section headline size. `fallback` is the slide's original literal. */
export const tH1 = (T: DeckTemplate, fallback: number): number => T.h1 ?? fallback;

/** Slide padding. The original is `62px 80px 88px`. */
export function tPad(T: DeckTemplate, padOverride?: number): string {
  if (padOverride) return `64px ${padOverride}px 88px`;
  const d = T.density;
  if (d === "tight") return "48px 64px 78px";
  if (d === "airy") return "70px 92px 92px";
  return "62px 80px 88px";
}

/** Horizontal inset used by the footer, kept in step with `tPad`. */
export function tInset(T: DeckTemplate, padOverride?: number): number {
  if (padOverride) return padOverride;
  const d = T.density;
  return d === "tight" ? 64 : d === "airy" ? 92 : 80;
}

// ── Token helpers (ported from the artifact) ─────────────────────────────────

export function mix(c: string, pct: number, base?: string): string {
  return `color-mix(in srgb, ${c} ${pct}%, ${base || "transparent"})`;
}

export function border(T: DeckTemplate, strong?: boolean): string {
  return T.mode === "dark"
    ? `rgba(255,255,255,${strong ? 0.16 : 0.1})`
    : `rgba(15,23,42,${strong ? 0.14 : 0.09})`;
}

export function fD(T: DeckTemplate): string {
  const fallback = T.mono ? "monospace" : T.serif ? "Georgia, serif" : "sans-serif";
  return `${T.fontD}, ${fallback}`;
}

// Google Fonts used across all templates — loaded once on demand.
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Space+Grotesk:wght@400;500;600;700",
    "family=Sora:wght@300;400;500;600;700;800",
    "family=Archivo:wght@400;500;600;700;800;900",
    "family=Outfit:wght@400;500;600;700",
    "family=Manrope:wght@400;500;600;700;800",
    "family=Plus+Jakarta+Sans:wght@400;500;600;700;800",
    "family=DM+Sans:wght@400;500;600;700",
    "family=Newsreader:wght@300;400;500;600;700",
    "family=Bricolage+Grotesque:wght@400;500;600;700;800",
    "family=Schibsted+Grotesk:wght@400;500;600;700;800",
    "family=IBM+Plex+Sans:wght@400;500;600;700",
    "family=Inter:wght@400;500;600;700;800",
    // ── family 2 ──
    "family=Instrument+Sans:wght@400;500;600;700",
    "family=Azeret+Mono:wght@400;500;600",
    "family=Jost:wght@300;400;500;600",
    "family=Libre+Franklin:wght@400;500;600;700",
    "family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700",
    // ── family 3 (Volume 2 pack) ──
    "family=Work+Sans:wght@300;400;500;600;700;800",
    "family=Oswald:wght@400;500;600;700",
    "family=Syne:wght@400;500;600;700;800",
    // ── family 4 (Infographic / Volume 3) ──
    "family=Outfit:wght@400;500;600;700",
  ].join("&") +
  "&display=swap";

export function ensureDeckFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("deck-template-fonts")) return;
  const link = document.createElement("link");
  link.id = "deck-template-fonts";
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}
