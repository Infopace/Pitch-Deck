import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LayoutGrid } from "lucide-react";
import { Tv404 } from "@/components/ui/Tv404";
import { Button } from "@/components/ui/Button";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  showBack?: boolean;
}

export default function NotFoundPage({
  title = "Lost the Signal — Page Not Found",
  description = "The page or pitch deck you're looking for doesn't exist, has been removed, or the link is incorrect.",
  showBack = true,
}: NotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 60px",
        background: "radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.05), transparent 70%), #fafafa",
        textAlign: "center",
      }}
    >
      {/* Retro TV 404 Animation */}
      <div style={{ marginBottom: "1rem", overflow: "visible" }}>
        <Tv404 />
      </div>

      {/* Copy */}
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

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {showBack && (
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              icon={<ArrowLeft size={15} />}
            >
              Go Back
            </Button>
          )}

          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="primary" icon={<LayoutGrid size={15} />}>
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
