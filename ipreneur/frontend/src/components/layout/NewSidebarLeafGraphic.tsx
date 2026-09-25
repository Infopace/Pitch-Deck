import React from "react";

/**
 * Professional SaaS Pitch Studio Graphic for the Sidebar.
 * High-end isometric presentation deck stack with live analytics wireframes,
 * AI sparkles, ambient luminous glows, and precision tech grid.
 */
export default function NewSidebarLeafGraphic() {
  return (
    <div
      className="pointer-events-none select-none absolute bottom-0 left-0 overflow-hidden"
      style={{ zIndex: 0, width: "265px", height: "340px" }}
      aria-hidden="true"
    >
      <svg
        width="265"
        height="340"
        viewBox="0 0 265 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Ambient background glow 1 */}
          <radialGradient id="pro-glow-primary" cx="35%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.40" />
            <stop offset="50%" stopColor="#DBEAFE" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0" />
          </radialGradient>

          {/* Indigo accent glow */}
          <radialGradient id="pro-glow-indigo" cx="70%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.30" />
            <stop offset="60%" stopColor="#C7D2FE" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Front deck card gradient */}
          <linearGradient id="deck-card-front" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Mid deck card gradient */}
          <linearGradient id="deck-card-mid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.85" />
          </linearGradient>

          {/* Back deck card gradient */}
          <linearGradient id="deck-card-back" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0.45" />
          </linearGradient>

          {/* Sparkle star gradient */}
          <linearGradient id="sparkle-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>

          {/* Metric badge gradient */}
          <linearGradient id="metric-pill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EFF6FF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.85" />
          </linearGradient>

          {/* Subtle tech dot pattern */}
          <pattern id="pro-tech-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#3B82F6" fillOpacity="0.16" />
          </pattern>
        </defs>

        {/* ── Ambient Radial Glows ── */}
        <circle cx="100" cy="180" r="160" fill="url(#pro-glow-primary)" />
        <circle cx="180" cy="130" r="120" fill="url(#pro-glow-indigo)" />

        {/* ── Modern Tech Dot Matrix Grid ── */}
        <rect x="20" y="50" width="220" height="200" fill="url(#pro-tech-dots)" opacity="0.85" />

        {/* ── Precision Coordinate Crosshairs & Concentric Rings ── */}
        <g stroke="#93C5FD" strokeOpacity="0.30" strokeWidth="1" strokeDasharray="3 4">
          <circle cx="140" cy="185" r="95" />
          <circle cx="140" cy="185" r="60" />
        </g>
        <path
          d="M140 85 L140 95 M140 275 L140 285 M35 185 L45 185 M235 185 L245 185"
          stroke="#60A5FA"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />

        {/* ═════════════════════════════════════════════
            ISOMETRIC PITCH DECK STACK
            ═════════════════════════════════════════════ */}

        {/* ── Base Depth Shadow ── */}
        <g transform="translate(68, 220) skewX(-26) rotate(-10)">
          <rect
            width="135"
            height="85"
            rx="14"
            fill="#1E293B"
            fillOpacity="0.08"
          />
        </g>

        {/* ── Slide 1: Back Pitch Slide (Frosted Wireframe) ── */}
        <g transform="translate(54, 155) skewX(-24) rotate(-10)">
          <rect
            width="130"
            height="82"
            rx="12"
            fill="url(#deck-card-back)"
            stroke="#93C5FD"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          {/* Wireframe header line */}
          <rect x="14" y="14" width="45" height="5" rx="2.5" fill="#3B82F6" fillOpacity="0.35" />
          {/* Wireframe content blocks */}
          <rect x="14" y="26" width="30" height="20" rx="3" fill="#3B82F6" fillOpacity="0.18" />
          <rect x="50" y="26" width="30" height="20" rx="3" fill="#3B82F6" fillOpacity="0.18" />
          <rect x="86" y="26" width="30" height="20" rx="3" fill="#3B82F6" fillOpacity="0.18" />
          {/* Subtle text lines */}
          <rect x="14" y="54" width="70" height="3" rx="1.5" fill="#3B82F6" fillOpacity="0.22" />
          <rect x="14" y="61" width="50" height="3" rx="1.5" fill="#3B82F6" fillOpacity="0.18" />
        </g>

        {/* ── Slide 2: Middle Pitch Slide (Live Metrics & Analytics) ── */}
        <g transform="translate(64, 135) skewX(-24) rotate(-10)">
          <rect
            width="132"
            height="84"
            rx="12"
            fill="url(#deck-card-mid)"
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeOpacity="0.8"
          />
          {/* Slide title */}
          <rect x="14" y="14" width="55" height="6" rx="3" fill="#0F172A" fillOpacity="0.75" />
          <rect x="74" y="14" width="18" height="6" rx="3" fill="#10B981" fillOpacity="0.85" />

          {/* Bar Chart Visualization */}
          <rect x="14" y="52" width="10" height="18" rx="2" fill="#93C5FD" />
          <rect x="28" y="44" width="10" height="26" rx="2" fill="#60A5FA" />
          <rect x="42" y="34" width="10" height="36" rx="2" fill="#3B82F6" />
          <rect x="56" y="26" width="10" height="44" rx="2" fill="#2563EB" />

          {/* Mini Donut / Circle Metric */}
          <circle cx="95" cy="46" r="16" stroke="#E2E8F0" strokeWidth="4" fill="none" />
          <path
            d="M 95 30 A 16 16 0 0 1 111 46"
            stroke="#3B82F6"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="95" cy="46" r="4" fill="#3B82F6" />
        </g>

        {/* ── Slide 3: Front Elevated Pitch Deck Hero Card ── */}
        <g transform="translate(74, 115) skewX(-24) rotate(-10)">
          {/* Soft contact shadow beneath front card */}
          <rect
            x="2"
            y="6"
            width="134"
            height="86"
            rx="12"
            fill="#1E3A8A"
            fillOpacity="0.18"
          />
          {/* Vibrant gradient card */}
          <rect
            width="134"
            height="86"
            rx="12"
            fill="url(#deck-card-front)"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />

          {/* Top gloss specular highlight */}
          <path
            d="M 0 12 C 0 5.37 5.37 0 12 0 L 122 0 C 128.63 0 134 5.37 134 12 L 134 26 L 0 50 Z"
            fill="#FFFFFF"
            fillOpacity="0.15"
          />

          {/* Slide Deck Logo / Icon */}
          <rect x="14" y="16" width="22" height="22" rx="6" fill="#FFFFFF" fillOpacity="0.22" />
          <path
            d="M 21 27 L 24 21 L 29 32 L 32 27"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Deck Title Header */}
          <rect x="42" y="17" width="55" height="7" rx="3.5" fill="#FFFFFF" />
          <rect x="42" y="28" width="38" height="5" rx="2.5" fill="#BFDBFE" fillOpacity="0.8" />

          {/* Growth Trend Line */}
          <path
            d="M 16 66 Q 45 64 65 52 T 116 38"
            fill="none"
            stroke="#67E8F9"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Arrow / Pulsing Target */}
          <circle cx="116" cy="38" r="4" fill="#FFFFFF" />
          <circle cx="116" cy="38" r="8" fill="#67E8F9" fillOpacity="0.35" />

          {/* Pro Pill Badge */}
          <rect x="14" y="58" width="38" height="14" rx="7" fill="#FFFFFF" fillOpacity="0.25" />
          <circle cx="21" cy="65" r="2.5" fill="#4ADE80" />
          <rect x="27" y="63" width="18" height="4" rx="2" fill="#FFFFFF" />
        </g>

        {/* ═════════════════════════════════════════════
            FLOATING AI SPARKLES & PRO BADGES
            ═════════════════════════════════════════════ */}

        {/* ── Main 4-Point AI Sparkle Star (✦) ── */}
        <g transform="translate(198, 92)">
          {/* Glow circle */}
          <circle cx="0" cy="0" r="14" fill="#60A5FA" fillOpacity="0.25" />
          {/* 4-pointed diamond star */}
          <path
            d="M0 -15 Q0 0 15 0 Q0 0 0 15 Q0 0 -15 0 Q0 0 0 -15 Z"
            fill="url(#sparkle-grad)"
          />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
        </g>

        {/* ── Secondary Mini Sparkle ── */}
        <g transform="translate(52, 105)">
          <path
            d="M0 -9 Q0 0 9 0 Q0 0 0 9 Q0 0 -9 0 Q0 0 0 -9 Z"
            fill="#60A5FA"
            fillOpacity="0.85"
          />
        </g>

        {/* ── Small Accent Sparkle ── */}
        <g transform="translate(215, 175)">
          <path
            d="M0 -6 Q0 0 6 0 Q0 0 0 6 Q0 0 -6 0 Q0 0 0 -6 Z"
            fill="#818CF8"
            fillOpacity="0.7"
          />
        </g>

        {/* ── Floating Metric Pill (AI Pitch Engine) ── */}
        <g transform="translate(32, 236)">
          <rect
            width="128"
            height="26"
            rx="13"
            fill="url(#metric-pill)"
            stroke="#BFDBFE"
            strokeWidth="1"
            strokeOpacity="0.8"
          />
          {/* Pulsing indicator dot */}
          <circle cx="14" cy="13" r="3.5" fill="#3B82F6" />
          <circle cx="14" cy="13" r="6" fill="#3B82F6" fillOpacity="0.20" />
          {/* Text lines simulating 'AI DECK ENGINE' */}
          <rect x="25" y="10" width="58" height="6" rx="3" fill="#1E3A8A" fillOpacity="0.85" />
          <rect x="88" y="10" width="28" height="6" rx="3" fill="#2563EB" fillOpacity="0.55" />
        </g>

        {/* ── Ambient Micro-Nodes & Orbit Particles ── */}
        <circle cx="48" cy="165" r="2" fill="#3B82F6" fillOpacity="0.45" />
        <circle cx="185" cy="65" r="2.5" fill="#818CF8" fillOpacity="0.55" />
        <circle cx="225" cy="120" r="1.8" fill="#60A5FA" fillOpacity="0.5" />
        <circle cx="85" cy="80" r="1.5" fill="#93C5FD" fillOpacity="0.6" />
      </svg>
    </div>
  );
}
