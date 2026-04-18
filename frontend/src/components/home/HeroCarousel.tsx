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
    imgDesktop: "/images/banners/banner1.jpeg",
    imgMobile: "/images/banners/banner1_mobile.jpeg",
    cta: "Explore Festive Gifts",
    href: "/products",
  },
  {
    id: "02",
    label: "💍 Weddings & Grand Events",
    title: "Unforgettable Return Gifts",
    subtitle: "Bespoke gift sets that leave a lasting impression on every guest.",
    imgDesktop: "/images/banners/banner2.jpeg",
    imgMobile: "/images/banners/banner2_mobile.jpeg",
    cta: "Shop Wedding Collection",
    href: "/products?occasion=wedding",
  },
  {
    id: "03",
    label: "🎀 Premium Collections",
    title: "The Perfect Finishing Touch",
    subtitle: "Exquisite packaging crafted to make every gift unforgettable.",
    imgDesktop: "/images/banners/banner3.jpeg",
    imgMobile: "/images/banners/banner3_mobile.jpeg",
    cta: "Explore Collections",
    href: "/products",
  },
];

export function HeroCarousel() {
  const [activeIdxState, setActiveIdx] = useState(0);
  const activeIdx = activeIdxState >= slides.length ? 0 : activeIdxState;

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
             {/* The Images (Responsive Desktop/Mobile) */}
             <div className="absolute inset-0 bg-black">
                {/* Desktop Image */}
                <Image
                   src={slide.imgDesktop}
                   alt={slide.title}
                   fill
                   priority={false}
                   className={`hidden md:block object-cover transition-transform duration-[10000ms] ease-linear ${
                     isActive ? "scale-105" : "scale-100"
                   }`}
                />
                {/* Mobile Image */}
                <Image
                   src={slide.imgMobile}
                   alt={slide.title}
                   fill
                   priority={false}
                   className={`md:hidden block object-cover transition-transform duration-[10000ms] ease-linear ${
                     isActive ? "scale-105" : "scale-100"
                   }`}
                />
             </div>
             
             {/* Subtle vignette overlay */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 md:from-black/10 md:via-transparent md:to-black/25" />
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/30 mix-blend-multiply" />
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
      {/* Localized dark blob only behind the text — keeps image vivid at edges */}
      <div
        className="absolute inset-0 z-25 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
        }}
      />
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center pointer-events-none px-4 md:px-12">
         <div className="max-w-4xl pointer-events-auto flex flex-col items-center">
            
            {/* Slide Sub-label */}
            <div className="overflow-hidden mb-6">
              <div 
                key={`label-${activeIdx}`} 
                className="animate-in slide-in-from-bottom-4 fade-in duration-700"
              >
                <span className="px-4 py-1 md:px-5 md:py-1.5 border border-white/20 rounded-full backdrop-blur-sm bg-white/5 text-store-yellow font-bold uppercase tracking-[0.3em] text-[9px] md:text-xs">
                  {slides[activeIdx].label}
                </span>
              </div>
            </div>

            {/* Slide Title */}
            <div className="overflow-hidden mb-6">
               <h1 
                 key={`title-${activeIdx}`} 
                 className="text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-serif text-white leading-[1.05] tracking-tight animate-in slide-in-from-bottom-8 fade-in duration-1000"
                 style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)' }}
               >
                 {slides[activeIdx].title}
               </h1>
            </div>

            {/* Slide Description */}
            <div className="overflow-hidden mb-10">
               <p 
                 key={`desc-${activeIdx}`} 
                 className="text-white text-[13px] sm:text-sm md:text-lg lg:text-xl font-semibold leading-relaxed max-w-2xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150"
                 style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,1)' }}
               >
                 {slides[activeIdx].subtitle}
               </p>
            </div>

            {/* Slide CTA Button */}
            <div className="overflow-hidden">
               <div key={`cta-${activeIdx}`} className="animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 inline-block">
                  <Link 
                     href={slides[activeIdx].href}
                     className="group/btn relative inline-flex items-center justify-center bg-[#F0C75E] text-black px-8 py-3.5 md:px-12 md:py-5 rounded-sm font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs overflow-hidden transition-colors hover:bg-white shadow-2xl"
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
