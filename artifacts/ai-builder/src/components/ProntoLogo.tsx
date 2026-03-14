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

      <path
        d="M13 8 L13 28 L18.5 22.5 L21.5 30 L25.5 28.5 L22.5 21 L29 21 Z"
        fill="white"
        fillOpacity="0.95"
      />

      <path
        d="M13 5.5 L14.3 8.5 L13 11.5 L11.7 8.5 Z
           M13 5.5 L16 6.8 L19 5.5 L16 4.2 Z
           M13 11.5 L10 10.2 L7 11.5 L10 12.8 Z
           M19 5.5 L17.7 8.5 L19 11.5 L20.3 8.5 Z"
        fill="#fbbf24"
        filter={`url(#${id}-glow)`}
        opacity="0.95"
      />
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
