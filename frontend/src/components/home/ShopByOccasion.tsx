"use client";

import Link from "next/link";

/**
 * "Shop by Occasion" — a festive grid of gifting occasions.
 * Each tile has a custom icon, warm gradient background, and a decorative ribbon accent.
 */

const occasions = [
  {
    name: "Diwali",
    emoji: "🪔",
    desc: "Festival of Lights Hampers",
    href: "/products?occasion=diwali",
    gradient: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
  },
  {
    name: "Wedding",
    emoji: "💍",
    desc: "Elegant Return Gifts",
    href: "/products?occasion=wedding",
    gradient: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    iconBg: "bg-rose-100",
  },
  {
    name: "Corporate",
    emoji: "🏢",
    desc: "Professional Gift Boxes",
    href: "/products?occasion=corporate",
    gradient: "from-slate-50 to-blue-50",
    border: "border-slate-200",
    iconBg: "bg-slate-100",
  },
  {
    name: "Birthday",
    emoji: "🎂",
    desc: "Celebration Packages",
    href: "/products?occasion=birthday",
    gradient: "from-purple-50 to-fuchsia-50",
    border: "border-purple-200",
    iconBg: "bg-purple-100",
  },
  {
    name: "Baby Shower",
    emoji: "🍼",
    desc: "Adorable Gift Sets",
    href: "/products?occasion=baby-shower",
    gradient: "from-sky-50 to-cyan-50",
    border: "border-sky-200",
    iconBg: "bg-sky-100",
  },
  {
    name: "Housewarming",
    emoji: "🏠",
    desc: "Home Blessing Hampers",
    href: "/products?occasion=housewarming",
    gradient: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
  },
];

export function ShopByOccasion() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EE] relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-store-button mb-4">
            Every Moment Deserves a Gift
          </p>
          <h2 className="text-3xl md:text-5xl font-serif text-store-navy mb-5">
            Shop by Occasion
          </h2>
          <p className="text-sm md:text-base text-store-navy/50 max-w-lg mx-auto leading-relaxed">
            Curated collections for life&apos;s most cherished celebrations
          </p>
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-store-button/40" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-store-button">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6L8 0Z" fill="currentColor" opacity="0.5" />
            </svg>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-store-button/40" />
          </div>
        </div>

        {/* Occasion Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {occasions.map((occ) => (
            <Link
              key={occ.name}
              href={occ.href}
              className={`group relative bg-gradient-to-br ${occ.gradient} border ${occ.border} rounded-2xl p-6 md:p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden`}
            >
              {/* Decorative ribbon corner */}
              <div className="absolute -top-1 -right-1 w-16 h-16 overflow-hidden">
                <div className="absolute top-[6px] right-[-20px] w-[70px] text-center text-[7px] font-bold uppercase tracking-widest text-white bg-store-button py-[3px] rotate-45 shadow-sm">
                  Gift
                </div>
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${occ.iconBg} flex items-center justify-center mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-500`}>
                <span className="text-2xl md:text-3xl">{occ.emoji}</span>
              </div>

              {/* Text */}
              <h3 className="text-lg md:text-xl font-serif text-store-navy mb-1 group-hover:text-store-button transition-colors duration-300">
                {occ.name}
              </h3>
              <p className="text-[11px] md:text-xs text-store-navy/50 font-medium tracking-wide">
                {occ.desc}
              </p>

              {/* Arrow */}
              <div className="mt-4 flex items-center gap-2 text-store-button opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                <span className="text-[10px] font-bold uppercase tracking-widest">Explore</span>
                <span className="text-sm">→</span>
              </div>

              {/* Background shimmer on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
