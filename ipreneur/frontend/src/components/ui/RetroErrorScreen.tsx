import React from "react";
import { Link } from "react-router-dom";
import { Home, LayoutGrid } from "lucide-react";
import { Tv404 } from "@/components/ui/Tv404";
import { Button } from "@/components/ui/Button";

interface RetroErrorScreenProps {
  title: string;
  description: string;
  /** What the TV's screen shows — "NOT FOUND", "NO SIGNAL", "SYSTEM ERROR". */
  screenText: string;
  /** The giant "404" behind the set. Only the actual 404 page turns it on. */
  watermark?: boolean;
  /** The page's one recovery action — "Go Back", "Retry", "Reload Page". */
  primaryAction: { label: string; icon: React.ReactNode; onClick: () => void };
  /** 404 is the one case where Dashboard, not the recovery action, is the
   * dark/primary button — matches the original page and the approved mockup. */
  dashboardIsPrimary?: boolean;
  /** 100vh fits the standalone 404 route, which has no other chrome. A
   * screen embedded inside the dashboard shell (sidebar already on screen)
   * wants something shorter so it doesn't force extra page scroll. */
  minHeight?: string;
}

/**
 * The shared chrome behind every full-page error state in the app — the
 * retro TV, a title and description, and a row of three actions. One kind
 * (not found, can't reach the server, something crashed) differs only in
 * the screen text, the watermark, and which action leads.
 */
export function RetroErrorScreen({
  title,
  description,
  screenText,
  watermark = false,
  primaryAction,
  dashboardIsPrimary = false,
  minHeight = "100vh",
}: RetroErrorScreenProps) {
  return (
    <div
      style={{
        minHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 60px",
        background: "radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.05), transparent 70%), #fafafa",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "1rem", overflow: "visible" }}>
        <Tv404 screenText={screenText} watermark={watermark} />
      </div>

      <div style={{ maxWidth: 480, marginTop: "0.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Montserrat', sans-serif)",
            fontWeight: 800,
            fontSize: "clamp(20px, 4vw, 26px)",
            color: "#1e293b",
            letterSpacing: "-0.02em",
            marginBottom: "10px",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#64748b",
            marginBottom: "26px",
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Button variant={dashboardIsPrimary ? "secondary" : "primary"} onClick={primaryAction.onClick} icon={primaryAction.icon}>
            {primaryAction.label}
          </Button>

          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant={dashboardIsPrimary ? "primary" : "secondary"} icon={<LayoutGrid size={15} />}>
              Dashboard
            </Button>
          </Link>

          <Link to="/" style={{ textDecoration: "none" }}>
            <Button variant="secondary" icon={<Home size={15} />}>
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
