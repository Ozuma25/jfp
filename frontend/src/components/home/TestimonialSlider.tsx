"use client";

import { useState, useEffect } from "react";

const reviews = [
  {
    quote:
      "A cornerstone of the gifting industry. Their commitment to handcrafted excellence in packaging is truly world-class.",
    name: "Architectural Gifting Co.",
    context: "Client since 2012",
  },
  {
    quote:
      "Jai Fancy Packs brought our vision to life with bespoke boutique packaging. The attention to detail is remarkable.",
    name: "S. Boutique Designs",
    context: "Custom Project Participant",
  },
  {
    quote:
      "Reliable, premium, and consistently high-quality. They understand for us, the packaging is the first impression.",
    name: "Heritage Events",
    context: "Wholesale Partner",
  },
];

export function TestimonialSlider() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setI((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const r = reviews[i];

  return (
    <section className="bg-neutral-50 py-24 md:py-32 overflow-hidden border-y border-gray-100">
      <div className="mx-auto max-w-5xl px-4 text-center">
        
        {/* Heritage Badge */}
        <div className="flex flex-col items-center mb-16 space-y-4">
           <div className="h-12 w-[1px] bg-store-button"></div>
           <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-store-navy/40">The Jai Fancy Packs Legacy</p>
           <h3 className="text-3xl md:text-4xl font-serif text-store-navy italic">Trusted Since 1994</h3>
        </div>

        <div className="relative min-h-[300px] flex flex-col justify-center">
            {/* Massive Background Quote Icon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 select-none pointer-events-none opacity-[0.05]">
                <span className="text-[12rem] font-serif leading-none italic text-store-navy">“</span>
            </div>

            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <blockquote className="text-xl md:text-3xl font-serif leading-relaxed text-store-navy/90 max-w-3xl mx-auto mb-10">
                  {r.quote}
                </blockquote>
                
                <div className="space-y-2">
                   <p className="text-xs font-bold uppercase tracking-[0.2em] text-store-navy">
                      {r.name}
                   </p>
                   <p className="text-[10px] uppercase tracking-widest text-store-button font-bold">
                      {r.context}
                   </p>
                </div>
            </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="mt-16 flex justify-center gap-6">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`h-0.5 transition-all duration-700 ${
                idx === i ? "w-16 bg-store-button" : "w-8 bg-neutral-200"
              }`}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

