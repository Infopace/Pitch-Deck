/**
 * The login page's hero illustration — a glossy 3D-style rocket with a soft
 * vapour trail, drawn as inline SVG.
 *
 * SVG rather than CSS divs: the design needs real gradient shading (a lit body,
 * a recessed window with a specular highlight, swept fins catching light on one
 * edge) which box-shadow and border-radius cannot express. It stays a component
 * rather than an exported image so it recolours with the palette and renders
 * crisply at any DPR.
 *
 * Geometry is authored upright — nose at the top, exhaust at the bottom — and
 * the whole assembly is rotated once at the root, so the trail follows the
 * rocket automatically.
 */
export function RocketIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 680 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Body: lit from the upper left, shading to cool blue-grey on the
            lower right — this is what reads as "cylinder" rather than "blob". */}
        <linearGradient id="rk-body" x1="18%" y1="6%" x2="94%" y2="92%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="42%" stopColor="#F4F7FF" />
          <stop offset="74%" stopColor="#DDE4F7" />
          <stop offset="100%" stopColor="#BAC6E6" />
        </linearGradient>

        {/* Narrow specular band down the left of the barrel. */}
        <linearGradient id="rk-gloss" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="rk-nose" x1="15%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#9B7BFF" />
          <stop offset="48%" stopColor="#7A54EC" />
          <stop offset="100%" stopColor="#4E2FBE" />
        </linearGradient>

        <linearGradient id="rk-fin-l" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B68F5" />
          <stop offset="100%" stopColor="#4A2FBC" />
        </linearGradient>

        <linearGradient id="rk-fin-r" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C57EE" />
          <stop offset="100%" stopColor="#4326B0" />
        </linearGradient>

        <linearGradient id="rk-collar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A66F2" />
          <stop offset="100%" stopColor="#4B2EBE" />
        </linearGradient>

        {/* Window glass — deep navy, brightest at the upper left. */}
        <radialGradient id="rk-glass" cx="34%" cy="28%" r="82%">
          <stop offset="0%" stopColor="#4B63C9" />
          <stop offset="46%" stopColor="#23347F" />
          <stop offset="100%" stopColor="#101A4E" />
        </radialGradient>

        <linearGradient id="rk-rim" x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#EDF1FF" />
          <stop offset="50%" stopColor="#B9C6EE" />
          <stop offset="100%" stopColor="#8595CC" />
        </linearGradient>

        <linearGradient id="rk-flame" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FF5E8A" stopOpacity="0" />
          <stop offset="26%" stopColor="#FF6A3D" />
          <stop offset="70%" stopColor="#FFA733" />
          <stop offset="100%" stopColor="#FFE08A" />
        </linearGradient>

        <linearGradient id="rk-flame-core" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0" />
          <stop offset="55%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Vapour trail — violet close to the nozzle, dissolving to nothing. */}
        <linearGradient id="rk-trail" x1="50%" y1="0%" x2="30%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#B7A4FB" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#D9CEFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="rk-trail-core" x1="50%" y1="0%" x2="35%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#EFEAFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id="rk-soft" x="-60%" y="-30%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="rk-soft-sm" x="-60%" y="-30%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="rk-glow" x="-90%" y="-60%" width="280%" height="240%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="rk-drop" x="-45%" y="-25%" width="190%" height="170%">
          <feDropShadow dx="6" dy="22" stdDeviation="22" floodColor="#4B3FA8" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Rotated once: everything below is authored upright.
          Proportions follow the reference: a slender barrel, a short sharp
          nose (~30% of length), a small window high on the body, and fins
          swept back across the bottom third. */}
      <g transform="translate(330 -20) rotate(42 172 210)">
        {/* ── Vapour trail ─────────────────────────────────────────────── */}
        <path
          d="M172 430 C 170 520 146 610 78 726"
          stroke="url(#rk-trail)"
          strokeWidth="164"
          strokeLinecap="round"
          filter="url(#rk-soft)"
        />
        <path
          d="M172 424 C 171 500 154 574 106 664"
          stroke="url(#rk-trail-core)"
          strokeWidth="52"
          strokeLinecap="round"
          filter="url(#rk-soft-sm)"
        />

        {/* ── Exhaust flame ────────────────────────────────────────────── */}
        <g filter="url(#rk-glow)" opacity="0.92">
          <path d="M172 486 C 152 448 143 420 146 394 L 198 394 C 201 420 192 448 172 486 Z" fill="url(#rk-flame)" />
        </g>
        <path d="M172 478 C 155 442 147 418 150 394 L 194 394 C 197 418 189 442 172 478 Z" fill="url(#rk-flame)" />
        <path d="M172 444 C 164 424 160 410 161 396 L 183 396 C 184 410 180 424 172 444 Z" fill="url(#rk-flame-core)" />

        <g filter="url(#rk-drop)">
          {/* ── Fins — bottom third, swept well back ───────────────────── */}
          <path
            d="M132 284 C 102 312 76 350 62 396 C 88 380 110 368 132 360 Z"
            fill="url(#rk-fin-l)"
          />
          <path
            d="M132 292 C 112 314 96 340 84 368 C 100 358 116 350 132 344 Z"
            fill="#FFFFFF"
            opacity="0.16"
          />
          <path
            d="M212 284 C 242 312 268 350 282 396 C 256 380 234 368 212 360 Z"
            fill="url(#rk-fin-r)"
          />

          {/* ── Collar + nozzle ────────────────────────────────────────── */}
          <path d="M150 376 L 194 376 L 188 404 Q 172 410 156 404 Z" fill="url(#rk-collar)" />
          <rect x="138" y="356" width="68" height="22" rx="11" fill="url(#rk-collar)" />
          <rect x="145" y="360" width="54" height="5" rx="2.5" fill="#FFFFFF" opacity="0.34" />

          {/* ── Barrel ─────────────────────────────────────────────────── */}
          <path
            d="M172 14
               C 191 44 206 84 212 126
               L 212 322
               C 212 352 196 376 172 386
               C 148 376 132 352 132 322
               L 132 126
               C 138 84 153 44 172 14 Z"
            fill="url(#rk-body)"
          />
          {/* Specular band down the lit edge */}
          <path
            d="M150 120 C 145 150 144 166 144 186 L 144 322 C 144 338 149 352 157 362
               C 150 348 152 336 152 322 L 152 186 C 152 164 155 146 160 118 Z"
            fill="url(#rk-gloss)"
            opacity="0.95"
          />

          {/* ── Nose cone ──────────────────────────────────────────────── */}
          <path
            d="M172 14
               C 191 44 206 84 212 126
               C 199 118 187 114 172 114
               C 157 114 145 118 132 126
               C 138 84 153 44 172 14 Z"
            fill="url(#rk-nose)"
          />
          <path
            d="M172 24 C 161 50 154 84 151 116 C 156 114 161 112 166 111 C 166 80 169 50 172 24 Z"
            fill="#FFFFFF"
            opacity="0.26"
          />

          {/* ── Window ─────────────────────────────────────────────────── */}
          <circle cx="172" cy="182" r="31" fill="url(#rk-rim)" />
          <circle cx="172" cy="182" r="25" fill="url(#rk-glass)" />
          <ellipse cx="163" cy="173" rx="9.5" ry="6" fill="#FFFFFF" opacity="0.42" transform="rotate(-36 163 173)" />
          <ellipse cx="180" cy="192" rx="4.2" ry="2.8" fill="#FFFFFF" opacity="0.2" transform="rotate(-36 180 192)" />
        </g>
      </g>
    </svg>
  );
}

/* ── Feature-card icons ───────────────────────────────────────────────────
   Small gradient-shaded marks rather than flat line icons, so the floating
   cards read as part of the same illustrated world as the rocket.          */

export function IdeateIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ic-bulb" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#F49BFF" />
          <stop offset="55%" stopColor="#C56BF5" />
          <stop offset="100%" stopColor="#7E43E0" />
        </linearGradient>
        <linearGradient id="ic-bulb-base" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B9C3DE" />
          <stop offset="100%" stopColor="#8D9ABC" />
        </linearGradient>
      </defs>
      <path
        d="M16 3c-5.2 0-9 3.9-9 8.8 0 3 1.4 5 3 6.6 1 1 1.6 1.9 1.8 3h8.4c.2-1.1.8-2 1.8-3 1.6-1.6 3-3.6 3-6.6C25 6.9 21.2 3 16 3Z"
        fill="url(#ic-bulb)"
      />
      <path d="M13 5.6c-2.4 1.2-3.9 3.4-4.1 6.1-.1.7.9.9 1.1.2.5-2.3 1.6-4 3.4-5.1.6-.4.2-1.5-.4-1.2Z" fill="#fff" opacity=".55" />
      <rect x="11.4" y="23.2" width="9.2" height="2.9" rx="1.45" fill="url(#ic-bulb-base)" />
      <rect x="12.6" y="27" width="6.8" height="2.6" rx="1.3" fill="url(#ic-bulb-base)" />
    </svg>
  );
}

export function BuildIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ic-bar-a" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#7FA8FF" />
          <stop offset="100%" stopColor="#5B87F7" />
        </linearGradient>
        <linearGradient id="ic-bar-b" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#5E85F9" />
          <stop offset="100%" stopColor="#3D63E8" />
        </linearGradient>
        <linearGradient id="ic-bar-c" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#8E6BF3" />
          <stop offset="100%" stopColor="#5E3BDD" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="17.5" width="6.4" height="11" rx="3.2" fill="url(#ic-bar-a)" />
      <rect x="12.8" y="11" width="6.4" height="17.5" rx="3.2" fill="url(#ic-bar-b)" />
      <rect x="21.1" y="4.5" width="6.4" height="24" rx="3.2" fill="url(#ic-bar-c)" />
      <rect x="6" y="19" width="1.9" height="5" rx="0.95" fill="#fff" opacity=".4" />
      <rect x="14.3" y="12.6" width="1.9" height="5" rx="0.95" fill="#fff" opacity=".35" />
      <rect x="22.6" y="6.1" width="1.9" height="5" rx="0.95" fill="#fff" opacity=".35" />
    </svg>
  );
}

export function ScaleIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ic-p-main" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#7FA6FF" />
          <stop offset="100%" stopColor="#3F62E0" />
        </linearGradient>
        <linearGradient id="ic-p-side" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#A9C2FF" />
          <stop offset="100%" stopColor="#6B8CF0" />
        </linearGradient>
      </defs>
      <circle cx="8.6" cy="11.4" r="4.1" fill="url(#ic-p-side)" />
      <path d="M1.6 24.6c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2c0 .8-.5 1.2-1.3 1.2H2.9c-.8 0-1.3-.4-1.3-1.2Z" fill="url(#ic-p-side)" />
      <circle cx="22.9" cy="11.4" r="4.1" fill="url(#ic-p-side)" />
      <path d="M16.4 24.6c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2c0 .8-.5 1.2-1.3 1.2H17.7c-.8 0-1.3-.4-1.3-1.2Z" fill="url(#ic-p-side)" />
      <circle cx="15.9" cy="9.5" r="5" fill="url(#ic-p-main)" />
      <path d="M7.4 24.9c0-4.5 3.8-7.6 8.5-7.6s8.5 3.1 8.5 7.6c0 1-.6 1.5-1.6 1.5H9c-1 0-1.6-.5-1.6-1.5Z" fill="url(#ic-p-main)" />
      <path d="M13.2 6.4c-1.3.6-2.2 1.7-2.5 3-.1.6.8.8 1 .2.3-1 .9-1.8 1.9-2.3.5-.3.1-1.2-.4-.9Z" fill="#fff" opacity=".5" />
    </svg>
  );
}
