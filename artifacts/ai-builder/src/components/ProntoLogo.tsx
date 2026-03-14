interface ProntoLogoProps {
  size?: number;
  className?: string;
}

export function ProntoLogoMark({ size = 32, className = "" }: ProntoLogoProps) {
  const id = "pronto-p";

  // ── P shape geometry ──────────────────────────────────────────────────────
  // viewBox : 0 0 40 40
  // Stem    : x=5..15 (width 10), y=2..38
  // Bowl    : center=(15,15), outerR=13, innerR=6.5
  //           top y=2, bottom y=28, rightmost x=28
  //
  // Color-split lines:
  //   Vertical   → x = 21.5  (midpoint between stem-edge x=15 and rightmost x=28)
  //   Horizontal → y = 15    (bowl center)
  //
  // This gives navy+teal the LEFT side (stem + left arc)
  //              blue+green the RIGHT arc accent
  // ─────────────────────────────────────────────────────────────────────────

  const outerP    = "M 5 2 L 15 2 A 13 13 0 1 1 15 28 L 15 38 L 5 38 Z";
  const innerHole = "M 15 8.5 A 6.5 6.5 0 1 1 15 21.5 Z";

  const g = 0.8; // half-gap — dark gap visible between segments

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
        {/* Dark navy — upper-left (stem top + left arc of upper bowl) */}
        <rect x={0}        y={0}      width={21.5 - g} height={15 - g}  fill="#0e2057" />

        {/* Bright blue — upper-right arc (right accent of upper bowl) */}
        <rect x={21.5 + g} y={0}      width={19}       height={15 - g}  fill="#1e54d0" />

        {/* Lime green — lower-right arc (right accent of lower bowl) */}
        <rect x={21.5 + g} y={15 + g} width={19}       height={25}      fill="#6dc52c" />

        {/* Teal/cyan — lower-left (stem bottom + left arc of lower bowl) */}
        <rect x={0}        y={15 + g} width={21.5 - g} height={25}      fill="#12b8bf" />
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

export function ProntoTagline({
  className = "",
  center = false,
}: {
  className?: string;
  center?: boolean;
}) {
  return (
    <p
      className={`text-xs font-medium tracking-wide whitespace-nowrap ${
        center ? "text-center" : ""
      } ${className}`}
    >
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
