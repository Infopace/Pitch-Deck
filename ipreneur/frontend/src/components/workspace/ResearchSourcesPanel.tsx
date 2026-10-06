import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ResearchConfidence, ResearchData } from "@/types";

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, .35)", zIndex: 60, display: "flex", justifyContent: "flex-end" } as React.CSSProperties,
  panel: { width: "min(420px, 100%)", height: "100%", background: "var(--surface-page)", overflowY: "auto", padding: 24 } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 } as React.CSSProperties,
  headerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 } as React.CSSProperties,
  title: { font: "700 16px var(--font-display)", color: "var(--text-strong)", margin: 0 } as React.CSSProperties,
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4, flexShrink: 0 } as React.CSSProperties,
  sectionTitle: { font: "700 11px var(--font-body)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 0 10px" } as React.CSSProperties,
  card: { marginBottom: 10 } as React.CSSProperties,
  row: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 } as React.CSSProperties,
  itemName: { font: "600 14px var(--font-body)", color: "var(--text-strong)" } as React.CSSProperties,
  itemMeta: { font: "400 13px var(--font-body)", color: "var(--text-muted)", marginTop: 3, lineHeight: 1.45 } as React.CSSProperties,
  sourceLink: { font: "500 12px var(--font-body)", color: "var(--blue-600)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, wordBreak: "break-all" } as React.CSSProperties,
  sourcesList: { display: "flex", flexDirection: "column", gap: 8 } as React.CSSProperties,
  empty: { font: "400 13px var(--font-body)", color: "var(--text-muted)" } as React.CSSProperties,
} as const;

function confidenceTone(confidence?: ResearchConfidence): BadgeTone {
  if (confidence === "HIGH") return "success";
  if (confidence === "MEDIUM") return "warning";
  return "neutral";
}

function ConfidenceBadge({ confidence }: { confidence?: ResearchConfidence }) {
  if (!confidence) return null;
  return <Badge tone={confidenceTone(confidence)}>{confidence}</Badge>;
}

/** Whether there's anything worth showing the panel for — deck types with
 * research profile 'none' return an empty research_data, and the "Sources"
 * button should simply not render rather than open to an empty state. */
export function hasResearchContent(research?: ResearchData | null): boolean {
  if (!research) return false;
  return Boolean(
    (research.founders && research.founders.length > 0) ||
    (research.competitors && research.competitors.length > 0) ||
    research.market
  );
}

interface ResearchSourcesPanelProps {
  research: ResearchData;
  onClose: () => void;
}

export function ResearchSourcesPanel({ research, onClose }: ResearchSourcesPanelProps) {
  const founders = research.founders ?? [];
  const competitors = research.competitors ?? [];
  const market = research.market;
  const sources = research.sources ?? [];

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-modal="true" aria-label="Research and sources">
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h3 style={s.title}>Research &amp; Sources</h3>
            <ConfidenceBadge confidence={research.confidence} />
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close research panel">
            <X size={18} />
          </button>
        </div>

        {founders.length > 0 && (
          <>
            <p style={s.sectionTitle}>Founders &amp; Leadership</p>
            {founders.map((f, i) => (
              <Card key={i} padding="sm" style={s.card}>
                <div style={s.row}>
                  <div>
                    <div style={s.itemName}>{f.name} — {f.title}</div>
                    {(f.prior || f.education) && (
                      <div style={s.itemMeta}>{[f.prior, f.education].filter(Boolean).join(" · ")}</div>
                    )}
                    {f.credential && <div style={s.itemMeta}>{f.credential}</div>}
                  </div>
                  <ConfidenceBadge confidence={f.confidence} />
                </div>
                {f.source && (
                  <a href={f.source} target="_blank" rel="noreferrer" style={s.sourceLink}>
                    <ExternalLink size={12} /> {f.source}
                  </a>
                )}
              </Card>
            ))}
          </>
        )}

        {competitors.length > 0 && (
          <>
            <p style={s.sectionTitle}>Competitors</p>
            {competitors.map((c, i) => (
              <Card key={i} padding="sm" style={s.card}>
                <div style={s.row}>
                  <div>
                    <div style={s.itemName}>{c.name}{c.funding ? ` — ${c.funding}` : ""}</div>
                    {c.weakness && <div style={s.itemMeta}>{c.weakness}</div>}
                  </div>
                  <ConfidenceBadge confidence={c.confidence} />
                </div>
              </Card>
            ))}
          </>
        )}

        {market && (
          <>
            <p style={s.sectionTitle}>Market</p>
            <Card padding="sm" style={s.card}>
              {market.tam && (
                <div style={s.itemMeta}>
                  <span style={s.itemName}>{market.tam} TAM</span>
                  {market.tam_description ? ` — ${market.tam_description}` : ""}
                  {market.tam_source ? ` (${market.tam_source})` : ""}
                </div>
              )}
              {market.sam && (
                <div style={s.itemMeta}>
                  <span style={s.itemName}>{market.sam} SAM</span>
                  {market.sam_description ? ` — ${market.sam_description}` : ""}
                </div>
              )}
              {market.som && (
                <div style={s.itemMeta}>
                  <span style={s.itemName}>{market.som} SOM</span>
                  {market.som_description ? ` — ${market.som_description}` : ""}
                </div>
              )}
              {market.cagr && (
                <div style={s.itemMeta}>
                  {market.cagr} CAGR
                  {market.cagr_period ? ` (${market.cagr_period})` : ""}
                  {market.cagr_source ? ` — ${market.cagr_source}` : ""}
                </div>
              )}
              {market.growth_drivers && market.growth_drivers.length > 0 && (
                <div style={s.itemMeta}>Growth drivers: {market.growth_drivers.join(", ")}</div>
              )}
            </Card>
          </>
        )}

        {sources.length > 0 && (
          <>
            <p style={s.sectionTitle}>Sources</p>
            <div style={s.sourcesList}>
              {sources.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" style={{ ...s.sourceLink, marginTop: 0 }}>
                  <ExternalLink size={12} /> {src}
                </a>
              ))}
            </div>
          </>
        )}

        {founders.length === 0 && competitors.length === 0 && !market && (
          <p style={s.empty}>No research data available for this deck.</p>
        )}
      </div>
    </div>
  );
}
