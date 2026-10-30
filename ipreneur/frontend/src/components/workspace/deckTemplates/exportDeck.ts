/**
 * Pixel-exact PPTX export for the templated deck.
 *
 * The on-screen preview (TemplatedDeck) and the download used to be two
 * completely different renderers, so the exported file never matched the
 * theme/layout the user saw. This exporter removes that gap: it renders the
 * SAME `renderSlide(theme, data, i)` output the preview uses, at its native
 * 1280×720, captures each slide to a PNG, and drops those images full-bleed
 * onto 16:9 PPTX slides. The result is byte-for-byte what the user previewed.
 *
 * Trade-off: slides are images (not editable text in PowerPoint) — that is the
 * cost of guaranteeing an exact visual match. Links are the one exception:
 * every `<a href>` in the captured slide (team contact chips, the closing
 * slide's email/website) gets an invisible clickable rectangle layered over
 * the image at the same position, so emails/phone numbers/LinkedIn profiles
 * stay clickable in the exported file even though the slide itself is a PNG.
 *
 * Why this was slow — two compounding causes, found by instrumenting a real
 * export and reading the console:
 *  1. Each slide is rasterized at 2× pixel density (2560×1440), which used to
 *     happen one slide at a time — a 24-slide deck did 24 sequential round
 *     trips through that pipeline. CAPTURE_CONCURRENCY fixes this.
 *  2. The dominant cost: html-to-image re-discovers every `@font-face` on the
 *     page for EVERY slide by reading `document.styleSheets`, which throws a
 *     SecurityError on the cross-origin Google Fonts stylesheet and falls
 *     back to re-fetching it over the network — uncached, because of
 *     `cacheBust`. On a 25-slide deck that's ~25 redundant font-CSS fetches,
 *     and it dwarfed the sequential-capture cost (one real run went from
 *     ~1.3s to ~21s purely from this). `getFontEmbedCSS` computes that once
 *     and every `toPng` call reuses it, skipping the rediscovery entirely.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { toPng, getFontEmbedCSS } from "html-to-image";
import PptxGenJS from "pptxgenjs";

import { Theme, ensureDeckFonts } from "./themes";
import { TemplateDeckData } from "./types";
import { SlideSlot, slideOrder } from "./deckTypes";
import { renderSlide } from "./TemplatedDeck";
import { VIEW_CTX } from "./editing/editableText";

const SLIDE_W = 1280;
const SLIDE_H = 720;
// 16:9 in inches — matches 1280×720 exactly, so images map without distortion.
const PPTX_W = 13.333;
const PPTX_H = 7.5;
// How many slides rasterize at once. Higher is faster up to a point, then
// contends for the same CPU/GPU work and stops helping — 4 is a conservative
// middle ground that doesn't risk choking a low-end laptop on a 30-slide deck.
const CAPTURE_CONCURRENCY = 4;

/** Runs `fn` over `items` with at most `limit` calls in flight at once. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fontsReady(): Promise<void> {
  const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* fonts.ready never rejects in practice; ignore just in case */
    }
  }
}

/** Wait for two animation frames so React has committed and the browser painted. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

/**
 * Render every deck slide off-screen, capture each as a PNG, and build a PPTX
 * whose slides are those exact images. Triggers a browser download.
 */
export async function exportTemplatedDeckToPptx(
  data: TemplateDeckData,
  theme: Theme,
  fileName: string,
  /** The deck's slide sequence. Defaults to the investor order, which is what
   * every deck generated before multi-deck support is. */
  order: SlideSlot[] = slideOrder(),
  /** Called after each slide finishes rasterizing, for a "N of total" progress UI. */
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  ensureDeckFonts();
  await fontsReady();

  // Off-screen host holding full-size slides. Positioned far off-screen (not
  // display:none) so it lays out and paints for an accurate capture.
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-100000px;top:0;width:" +
    SLIDE_W +
    "px;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const count = order.length;
    root.render(
      createElement(
        "div",
        null,
        Array.from({ length: count }, (_, i) =>
          createElement(
            "div",
            {
              key: i,
              "data-slide": String(i),
              style: {
                width: SLIDE_W,
                height: SLIDE_H,
                overflow: "hidden",
                background: theme.bg,
              },
            },
            renderSlide(theme, data, i, VIEW_CTX, order)
          )
        )
      )
    );

    await nextPaint();
    await fontsReady();

    const nodes = Array.from(
      host.querySelectorAll<HTMLElement>("[data-slide]")
    );

    // Computed once from the first slide (every slide shares the same
    // document-level stylesheets) and reused for every toPng() call below —
    // see the file-header comment for why this is the fix that matters most.
    const fontEmbedCSS = nodes[0] ? await getFontEmbedCSS(nodes[0]) : "";

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "DECK_16x9", width: PPTX_W, height: PPTX_H });
    pptx.layout = "DECK_16x9";
    const bgColor = theme.bg.replace("#", "");

    // getBoundingClientRect() is viewport-relative, and `node` sits far
    // off-screen, so every link's rect is measured against the node's own
    // rect rather than the page origin.
    const sx = PPTX_W / SLIDE_W;
    const sy = PPTX_H / SLIDE_H;

    let done = 0;
    const captures = await mapWithConcurrency(nodes, CAPTURE_CONCURRENCY, async (node) => {
      const dataUrl = await toPng(node, {
        width: SLIDE_W,
        height: SLIDE_H,
        pixelRatio: 2, // 2× for crisp text at presentation scale
        cacheBust: true,
        backgroundColor: theme.bg,
        fontEmbedCSS,
      });

      // Layer an invisible, clickable rectangle over every link in the
      // captured slide — the image itself has no notion of a hyperlink.
      const hostRect = node.getBoundingClientRect();
      const links = Array.from(node.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((a) => {
          const r = a.getBoundingClientRect();
          return {
            href: a.href,
            x: (r.left - hostRect.left) * sx,
            y: (r.top - hostRect.top) * sy,
            w: r.width * sx,
            h: r.height * sy,
          };
        })
        .filter((l) => l.w > 0 && l.h > 0 && l.href);

      onProgress?.(++done, nodes.length);
      return { dataUrl, links };
    });

    // Slide order matters for the pptx even though capture ran out of order,
    // so this part — fast, synchronous — stays a plain sequential loop.
    for (const { dataUrl, links } of captures) {
      const slide = pptx.addSlide();
      slide.background = { color: bgColor };
      slide.addImage({ data: dataUrl, x: 0, y: 0, w: PPTX_W, h: PPTX_H });
      for (const l of links) {
        slide.addShape(pptx.ShapeType.rect, {
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
          fill: { color: "FFFFFF", transparency: 100 },
          line: { type: "none" },
          hyperlink: { url: l.href },
        });
      }
    }

    const name = fileName.toLowerCase().endsWith(".pptx")
      ? fileName
      : `${fileName}.pptx`;
    await pptx.writeFile({ fileName: name });
  } finally {
    root.unmount();
    host.remove();
  }
}
