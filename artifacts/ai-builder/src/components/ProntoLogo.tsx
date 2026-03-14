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
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
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

      {/* ── Wizard hat cone ── */}
      <path
        d="M16 6 L26 21 L6 21 Z"
        fill="white"
        fillOpacity="0.92"
      />

      {/* Hat band */}
      <rect x="6.5" y="19.5" width="19" height="2.8" rx="1" fill="#a5b4fc" fillOpacity="0.55" />

      {/* Hat brim */}
      <ellipse cx="16" cy="22" rx="12" ry="2.8" fill="white" fillOpacity="0.78" />

      {/* Small star on hat */}
      <path
        d="M14 11.5 L14.7 13.3 L16.6 13.3 L15.1 14.4 L15.7 16.2 L14 15.1 L12.3 16.2 L12.9 14.4 L11.4 13.3 L13.3 13.3 Z"
        fill="#fbbf24"
        fillOpacity="0.85"
      />

      {/* ── Wand (from hat brim right, angling upper-right) ── */}
      <line x1="26" y1="21" x2="34.5" y2="12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.88" />

      {/* Wand tip glow */}
      <circle cx="34.5" cy="12" r="4.5" fill="#fbbf24" fillOpacity="0.2" filter={`url(#${id}-glow)`} />

      {/* Sparkle 4-pointed star at wand tip */}
      <path
        d="M34.5 7.5 L35.7 11 L39 12 L35.7 13 L34.5 16.5 L33.3 13 L30 12 L33.3 11 Z"
        fill="#fde68a"
        filter={`url(#${id}-glow)`}
      />
      <path
        d="M34.5 9 L35.4 11.2 L37.5 12 L35.4 12.8 L34.5 15 L33.6 12.8 L31.5 12 L33.6 11.2 Z"
        fill="#fef9c3"
      />

      {/* Small floating sparkle dots */}
      <circle cx="7"  cy="30" r="1.2" fill="#fde68a" fillOpacity="0.55" />
      <circle cx="28" cy="7"  r="1"   fill="#fde68a" fillOpacity="0.6"  />
      <circle cx="22" cy="30" r="0.8" fill="#fde68a" fillOpacity="0.45" />
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
