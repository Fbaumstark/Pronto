interface ProntoLogoProps {
  size?: number;
  className?: string;
}

export function ProntoLogoMark({ size = 32, className = "" }: ProntoLogoProps) {
  const id = "pl";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="60%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="25%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="40" height="40" rx="10" fill={`url(#${id}-bg)`} />
      <rect width="40" height="40" rx="10" fill={`url(#${id}-shine)`} />

      {/* ── Wizard hat — centered, fills the icon ── */}
      <path
        d="M20 4 L33 27 L7 27 Z"
        fill="white"
        fillOpacity="0.96"
      />

      {/* Hat band */}
      <rect x="7.5" y="25" width="25" height="3.5" rx="1.2" fill="#60a5fa" fillOpacity="0.55" />

      {/* Hat brim */}
      <ellipse cx="20" cy="28.5" rx="16" ry="3.8" fill="white" fillOpacity="0.88" />

      {/* Gold 5-pointed star on hat cone */}
      <path
        d="M20 11 L21 13.8 L24 13.8 L21.6 15.5 L22.5 18.3 L20 16.6 L17.5 18.3 L18.4 15.5 L16 13.8 L19 13.8 Z"
        fill="#fbbf24"
        fillOpacity="0.95"
      />

      {/* Floating sparkle dots */}
      <circle cx="8"  cy="13" r="1.4" fill="#fde68a" fillOpacity="0.65" />
      <circle cx="33" cy="13" r="1.1" fill="#fde68a" fillOpacity="0.55" />
      <circle cx="12" cy="34" r="1"   fill="#fde68a" fillOpacity="0.45" />
    </svg>
  );
}

export function ProntoWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Pronto
    </span>
  );
}
