"use client";

import Link from "next/link";

/**
 * "Shop by Occasion" — a festive grid of gifting occasions.
 * Each tile has a custom icon, warm gradient background, and a decorative ribbon accent.
 */

/**
 * Animated SVG Components for Occasions
 */
const AnimatedDiwali = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
    <path d="M20,60 Q50,90 80,60 Q80,75 50,85 Q20,75 20,60" fill="#D97706" />
    <path d="M25,62 Q50,82 75,62 Q75,70 50,78 Q25,70 25,62" fill="#B45309" />
    <g className="animate-pulse origin-bottom">
      <path d="M50,20 Q65,45 50,60 Q35,45 50,20" fill="#FBBF24" />
      <path d="M50,30 Q60,45 50,55 Q40,45 50,30" fill="#F59E0B" />
    </g>
    <style jsx>{`
      @keyframes flame {
        0%, 100% { transform: scale(1) translateY(0); opacity: 1; }
        50% { transform: scale(1.1) translateY(-2px); opacity: 0.8; }
      }
      .animate-pulse { animation: flame 1.5s infinite ease-in-out; }
    `}</style>
  </svg>
);

const AnimatedWedding = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
    <circle cx="50" cy="65" r="25" fill="none" stroke="#94A3B8" strokeWidth="6" />
    <path d="M50,20 L35,40 L50,60 L65,40 Z" fill="#38BDF8" className="animate-sparkle" />
    <circle cx="50" cy="40" r="15" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.3" />
    <style jsx>{`
      @keyframes sparkle {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.1); filter: brightness(1.5); }
      }
      .animate-sparkle { animation: sparkle 2s infinite ease-in-out; transform-origin: center; }
    `}</style>
  </svg>
);

const AnimatedCorporate = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
    <rect x="25" y="20" width="50" height="70" fill="#1E293B" rx="4" />
    <g className="fill-blue-400">
      <rect x="35" y="30" width="10" height="10" rx="1" className="window-1" />
      <rect x="55" y="30" width="10" height="10" rx="1" className="window-2" />
      <rect x="35" y="50" width="10" height="10" rx="1" className="window-2" />
      <rect x="55" y="50" width="10" height="10" rx="1" className="window-1" />
      <rect x="35" y="70" width="10" height="10" rx="1" className="window-1" />
      <rect x="55" y="70" width="10" height="10" rx="1" className="window-2" />
    </g>
    <style jsx>{`
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      .window-1 { animation: blink 3s infinite ease-in-out; }
      .window-2 { animation: blink 4s infinite ease-in-out 1s; }
    `}</style>
  </svg>
);

const AnimatedBirthday = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
    <rect x="20" y="55" width="60" height="30" fill="#F472B6" rx="4" />
    <rect x="25" y="58" width="50" height="6" fill="#FBCFE8" rx="2" />
    <rect x="47" y="35" width="6" height="20" fill="#FBBF24" />
    <g className="animate-flicker">
      <path d="M50,15 Q60,25 50,35 Q40,25 50,15" fill="#F59E0B" />
    </g>
    <style jsx>{`
      @keyframes flicker {
        0%, 100% { transform: scale(1) rotate(-1deg); opacity: 1; }
        50% { transform: scale(1.2) rotate(1deg); opacity: 0.8; }
      }
      .animate-flicker { animation: flicker 0.8s infinite ease-in-out; transform-origin: bottom; }
    `}</style>
  </svg>
);

const AnimatedBabyShower = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2 origin-center animate-rock">
    <rect x="30" y="40" width="40" height="40" rx="8" fill="#7DD3FC" />
    <rect x="35" y="30" width="30" height="12" rx="4" fill="#60A5FA" />
    <circle cx="50" cy="25" r="8" fill="#FDBA74" />
    <path d="M40,55 L60,55" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
    <style jsx>{`
      @keyframes rock {
        0%, 100% { transform: rotate(-5deg); }
        50% { transform: rotate(5deg); }
      }
      .animate-rock { animation: rock 3s infinite ease-in-out; }
    `}</style>
  </svg>
);

const AnimatedHousewarming = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-2">
    <path d="M20,50 L50,20 L80,50 V85 H20 Z" fill="#34D399" />
    <rect x="65" y="25" width="10" height="15" fill="#065F46" />
    <rect x="42" y="60" width="16" height="25" fill="#064E3B" />
    <g className="animate-smoke">
      <circle cx="70" cy="15" r="4" fill="#94A3B8" />
      <circle cx="75" cy="5" r="3" fill="#94A3B8" opacity="0.6" />
    </g>
    <style jsx>{`
      @keyframes smoke {
        0% { transform: translateY(5px); opacity: 0; }
        50% { transform: translateY(-5px); opacity: 0.5; }
        100% { transform: translateY(-15px); opacity: 0; }
      }
      .animate-smoke { animation: smoke 2.5s infinite linear; }
    `}</style>
  </svg>
);

const occasions = [
  {
    name: "Diwali",
    icon: <AnimatedDiwali />,
    desc: "Festive Hampers",
    href: "/products?occasion=diwali",
    accent: "text-amber-600",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
  },
  {
    name: "Wedding",
    icon: <AnimatedWedding />,
    desc: "Return Gifts",
    href: "/products?occasion=wedding",
    accent: "text-rose-600",
    bg: "bg-rose-50/50",
    border: "border-rose-100",
  },
  {
    name: "Corporate",
    icon: <AnimatedCorporate />,
    desc: "Gift Boxes",
    href: "/products?occasion=corporate",
    accent: "text-slate-600",
    bg: "bg-slate-50/50",
    border: "border-slate-100",
  },
  {
    name: "Birthday",
    icon: <AnimatedBirthday />,
    desc: "Celebrations",
    href: "/products?occasion=birthday",
    accent: "text-pink-600",
    bg: "bg-pink-50/50",
    border: "border-pink-100",
  },
  {
    name: "Baby Shower",
    icon: <AnimatedBabyShower />,
    desc: "Adorable Sets",
    href: "/products?occasion=baby-shower",
    accent: "text-sky-600",
    bg: "bg-sky-50/50",
    border: "border-sky-100",
  },
  {
    name: "Housewarming",
    icon: <AnimatedHousewarming />,
    desc: "Home Blessing",
    href: "/products?occasion=housewarming",
    accent: "text-emerald-600",
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
  },
];

export function ShopByOccasion() {
  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EE] relative overflow-hidden border-y border-store-button/10">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 30L30 0M30 30L60 30M30 30L30 60M30 30L0 30' stroke='%23D4AF37' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:items-center">
          
          {/* Section Header - Sidebar Style on Desktop */}
          <div className="lg:w-1/3 text-center lg:text-left">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-store-button mb-4 bg-store-button/5 inline-block px-3 py-1 rounded-full">
              Gift for Every Moment
            </p>
            <h2 className="text-3xl md:text-5xl font-serif text-store-navy mb-5 leading-tight">
              Shop by <span className="text-store-button italic">Occasion</span>
            </h2>
            <p className="text-sm md:text-base text-store-navy/60 max-w-sm mx-auto lg:mx-0 leading-relaxed mb-8">
              Curated collections specifically designed for life&apos;s most cherished celebrations and gifting traditions.
            </p>
            
            <Link 
              href="/products" 
              className="hidden lg:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-store-navy hover:text-store-button transition-colors group"
            >
              Browse all collections
              <span className="w-8 h-[1px] bg-store-navy group-hover:bg-store-button group-hover:w-12 transition-all duration-300" />
            </Link>
          </div>

          {/* Occasion Grid - More Compact Tiles */}
          <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {occasions.map((occ) => (
              <Link
                key={occ.name}
                href={occ.href}
                className={`group relative ${occ.bg} border ${occ.border} rounded-xl p-4 md:p-5 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 overflow-hidden bg-white/40 backdrop-blur-sm`}
              >
                {/* Clean Gift Badge */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${occ.accent}`}>Gift</span>
                </div>

                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-white shadow-sm border ${occ.border} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500 overflow-hidden`}>
                    {occ.icon}
                  </div>

                  {/* Text */}
                  <h3 className="text-base md:text-lg font-serif text-store-navy group-hover:text-store-button transition-colors duration-300">
                    {occ.name}
                  </h3>
                  <p className="text-[10px] md:text-[11px] text-store-navy/40 font-medium tracking-wide">
                    {occ.desc}
                  </p>
                </div>

                {/* Subtle Progress Bar on Hover */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-store-button group-hover:w-full transition-all duration-700" />
              </Link>
            ))}
          </div>

          {/* Mobile View All */}
          <div className="lg:hidden text-center pt-4">
             <Link href="/products" className="text-xs font-bold uppercase tracking-widest text-store-navy underline decoration-store-button underline-offset-8">
               View All Occasions
             </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
