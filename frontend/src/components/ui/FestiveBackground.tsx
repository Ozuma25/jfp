/**
 * FestiveBackground — Subtle watermark patterns rendered behind sections.
 * Adds diyas, gift boxes, rangoli dots at very low opacity (3-5%).
 * Purely decorative — no impact on content readability.
 */

type Props = {
  variant?: "gifts" | "diyas" | "rangoli" | "marigold";
  className?: string;
};

export function FestiveBackground({ variant = "gifts", className = "" }: Props) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      {variant === "gifts" && <GiftPattern />}
      {variant === "diyas" && <DiyaPattern />}
      {variant === "rangoli" && <RangoliPattern />}
      {variant === "marigold" && <MarigoldPattern />}
    </div>
  );
}

/** Scattered gift box silhouettes */
function GiftPattern() {
  const gifts = [
    { x: 5, y: 10, size: 40, rot: -15 },
    { x: 90, y: 15, size: 35, rot: 10 },
    { x: 15, y: 75, size: 30, rot: 20 },
    { x: 85, y: 80, size: 45, rot: -8 },
    { x: 50, y: 5, size: 25, rot: 12 },
    { x: 45, y: 90, size: 32, rot: -20 },
    { x: 75, y: 45, size: 28, rot: 5 },
    { x: 8, y: 45, size: 35, rot: -12 },
    { x: 95, y: 50, size: 30, rot: 18 },
  ];

  return (
    <>
      {gifts.map((g, i) => (
        <svg
          key={`gift-${i}`}
          className="absolute"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.size}px`,
            height: `${g.size}px`,
            transform: `rotate(${g.rot}deg)`,
            opacity: 0.17,
          }}
          viewBox="0 0 40 40"
          fill="none"
        >
          {/* Gift box */}
          <rect x="5" y="15" width="30" height="22" rx="2" fill="#D4AF37" />
          {/* Lid */}
          <rect x="3" y="12" width="34" height="6" rx="1" fill="#C59B27" />
          {/* Ribbon vertical */}
          <rect x="17" y="12" width="6" height="25" fill="#E85D2C" />
          {/* Ribbon horizontal */}
          <rect x="3" y="22" width="34" height="5" fill="#E85D2C" />
          {/* Bow */}
          <path d="M20,12 Q14,4 10,8 Q14,12 20,12Z" fill="#E85D2C" />
          <path d="M20,12 Q26,4 30,8 Q26,12 20,12Z" fill="#E85D2C" />
          <circle cx="20" cy="12" r="2" fill="#C41E3A" />
        </svg>
      ))}
    </>
  );
}

/** Scattered diya silhouettes with glow dots */
function DiyaPattern() {
  const diyas = [
    { x: 8, y: 12 },
    { x: 92, y: 8 },
    { x: 5, y: 85 },
    { x: 88, y: 88 },
    { x: 50, y: 6 },
    { x: 30, y: 92 },
    { x: 70, y: 92 },
    { x: 95, y: 50 },
    { x: 3, y: 50 },
  ];

  return (
    <>
      {diyas.map((d, i) => (
        <svg
          key={`diya-${i}`}
          className="absolute"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: "30px",
            height: "30px",
            opacity: 0.17,
          }}
          viewBox="0 0 30 30"
          fill="none"
        >
          {/* Diya bowl */}
          <path d="M5,18 Q15,28 25,18 Q25,22 15,24 Q5,22 5,18" fill="#D4AF37" />
          {/* Flame */}
          <path d="M15,5 Q20,12 15,18 Q10,12 15,5" fill="#F59E0B" />
          <path d="M15,8 Q18,13 15,16 Q12,13 15,8" fill="#FBBF24" />
        </svg>
      ))}
    </>
  );
}

/** Rangoli dot patterns in corners */
function RangoliPattern() {
  return (
    <>
      {/* Top-left corner rangoli */}
      <svg className="absolute top-0 left-0 w-32 h-32 md:w-48 md:h-48" viewBox="0 0 200 200" fill="none" style={{ opacity: 0.20 }}>
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <g key={`tl-${angle}`}>
            <circle cx={50 + Math.cos(angle * Math.PI / 180) * 30} cy={50 + Math.sin(angle * Math.PI / 180) * 30} r="4" fill="#D4AF37" />
            <circle cx={50 + Math.cos(angle * Math.PI / 180) * 50} cy={50 + Math.sin(angle * Math.PI / 180) * 50} r="3" fill="#E85D2C" />
          </g>
        ))}
        <circle cx="50" cy="50" r="8" fill="#D4AF37" />
        <circle cx="50" cy="50" r="18" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
      </svg>

      {/* Bottom-right corner rangoli */}
      <svg className="absolute bottom-0 right-0 w-32 h-32 md:w-48 md:h-48" viewBox="0 0 200 200" fill="none" style={{ opacity: 0.20 }}>
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <g key={`br-${angle}`}>
            <circle cx={150 + Math.cos(angle * Math.PI / 180) * 30} cy={150 + Math.sin(angle * Math.PI / 180) * 30} r="4" fill="#D4AF37" />
            <circle cx={150 + Math.cos(angle * Math.PI / 180) * 50} cy={150 + Math.sin(angle * Math.PI / 180) * 50} r="3" fill="#E85D2C" />
          </g>
        ))}
        <circle cx="150" cy="150" r="8" fill="#D4AF37" />
        <circle cx="150" cy="150" r="18" stroke="#D4AF37" strokeWidth="1.5" fill="none" />
      </svg>
    </>
  );
}

/** Scattered marigold flower silhouettes */
function MarigoldPattern() {
  const flowers = [
    { x: 3, y: 8, size: 45 },
    { x: 92, y: 12, size: 50 },
    { x: 6, y: 82, size: 40 },
    { x: 90, y: 85, size: 48 },
    { x: 48, y: 3, size: 35 },
    { x: 52, y: 95, size: 38 },
  ];

  return (
    <>
      {flowers.map((f, i) => (
        <svg
          key={`marigold-${i}`}
          className="absolute"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            opacity: 0.15,
          }}
          viewBox="0 0 50 50"
          fill="none"
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <ellipse
              key={angle}
              cx="25"
              cy="25"
              rx="12"
              ry="5"
              fill={angle % 60 === 0 ? "#E85D2C" : "#F0A030"}
              transform={`rotate(${angle}, 25, 25)`}
            />
          ))}
          <circle cx="25" cy="25" r="5" fill="#C5451A" />
        </svg>
      ))}
    </>
  );
}
