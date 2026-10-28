import React from "react";
import "./MintStoryGraphic.css";

/** A compact visual story of how Mint turns company context into a deck. */
export default function MintStoryGraphic() {
  return (
    <svg
      viewBox="0 0 820 470"
      role="img"
      aria-labelledby="mint-story-title mint-story-description"
      className="mint-story-graphic h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <title id="mint-story-title">From company context to an editable pitch deck</title>
      <desc id="mint-story-description">
        A company website, live research, and a company profile flow through Mint into a structured pitch deck.
      </desc>
      <defs>
        <linearGradient id="mint-story-glow" x1="110" y1="50" x2="700" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DBEAFE" />
          <stop offset="0.55" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#D1FAE5" />
        </linearGradient>
        <linearGradient id="mint-story-deck" x1="573" y1="104" x2="762" y2="342" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <filter id="mint-story-shadow" x="0" y="0" width="820" height="470" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0F172A" floodOpacity="0.11" />
        </filter>
        <filter id="mint-story-core-shadow" x="347" y="157" width="132" height="132" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#2563EB" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect x="9" y="9" width="802" height="452" rx="30" fill="url(#mint-story-glow)" />
      <circle cx="752" cy="72" r="34" fill="#10B981" fillOpacity="0.12" />
      <circle cx="62" cy="397" r="44" fill="#2563EB" fillOpacity="0.08" />

      {/* Flow paths sit behind each card. */}
      <path className="mint-story-path" d="M220 230C282 230 318 230 374 230" stroke="#2563EB" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="5 8" />
      <path className="mint-story-path mint-story-path-delay" d="M385 154C385 177 395 185 407 200" stroke="#10B981" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 8" />
      <path className="mint-story-path mint-story-path-delay-2" d="M386 323C386 295 396 282 408 265" stroke="#10B981" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5 8" />
      <path className="mint-story-path" d="M468 231C510 231 528 231 570 231" stroke="#2563EB" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 8" />

      {/* Website input */}
      <g filter="url(#mint-story-shadow)">
        <rect x="28" y="119" width="193" height="224" rx="17" fill="white" />
        <path d="M28 136C28 126.611 35.6112 119 45 119H204C213.389 119 221 126.611 221 136V151H28V136Z" fill="#F8FAFC" />
        <circle cx="45" cy="135" r="3.5" fill="#CBD5E1" />
        <circle cx="57" cy="135" r="3.5" fill="#CBD5E1" />
        <circle cx="69" cy="135" r="3.5" fill="#CBD5E1" />
        <rect x="42" y="164" width="42" height="7" rx="3.5" fill="#0F172A" />
        <rect x="42" y="185" width="151" height="24" rx="5" fill="#EFF6FF" />
        <rect x="50" y="194" width="82" height="6" rx="3" fill="#2563EB" />
        <rect x="42" y="224" width="119" height="8" rx="4" fill="#0F172A" fillOpacity="0.88" />
        <rect x="42" y="241" width="146" height="5" rx="2.5" fill="#CBD5E1" />
        <rect x="42" y="252" width="126" height="5" rx="2.5" fill="#E2E8F0" />
        <rect x="42" y="274" width="50" height="38" rx="7" fill="#DBEAFE" />
        <rect x="100" y="274" width="50" height="38" rx="7" fill="#D1FAE5" />
        <rect x="158" y="274" width="36" height="38" rx="7" fill="#F1F5F9" />
        <text x="42" y="329" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="1.2">COMPANY WEBSITE</text>
      </g>

      {/* Research signal */}
      <g filter="url(#mint-story-shadow)">
        <rect x="286" y="32" width="219" height="123" rx="16" fill="#0F172A" />
        <circle cx="310" cy="57" r="5" fill="#10B981" />
        <text x="324" y="61" fill="white" fontSize="11" fontWeight="700">LIVE MARKET RESEARCH</text>
        <rect x="307" y="78" width="88" height="25" rx="7" fill="#1E293B" />
        <rect x="403" y="78" width="78" height="25" rx="7" fill="#1E293B" />
        <text x="317" y="94" fill="#CBD5E1" fontSize="8">Market size</text>
        <text x="413" y="94" fill="#CBD5E1" fontSize="8">Competitors</text>
        <rect x="307" y="111" width="77" height="25" rx="7" fill="#1E293B" />
        <text x="317" y="127" fill="#CBD5E1" fontSize="8">Comparables</text>
        <path d="M413 124L422 132L439 112" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="445" y="128" fill="#A7F3D0" fontSize="8" fontWeight="600">Reviewable</text>
      </g>

      {/* Company profile */}
      <g filter="url(#mint-story-shadow)">
        <rect x="286" y="324" width="219" height="106" rx="16" fill="white" />
        <rect x="303" y="341" width="30" height="30" rx="9" fill="#ECFDF5" />
        <path d="M312 356H324M318 350V362" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <text x="343" y="352" fill="#0F172A" fontSize="10" fontWeight="700">YOUR COMPANY PROFILE</text>
        <text x="343" y="366" fill="#64748B" fontSize="8">Facts you can reuse across decks</text>
        <rect x="303" y="386" width="53" height="23" rx="6" fill="#F8FAFC" />
        <rect x="363" y="386" width="56" height="23" rx="6" fill="#F8FAFC" />
        <rect x="426" y="386" width="61" height="23" rx="6" fill="#F8FAFC" />
        <text x="313" y="401" fill="#475569" fontSize="7">Stage</text>
        <text x="372" y="401" fill="#475569" fontSize="7">Traction</text>
        <text x="435" y="401" fill="#475569" fontSize="7">Customers</text>
      </g>

      {/* Mint transformation point */}
      <g filter="url(#mint-story-core-shadow)">
        <circle cx="421" cy="231" r="48" fill="#2563EB" />
        <circle cx="421" cy="231" r="39" stroke="white" strokeOpacity="0.22" />
        <path d="M400 249V214L421 232L442 214V249" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="447" cy="204" r="5" fill="#34D399" />
      </g>
      <text x="421" y="293" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="800" letterSpacing="1.4">MINT</text>

      {/* Finished deck */}
      <g filter="url(#mint-story-shadow)">
        <rect x="572" y="100" width="205" height="266" rx="16" fill="#DBEAFE" transform="rotate(5 572 100)" />
        <rect x="568" y="94" width="205" height="266" rx="16" fill="url(#mint-story-deck)" transform="rotate(-3 568 94)" />
        <g transform="rotate(-3 568 94)">
          <rect x="587" y="114" width="167" height="226" rx="9" fill="white" />
          <rect x="603" y="132" width="47" height="5" rx="2.5" fill="#10B981" />
          <text x="603" y="160" fill="#0F172A" fontSize="14" fontWeight="800">The investor</text>
          <text x="603" y="178" fill="#0F172A" fontSize="14" fontWeight="800">story, clearly told.</text>
          <rect x="603" y="190" width="127" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="603" y="201" width="98" height="5" rx="2.5" fill="#E2E8F0" />
          <rect x="603" y="221" width="127" height="73" rx="7" fill="#EFF6FF" />
          <path d="M615 278L638 263L655 269L675 245L691 252L716 232" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="716" cy="232" r="4" fill="#10B981" />
          <rect x="603" y="307" width="46" height="18" rx="5" fill="#D1FAE5" />
          <rect x="655" y="307" width="75" height="18" rx="5" fill="#F1F5F9" />
        </g>
      </g>
      <g className="mint-story-badge">
        <rect x="620" y="65" width="133" height="28" rx="14" fill="#D1FAE5" stroke="white" strokeWidth="2" />
        <path d="M635 79L640 84L649 74" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="656" y="82" fill="#065F46" fontSize="8" fontWeight="800" letterSpacing="0.6">READY TO REFINE</text>
      </g>
    </svg>
  );
}
