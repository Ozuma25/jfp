"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

const slides = [
  {
    id: "01",
    label: "✨ Festive Gifting Collection",
    title: "Make Every Celebration Legendary",
    subtitle: "Hand-curated gift hampers & luxury packaging for India's most cherished festivals.",
    img: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1600&q=100",
    cta: "Explore Festive Gifts",
    href: "/products",
  },
  {
    id: "02",
    label: "💍 Weddings & Grand Events",
    title: "Unforgettable Return Gifts",
    subtitle: "Bespoke gift sets that leave a lasting impression on every guest.",
    img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&q=100",
    cta: "Shop Wedding Collection",
    href: "/products?occasion=wedding",
  },
  {
    id: "03",
    label: "🎀 The Ribbon Atelier",
    title: "The Perfect Finishing Touch",
    subtitle: "Silk, satin & metallic ribbons to wrap your celebrations in elegance.",
    img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=1600&q=100",
    cta: "Shop Ribbons",
    href: "/products?cat=ribbons",
  },
];

export function HeroCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setActiveIdx((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className="relative w-full h-[75vh] md:h-[85vh] min-h-[500px] overflow-hidden bg-store-navy group">
      
      {/* 1. Background Slider with Crossfade & Slow Ken Burns */}
      {slides.map((slide, index) => {
        const isActive = index === activeIdx;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
             {/* The Image */}
             <div className="absolute inset-0 bg-black">
                <Image
                   src={slide.img}
                   alt={slide.title}
                   fill
                   priority={isActive}
                   className={`object-cover transition-transform duration-[10000ms] ease-linear ${
                     isActive ? "scale-105" : "scale-100"
                   }`}
                />
             </div>
             
             {/* Warm golden vignette overlay — gives festive warmth */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-amber-950/20 to-black/50" />
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-amber-900/10 to-black/70 mix-blend-multiply" />
          </div>
        );
      })}

      {/* Decorative floating elements — small sparkles */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <div className="hero-sparkle" style={{ top: '15%', left: '10%', animationDelay: '0s' }} />
        <div className="hero-sparkle" style={{ top: '25%', right: '15%', animationDelay: '1.5s' }} />
        <div className="hero-sparkle" style={{ top: '60%', left: '20%', animationDelay: '3s' }} />
        <div className="hero-sparkle" style={{ top: '70%', right: '25%', animationDelay: '0.8s' }} />
        <div className="hero-sparkle" style={{ top: '40%', left: '75%', animationDelay: '2.2s' }} />
      </div>

      {/* 2. Foreground Typography (Perfectly Centered) */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center pointer-events-none px-4 md:px-12">
         <div className="max-w-4xl pointer-events-auto flex flex-col items-center">
            
            {/* Slide Sub-label */}
            <div className="overflow-hidden mb-6">
              <div 
                key={`label-${activeIdx}`} 
                className="animate-in slide-in-from-bottom-4 fade-in duration-700"
              >
                <span className="px-5 py-1.5 border border-white/20 rounded-full backdrop-blur-sm bg-white/5 text-store-yellow font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
                  {slides[activeIdx].label}
                </span>
              </div>
            </div>

            {/* Slide Title */}
            <div className="overflow-hidden mb-6">
               <h1 
                 key={`title-${activeIdx}`} 
                 className="text-5xl md:text-6xl lg:text-[80px] font-serif text-white leading-[1.05] tracking-tight animate-in slide-in-from-bottom-8 fade-in duration-1000 drop-shadow-xl"
               >
                 {slides[activeIdx].title}
               </h1>
            </div>

            {/* Slide Description */}
            <div className="overflow-hidden mb-10">
               <p 
                 key={`desc-${activeIdx}`} 
                 className="text-white/90 text-sm md:text-lg lg:text-xl font-medium leading-relaxed max-w-2xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150 drop-shadow-md"
               >
                 {slides[activeIdx].subtitle}
               </p>
            </div>

            {/* Slide CTA Button */}
            <div className="overflow-hidden">
               <div key={`cta-${activeIdx}`} className="animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 inline-block">
                  <Link 
                     href={slides[activeIdx].href}
                     className="group/btn relative inline-flex items-center justify-center bg-[#F0C75E] text-black px-12 py-5 rounded-sm font-bold uppercase tracking-[0.2em] text-xs overflow-hidden transition-colors hover:bg-white shadow-2xl"
                  >
                     {/* Button Internal Light Sweep */}
                     <div className="absolute inset-0 -translate-x-full bg-white/40 group-hover/btn:animate-[shimmer_1s_forwards] skew-x-[30deg]" />
                     <span className="relative z-10 flex items-center gap-3">
                        {slides[activeIdx].cta}
                        <span className="text-lg leading-none mt-[-2px] group-hover/btn:translate-x-1.5 transition-transform duration-300">→</span>
                     </span>
                  </Link>
               </div>
            </div>

         </div>
      </div>

      {/* 3. Floating Edge Navigation controls */}
      <div className="absolute inset-y-0 w-full flex items-center justify-between px-4 md:px-8 z-40 pointer-events-none">
         <button 
            onClick={prevSlide}
            className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-white hover:text-store-navy transition-all duration-300 pointer-events-auto opacity-0 md:opacity-100 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
            aria-label="Previous Slide"
         >
            <IconChevronLeft className="w-6 h-6" />
         </button>
         <button 
            onClick={nextSlide}
            className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full border border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-white hover:text-store-navy transition-all duration-300 pointer-events-auto opacity-0 md:opacity-100 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
            aria-label="Next Slide"
         >
            <IconChevronRight className="w-6 h-6" />
         </button>
      </div>

      {/* Modern Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 z-40">
        {slides.map((_, idx) => (
          <button
            key={`dot-${idx}`}
            onClick={() => setActiveIdx(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-[3px] rounded-full transition-all duration-500 shadow-sm ${
              idx === activeIdx ? "w-12 bg-store-yellow" : "w-6 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
         @keyframes shimmer {
            100% { transform: translateX(200%); }
         }
         .hero-sparkle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: radial-gradient(circle, #F0C75E, transparent 70%);
            box-shadow: 0 0 8px 2px rgba(240, 199, 94, 0.4);
            animation: sparkle-twinkle 3s ease-in-out infinite;
         }
         @keyframes sparkle-twinkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
         }
      `}} />
    </section>
  );
}
