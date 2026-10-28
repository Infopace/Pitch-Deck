import React from "react";

export type MintLogoVariant = 1 | 2 | 3 | 4 | 5 | 6;

interface MintLogoProps {
  variant?: MintLogoVariant;
  layout?: "full" | "icon";
  height?: number | string;
  className?: string;
  textColor?: string;
}

export const MintLogo: React.FC<MintLogoProps> = ({
  variant = 1,
  layout = "full",
  height = 36,
  className = "",
  textColor = "currentColor",
}) => {
  // Option 1: Pitch Deck M
  if (variant === 1) {
    if (layout === "icon") {
      return (
        <svg
          height={height}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="3" y="3" width="42" height="42" rx="9" fill="#0F172A" />
          <path d="M10 14.5L30.5 7.5V13.5L19.5 20L10 16.5V14.5Z" fill="#FFFFFF" />
          <path d="M10 15.5L19.5 20.5V39L10 33.5V15.5Z" fill="#2563EB" />
          <path d="M20.5 20L30.5 14.5V34L20.5 39V20Z" fill="#10B981" />
          <path d="M31.5 14.5L35.5 12.5V31.5L31.5 34V14.5Z" fill="#059669" />
          <path d="M19.5 20L30.5 13.5V16.8L20.5 22.5L19.5 20Z" fill="#020617" />
        </svg>
      );
    }

    return (
      <svg
        height={height}
        viewBox="0 0 160 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path d="M8 14.5L30.5 6.5V12.8L19.5 19.5L8 15.5V14.5Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 14.5L19.5 20.5V43L8 36.5V14.5Z" fill="#2563EB" />
        <path d="M20.5 20L31 14V36.5L20.5 43V20Z" fill="#10B981" />
        <path d="M32 14L37 11.5V34L32 37V14Z" fill="#059669" />
        <path d="M19.5 20L30.5 13.5V17L20.5 23L19.5 20Z" fill="#0F172A" />
        <text x="54" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontSize="34" fontWeight="800" letterSpacing="-1.2" fill={textColor}>Mint</text>
      </svg>
    );
  }

  // Option 2: Faceted Mint Coin / Token
  if (variant === 2) {
    if (layout === "icon") {
      return (
        <svg height={height} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="hexGrad-icon" x1="6" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <linearGradient id="leafGrad2-icon" x1="14" y1="12" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <rect x="6" y="5" width="40" height="40" rx="12" fill="url(#hexGrad-icon)" stroke="#34D399" strokeWidth="2" />
          <path d="M26 13C33 13 36 19 35 27C34 35 26 37 26 37C26 37 18 35 17 27C16 19 19 13 26 13Z" fill="url(#leafGrad2-icon)" />
          <path d="M26 20C21 23 20 28 26 33C32 28 31 23 26 20Z" fill="#064e3b" fillOpacity="0.4" />
        </svg>
      );
    }
    return (
      <svg height={height} viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="hexGrad" x1="6" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="leafGrad2" x1="14" y1="12" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <rect x="6" y="5" width="40" height="40" rx="12" fill="url(#hexGrad)" stroke="#34D399" strokeWidth="2" />
        <path d="M26 13C33 13 36 19 35 27C34 35 26 37 26 37C26 37 18 35 17 27C16 19 19 13 26 13Z" fill="url(#leafGrad2)" />
        <path d="M26 20C21 23 20 28 26 33C32 28 31 23 26 20Z" fill="#064e3b" fillOpacity="0.4" />
        <text x="60" y="35" fontFamily="monospace, sans-serif" fontSize="28" fontWeight="800" letterSpacing="1.5" fill={textColor}>MINT</text>
        <text x="146" y="24" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="800" letterSpacing="1.5" fill="#10B981">STUDIO</text>
      </svg>
    );
  }

  // Option 3: Folded Origami Ribbon
  if (variant === 3) {
    if (layout === "icon") {
      return (
        <svg height={height} viewBox="0 0 54 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="ribbon1-icon" x1="6" y1="8" x2="28" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="ribbon2-icon" x1="16" y1="6" x2="38" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="ribbon3-icon" x1="28" y1="8" x2="48" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <path d="M8 42L18 8L26 24L18 42H8Z" fill="url(#ribbon1-icon)" />
          <path d="M18 8L27 24L36 8L44 24L36 42H26L34 26L26 12L18 8Z" fill="url(#ribbon2-icon)" />
          <path d="M36 8L46 42H36L28 26L36 8Z" fill="url(#ribbon3-icon)" />
        </svg>
      );
    }
    return (
      <svg height={height} viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="ribbon1" x1="6" y1="8" x2="28" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="ribbon2" x1="16" y1="6" x2="38" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="ribbon3" x1="28" y1="8" x2="48" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path d="M8 42L18 8L26 24L18 42H8Z" fill="url(#ribbon1)" />
        <path d="M18 8L27 24L36 8L44 24L36 42H26L34 26L26 12L18 8Z" fill="url(#ribbon2)" />
        <path d="M36 8L46 42H36L28 26L36 8Z" fill="url(#ribbon3)" />
        <text x="62" y="37" fontFamily="system-ui, sans-serif" fontSize="34" fontWeight="900" letterSpacing="-1" fill={textColor}>mint</text>
        <circle cx="150" cy="33" r="4" fill="#34D399" />
      </svg>
    );
  }

  // Option 4: Growth Sprout & Signal
  if (variant === 4) {
    return (
      <svg height={height} viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="sproutGrad" x1="10" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect x="8" y="26" width="6" height="18" rx="3" fill="#10B981" fillOpacity="0.4" />
        <rect x="18" y="18" width="6" height="26" rx="3" fill="#10B981" fillOpacity="0.75" />
        <path d="M28 44V16C28 16 28 8 36 8C44 8 44 18 36 22C30 25 28 44 28 44Z" fill="url(#sproutGrad)" />
        <path d="M28 24C28 24 23 16 17 18C12 20 14 28 21 29C26 30 28 44 28 44" fill="#34D399" />
        {layout === "full" && (
          <>
            <text x="58" y="36" fontFamily="system-ui, sans-serif" fontSize="30" fontWeight="800" letterSpacing="-0.5" fill={textColor}>Mint</text>
            <text x="130" y="36" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="700" letterSpacing="2" fill="#10B981">.AI</text>
          </>
        )}
      </svg>
    );
  }

  // Option 5: Infinity Mint Loop
  if (variant === 5) {
    return (
      <svg height={height} viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="infGrad" x1="6" y1="12" x2="46" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path
          d="M16 16C9 23 9 33 16 39C23 45 30 36 34 30C38 36 44 41 48 35C52 28 46 17 38 17C30 17 26 26 23 29C20 23 22 10 16 16Z"
          stroke="url(#infGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="20" r="3" fill="#10B981" />
        {layout === "full" && (
          <text x="62" y="37" fontFamily="system-ui, sans-serif" fontSize="32" fontWeight="800" letterSpacing="-0.5" fill={textColor}>mint</text>
        )}
      </svg>
    );
  }

  // Option 6: Neo-Monogram Spark
  return (
    <svg height={height} viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="sparkGrad" x1="12" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="38" height="38" rx="8" fill="#10B981" fillOpacity="0.1" stroke="#10B981" strokeWidth="1.5" />
      <path d="M14 36V18L25 29L36 18V36" stroke="url(#sparkGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 10C38 10 39 15 42 16C39 17 38 22 38 22C38 22 37 17 34 16C37 15 38 10 38 10Z" fill="#34D399" />
      {layout === "full" && (
        <text x="60" y="36" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" letterSpacing="1" fill={textColor}>MINT</text>
      )}
    </svg>
  );
};

export default MintLogo;
