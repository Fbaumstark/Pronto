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
        <linearGradient id={`${id}-hat`} x1="20" y1="4" x2="20" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
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

      {/* ── Wizard hat — gold cone ── */}
      <path
        d="M20 4 L33 27 L7 27 Z"
        fill={`url(#${id}-hat)`}
      />

      {/* Hat band — dark amber stripe */}
      <rect x="7.5" y="25" width="25" height="3.5" rx="1.2" fill="#92400e" />

      {/* Hat brim — solid gold */}
      <ellipse cx="20" cy="28.5" rx="16" ry="3.8" fill="#f59e0b" />

      {/* Black 5-pointed star on hat cone */}
      <path
        d="M20 11 L21 13.8 L24 13.8 L21.6 15.5 L22.5 18.3 L20 16.6 L17.5 18.3 L18.4 15.5 L16 13.8 L19 13.8 Z"
        fill="#0f172a"
      />

      {/* Floating sparkle dots */}
      <circle cx="8"  cy="13" r="1.4" fill="#fde68a" fillOpacity="0.7" />
      <circle cx="33" cy="13" r="1.1" fill="#fde68a" fillOpacity="0.6" />
      <circle cx="12" cy="34" r="1"   fill="#fde68a" fillOpacity="0.5" />
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
