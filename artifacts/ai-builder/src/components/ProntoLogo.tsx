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
          <stop offset="0%" stopColor="#3730a3" />
          <stop offset="50%" stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="28%" cy="28%" r="55%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-spark`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-sparkg`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width="40" height="40" rx="10" fill={`url(#${id}-bg)`} />
      <rect width="40" height="40" rx="10" fill={`url(#${id}-glow)`} />

      <path
        d="M8 7 L8 26 L13.5 21 L16.5 28.5 L20 27.2 L17 20.5 L24 20.5 Z"
        fill="white"
        fillOpacity="0.92"
      />

      <circle cx="8" cy="7" r="3.5" fill={`url(#${id}-spark)`} filter={`url(#${id}-sparkg)`} />
      <circle cx="8" cy="7" r="1.5" fill="#fef3c7" />

      <rect x="27" y="14" width="9"  height="1.6" rx="0.8" fill="white" fillOpacity="0.28" />
      <rect x="27" y="18" width="7"  height="1.6" rx="0.8" fill="white" fillOpacity="0.22" />
      <rect x="27" y="22" width="8"  height="1.6" rx="0.8" fill="white" fillOpacity="0.16" />
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
