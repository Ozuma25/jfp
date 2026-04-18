"use client";

/**
 * Marigold Toran (flower garland) divider — a festive SVG garland
 * draped between sections. Replaces generic ornamental dividers.
 */

type Props = {
  className?: string;
  variant?: "toran" | "diya" | "rangoli";
};

export function FestiveDivider({ className = "", variant = "toran" }: Props) {
  return (
    <div className={`festive-divider overflow-hidden ${className}`} aria-hidden="true">
      {variant === "toran" && <ToranGarland />}
      {variant === "diya" && <DiyaRow />}
      {variant === "rangoli" && <RangoliStrip />}
    </div>
  );
}

/** Marigold Toran — draped flower garland with leaves and flowers */
function ToranGarland() {
  return (
    <div className="relative w-full flex justify-center py-2 md:py-4">
      <svg viewBox="0 0 1200 120" className="w-full max-w-5xl h-auto" fill="none">
        {/* Main draping thread */}
        <path
          d="M0,20 Q150,100 300,50 Q450,0 600,60 Q750,120 900,50 Q1050,0 1200,20"
          stroke="#C88B2E"
          strokeWidth="2"
          opacity="0.6"
          fill="none"
        />

        {/* Marigold flowers along the garland */}
        {[150, 300, 450, 600, 750, 900, 1050].map((x, i) => {
          // Position along the curve
          const yPositions = [60, 50, 28, 60, 85, 50, 10];
          const y = yPositions[i] || 50;
          const size = i % 2 === 0 ? 14 : 10;
          return (
            <g key={`flower-${x}`} className="festive-flower">
              {/* Outer petals */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <ellipse
                  key={angle}
                  cx={x}
                  cy={y}
                  rx={size}
                  ry={size * 0.35}
                  fill={i % 3 === 0 ? "#E85D2C" : i % 3 === 1 ? "#F0A030" : "#E8A020"}
                  opacity="0.7"
                  transform={`rotate(${angle}, ${x}, ${y})`}
                />
              ))}
              {/* Center of flower */}
              <circle cx={x} cy={y} r={size * 0.3} fill="#C5451A" opacity="0.9" />
            </g>
          );
        })}

        {/* Small leaves between flowers */}
        {[75, 225, 375, 525, 675, 825, 975].map((x, i) => {
          const yPositions = [38, 50, 12, 42, 72, 68, 28];
          const y = yPositions[i] || 40;
          const rot = i % 2 === 0 ? -30 : 30;
          return (
            <g key={`leaf-${x}`}>
              <ellipse
                cx={x}
                cy={y}
                rx={12}
                ry={5}
                fill="#3A8C3F"
                opacity="0.4"
                transform={`rotate(${rot}, ${x}, ${y})`}
              />
              <ellipse
                cx={x + 8}
                cy={y + 6}
                rx={10}
                ry={4}
                fill="#4CAF50"
                opacity="0.3"
                transform={`rotate(${rot + 20}, ${x + 8}, ${y + 6})`}
              />
            </g>
          );
        })}

        {/* Hanging threads with small buds */}
        {[200, 400, 600, 800, 1000].map((x, i) => {
          const yStart = [55, 15, 60, 80, 30][i];
          return (
            <g key={`hang-${x}`}>
              <line
                x1={x}
                y1={yStart}
                x2={x}
                y2={yStart + 22}
                stroke="#C88B2E"
                strokeWidth="1"
                opacity="0.4"
              />
              <circle cx={x} cy={yStart + 24} r={4} fill="#E8A020" opacity="0.5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Row of tiny diyas (oil lamps) */
function DiyaRow() {
  return (
    <div className="relative w-full flex justify-center py-4 md:py-6">
      <svg viewBox="0 0 1000 60" className="w-full max-w-4xl h-auto" fill="none">
        {/* Thread line */}
        <line x1="0" y1="30" x2="1000" y2="30" stroke="#D4AF37" strokeWidth="1" opacity="0.2" />

        {/* Diyas along the line */}
        {[100, 250, 400, 500, 600, 750, 900].map((x, i) => (
          <g key={`diya-${x}`}>
            {/* Diya base */}
            <path
              d={`M${x - 10},35 Q${x},45 ${x + 10},35 Q${x + 10},40 ${x},42 Q${x - 10},40 ${x - 10},35`}
              fill="#C88B2E"
              opacity="0.6"
            />
            {/* Flame */}
            <path
              d={`M${x},25 Q${x + 4},30 ${x},35 Q${x - 4},30 ${x},25`}
              fill="#F59E0B"
              opacity="0.8"
              className="animate-pulse"
            />
            <path
              d={`M${x},28 Q${x + 2},31 ${x},34 Q${x - 2},31 ${x},28`}
              fill="#FBBF24"
              opacity="0.9"
            />
            {/* Glow */}
            <circle cx={x} cy={30} r={8} fill="#FBBF24" opacity="0.08" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Rangoli pattern strip */
function RangoliStrip() {
  return (
    <div className="relative w-full flex justify-center py-4 md:py-6">
      <svg viewBox="0 0 800 50" className="w-full max-w-3xl h-auto" fill="none">
        {/* Center rangoli motif */}
        <g>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <g key={`petal-${angle}`}>
              <ellipse
                cx="400"
                cy="25"
                rx="20"
                ry="6"
                fill={angle % 60 === 0 ? "#E85D2C" : "#F0A030"}
                opacity="0.15"
                transform={`rotate(${angle}, 400, 25)`}
              />
            </g>
          ))}
          <circle cx="400" cy="25" r="8" fill="#D4AF37" opacity="0.3" />
          <circle cx="400" cy="25" r="4" fill="#D4AF37" opacity="0.6" />
          <circle cx="400" cy="25" r="16" stroke="#D4AF37" strokeWidth="0.8" opacity="0.2" fill="none" />
        </g>

        {/* Side dots */}
        {[100, 160, 220, 280, 340, 460, 520, 580, 640, 700].map((x) => (
          <circle key={`dot-${x}`} cx={x} cy="25" r="3" fill="#D4AF37" opacity={x < 400 ? (x / 800) : ((800 - x) / 800)} />
        ))}

        {/* Connecting lines */}
        <line x1="50" y1="25" x2="370" y2="25" stroke="#D4AF37" strokeWidth="0.8" opacity="0.15" />
        <line x1="430" y1="25" x2="750" y2="25" stroke="#D4AF37" strokeWidth="0.8" opacity="0.15" />
      </svg>
    </div>
  );
}
