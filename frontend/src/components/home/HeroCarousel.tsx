"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

const slides = [
  {
    id: 1,
    title: "Gift baskets & hampers",
    subtitle: "Wholesale packaging for every occasion",
    image:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1600&q=80",
    href: "/products?cat=baskets",
  },
  {
    id: 2,
    title: "Baking & party supplies",
    subtitle: "Everything your customers need to celebrate",
    image:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1600&q=80",
    href: "/products?cat=baking",
  },
  {
    id: 3,
    title: "Premium boxes & pouches",
    subtitle: "Elegant packaging at bulk prices",
    image:
      "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1600&q=80",
    href: "/products?cat=packaging",
  },
];

export function HeroCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 8000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[i];

  return (
    <section className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden bg-neutral-900 border-b border-gray-100">
      <div key={i} className="absolute inset-0 animate-in fade-in zoom-in duration-1000">
        <Image
          src={slide.image}
          alt=""
          fill
          className="object-cover transition-transform duration-[8000ms] scale-110 group-hover:scale-100"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div className="max-w-4xl px-4">
           {/* Boutique Label */}
           <p className="text-store-yellow font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs mb-6 animate-in slide-in-from-bottom-2 duration-700">Premium Wholesaler Since 1994</p>
           
           <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif text-white leading-tight mb-8 animate-in slide-in-from-bottom-4 duration-1000">
              {slide.title}
           </h1>
           
           <p className="text-white/80 text-sm md:text-xl font-medium max-w-2xl mx-auto mb-10 animate-in slide-in-from-bottom-6 duration-1000 delay-200">
              {slide.subtitle}
           </p>

           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link
                href={slide.href}
                className="group relative inline-flex items-center gap-2 bg-[#F0C75E] text-black px-10 py-4 text-xs font-bold uppercase tracking-widest shadow-2xl transition-all hover:bg-white hover:text-store-navy"
              >
                Explore Collection
                <span className="text-lg leading-none mt-[-2px] group-hover:translate-x-1 transition-transform">→</span>
              </Link>
           </div>
        </div>
      </div>

      {/* Modern navigation indicators */}
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-3 z-20">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            className={`h-1 rounded-full transition-all duration-500 overflow-hidden ${
              idx === i ? "w-12 bg-store-yellow" : "w-6 bg-white/40"
            }`}
            onClick={() => setI(idx)}
          >
             {idx === i && <div className="h-full bg-white/60 animate-load" style={{ animationDuration: '8000ms' }} />}
          </button>
        ))}
      </div>
      
      {/* Side controls - Minimalist */}
      <div className="absolute inset-x-4 md:inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
         <button onClick={() => setI((x) => (x - 1 + slides.length) % slides.length)} className="p-3 text-white/40 hover:text-white transition-colors pointer-events-auto">
            <IconChevronLeft className="h-10 w-10 md:h-12 md:w-12" />
         </button>
         <button onClick={() => setI((x) => (x + 1) % slides.length)} className="p-3 text-white/40 hover:text-white transition-colors pointer-events-auto">
            <IconChevronRight className="h-10 w-10 md:h-12 md:w-12" />
         </button>
      </div>
    </section>
  );
}
