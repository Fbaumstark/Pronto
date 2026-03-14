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

      {/* Handle cap */}
      <circle cx="8.5" cy="33.5" r="2.8" fill="white" fillOpacity="0.35" />

      {/* Wand rod */}
      <line x1="8.5" y1="33.5" x2="26" y2="16" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.92" />

      {/* Glow halo at wand tip */}
      <circle cx="26" cy="16" r="5.5" fill="#fbbf24" fillOpacity="0.18" filter={`url(#${id}-glow)`} />

      {/* Main 4-pointed sparkle star at wand tip */}
      <path
        d="M26 11 L27.5 14.5 L31 16 L27.5 17.5 L26 21 L24.5 17.5 L21 16 L24.5 14.5 Z"
        fill="#fde68a"
        filter={`url(#${id}-glow)`}
      />
      <path
        d="M26 12.5 L27 15 L29.5 16 L27 17 L26 19.5 L25 17 L22.5 16 L25 15 Z"
        fill="#fef3c7"
      />

      {/* Small scattered sparkle dots */}
      <circle cx="34" cy="9"  r="1.5" fill="#fde68a" fillOpacity="0.75" />
      <circle cx="33" cy="25" r="1"   fill="#fde68a" fillOpacity="0.55" />
      <circle cx="15" cy="10" r="0.9" fill="#fde68a" fillOpacity="0.45" />
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
