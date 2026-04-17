/**
 * Ornamental SVG dividers for section separation.
 * Three variants: paisley (default), floral, classic.
 * All rendered as inline SVGs — no external assets needed.
 */

type Props = {
  variant?: "paisley" | "floral" | "classic";
  className?: string;
  color?: string;
};

export function OrnamentalDivider({
  variant = "paisley",
  className = "",
  color = "#D4AF37",
}: Props) {
  return (
    <div
      className={`ornamental-divider flex items-center justify-center py-8 md:py-12 ${className}`}
      aria-hidden="true"
    >
      {variant === "paisley" && <PaisleyDivider color={color} />}
      {variant === "floral" && <FloralDivider color={color} />}
      {variant === "classic" && <ClassicDivider color={color} />}
    </div>
  );
}

function PaisleyDivider({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 600 40"
      className="w-full max-w-xl h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left decorative curl */}
      <path
        d="M50 20 C80 5, 120 5, 150 20 C120 35, 80 35, 50 20Z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M50 20 C80 10, 120 10, 150 20"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.5"
      />
      {/* Left line */}
      <line x1="0" y1="20" x2="45" y2="20" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* Center diamond motif */}
      <path
        d="M270 8 L300 2 L330 8 L300 14Z"
        fill={color}
        opacity="0.2"
      />
      <path
        d="M280 26 L300 20 L320 26 L300 32Z"
        fill={color}
        opacity="0.2"
      />
      <circle cx="300" cy="20" r="4" fill={color} opacity="0.6" />
      <circle cx="300" cy="20" r="8" stroke={color} strokeWidth="1" opacity="0.3" fill="none" />
      {/* Connecting lines */}
      <line x1="155" y1="20" x2="265" y2="20" stroke={color} strokeWidth="1" opacity="0.2" />
      <line x1="335" y1="20" x2="445" y2="20" stroke={color} strokeWidth="1" opacity="0.2" />
      {/* Right decorative curl (mirrored) */}
      <path
        d="M550 20 C520 5, 480 5, 450 20 C480 35, 520 35, 550 20Z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M550 20 C520 10, 480 10, 450 20"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.5"
      />
      {/* Right line */}
      <line x1="555" y1="20" x2="600" y2="20" stroke={color} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function FloralDivider({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 600 50"
      className="w-full max-w-xl h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left stem */}
      <path
        d="M30 25 Q150 25, 230 25"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Left leaves */}
      <ellipse cx="100" cy="25" rx="20" ry="8" fill={color} opacity="0.1" transform="rotate(-20, 100, 25)" />
      <ellipse cx="160" cy="25" rx="18" ry="7" fill={color} opacity="0.1" transform="rotate(15, 160, 25)" />
      {/* Center flower */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="300"
          cy="25"
          rx="18"
          ry="6"
          fill={color}
          opacity="0.12"
          transform={`rotate(${angle}, 300, 25)`}
        />
      ))}
      <circle cx="300" cy="25" r="5" fill={color} opacity="0.5" />
      <circle cx="300" cy="25" r="10" stroke={color} strokeWidth="0.8" opacity="0.25" fill="none" />
      {/* Right stem */}
      <path
        d="M370 25 Q450 25, 570 25"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Right leaves */}
      <ellipse cx="440" cy="25" rx="18" ry="7" fill={color} opacity="0.1" transform="rotate(-15, 440, 25)" />
      <ellipse cx="500" cy="25" rx="20" ry="8" fill={color} opacity="0.1" transform="rotate(20, 500, 25)" />
    </svg>
  );
}

function ClassicDivider({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 600 30"
      className="w-full max-w-xl h-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left art-deco fans */}
      <path d="M60 15 L90 5 L90 25Z" fill={color} opacity="0.12" />
      <path d="M100 15 L120 8 L120 22Z" fill={color} opacity="0.12" />
      {/* Left line */}
      <line x1="0" y1="15" x2="55" y2="15" stroke={color} strokeWidth="1" opacity="0.2" />
      <line x1="125" y1="15" x2="260" y2="15" stroke={color} strokeWidth="1" opacity="0.2" />
      {/* Center ornament */}
      <path
        d="M280 15 L300 3 L320 15 L300 27Z"
        stroke={color}
        strokeWidth="1.2"
        opacity="0.4"
        fill={color}
        fillOpacity="0.1"
      />
      <circle cx="300" cy="15" r="3" fill={color} opacity="0.5" />
      {/* Right line */}
      <line x1="340" y1="15" x2="475" y2="15" stroke={color} strokeWidth="1" opacity="0.2" />
      {/* Right art-deco fans (mirrored) */}
      <path d="M540 15 L510 5 L510 25Z" fill={color} opacity="0.12" />
      <path d="M500 15 L480 8 L480 22Z" fill={color} opacity="0.12" />
      <line x1="545" y1="15" x2="600" y2="15" stroke={color} strokeWidth="1" opacity="0.2" />
    </svg>
  );
}
