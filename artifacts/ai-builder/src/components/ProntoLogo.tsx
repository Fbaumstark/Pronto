interface ProntoLogoProps {
  size?: number;
  className?: string;
}

export function ProntoLogoMark({ size = 32, className = "" }: ProntoLogoProps) {
  const id = "pronto-p";

  // ── P shape geometry (viewBox 0 0 40 40) ────────────────────
  // Stem   : x=6..16 (width 10), y=2..38
  // Bowl   : center=(16,14.5), outerR=12.5, innerR=6.25
  //          top y=2, bottom y=27, rightmost x=28.5
  // Color split: x=16 (vertical), y=14.5 (horizontal), gap=1.5
  // ────────────────────────────────────────────────────────────

  const outerP   = "M 6 2 L 16 2 A 12.5 12.5 0 1 1 16 27 L 16 38 L 6 38 Z";
  const innerHole = "M 16 8.25 A 6.25 6.25 0 1 1 16 20.75 Z";

  const halfGap = 0.75;

  // Pre-computed rectangle bounds (with gaps between segments)
  const navy  = { x: 6,     y: 2,     w: 9.25,  h: 11.75 };
  const blue  = { x: 16.75, y: 2,     w: 11.75, h: 11.75 };
  const green = { x: 16.75, y: 15.25, w: 11.75, h: 11.75 };
  const teal  = { x: 6,     y: 15.25, w: 9.25,  h: 22.75 };

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
        <mask id={`${id}-mask`}>
          <path d={outerP}    fill="white" />
          <path d={innerHole} fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${id}-mask)`}>
        {/* Dark navy — upper stem */}
        <rect x={navy.x}  y={navy.y}  width={navy.w}  height={navy.h}  fill="#0d1f5c" />
        {/* Bright blue — upper bowl */}
        <rect x={blue.x}  y={blue.y}  width={blue.w}  height={blue.h}  fill="#1e54d0" />
        {/* Lime green — lower bowl */}
        <rect x={green.x} y={green.y} width={green.w} height={green.h} fill="#6dc52c" />
        {/* Teal/cyan — lower stem */}
        <rect x={teal.x}  y={teal.y}  width={teal.w}  height={teal.h}  fill="#12b8bf" />
      </g>
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

export function ProntoTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs font-medium tracking-wide ${className}`}>
      <span className="text-muted-foreground">idea</span>
      <span className="text-[#12b8bf] mx-1">→</span>
      <span className="text-muted-foreground">words</span>
      <span className="text-[#12b8bf] mx-1">→</span>
      <span className="text-muted-foreground">website / app</span>
    </p>
  );
}

export function ProntoNoCodingBadge({ className = "" }: { className?: string }) {
  return (
    <p className={`font-bold text-foreground ${className}`}>
      No Coding Experience Needed
    </p>
  );
}
