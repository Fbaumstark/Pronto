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

      {/* ── Wizard hat — large & centered ── */}
      <path
        d="M19 4 L31 25 L7 25 Z"
        fill="white"
        fillOpacity="0.96"
      />

      {/* Hat band */}
      <rect x="7.5" y="23" width="23.5" height="3.2" rx="1" fill="#60a5fa" fillOpacity="0.5" />

      {/* Hat brim */}
      <ellipse cx="19" cy="26.5" rx="15" ry="3.5" fill="white" fillOpacity="0.85" />

      {/* ── Wand from brim-right to upper-right corner ── */}
      <line x1="32" y1="26" x2="37" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9" />

      {/* Wand tip glow halo */}
      <circle cx="37" cy="13" r="5" fill="#fbbf24" fillOpacity="0.22" filter={`url(#${id}-glow)`} />

      {/* Big sparkle — 4-pointed star at wand tip */}
      <path
        d="M37 8 L38.4 11.6 L40 13 L38.4 14.4 L37 18 L35.6 14.4 L32 13 L35.6 11.6 Z"
        fill="#fde68a"
        filter={`url(#${id}-glow)`}
      />
      <path
        d="M37 10 L38 12.2 L40 13 L38 13.8 L37 16 L36 13.8 L34 13 L36 12.2 Z"
        fill="#fef9c3"
      />

      {/* Small gold star on hat cone */}
      <path
        d="M17 13 L17.6 14.9 L19.5 14.9 L18 16 L18.5 17.9 L17 16.8 L15.5 17.9 L16 16 L14.5 14.9 L16.4 14.9 Z"
        fill="#fbbf24"
        fillOpacity="0.9"
      />

      {/* Floating sparkle dots */}
      <circle cx="6"  cy="15" r="1.3" fill="#fde68a" fillOpacity="0.6" />
      <circle cx="10" cy="32" r="1"   fill="#fde68a" fillOpacity="0.5" />
      <circle cx="27" cy="9"  r="0.9" fill="#fde68a" fillOpacity="0.55" />
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
