"use client";

import { CloudImage } from "@/components/ui/CloudImage";
import Link from "next/link";
import { useRef, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { IconChevronLeft, IconChevronRight, IconStar } from "@/components/icons";

export type CarouselProduct = {
  slug: string;
  title: string;
  price: string;
  image: string | null;
  images?: string[];
  badge?: "New" | "Sale";
  rating: number;
  reviewCount: number;
  bulkThreshold?: number;
  minQty: number;
  stock: number;
};

import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  viewAllHref: string;
  products: CarouselProduct[];
};

function ProductCard({ p }: { p: CarouselProduct }) {
  const [imgIndex, setImgIndex] = useState(0);
  const displayImages = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
  const hasMultiple = displayImages.length > 1;

  return (
    <article className="w-[240px] md:w-[280px] shrink-0 snap-start flex flex-col group/card">
      <Link href={`/products/${p.slug}`} className="relative aspect-[3/4] overflow-hidden rounded-t-[5rem] bg-white border border-gray-50 shadow-sm group-hover/card:shadow-2xl transition-all duration-700">
        {displayImages.length > 0 ? (
          <CloudImage
            src={displayImages[imgIndex]}
            alt={p.title}
            fill
            className={`object-cover transition-transform duration-1000 group-hover/card:scale-110 ${p.stock <= 0 ? 'grayscale opacity-70' : ''}`}
            sizes="280px"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-neutral-50 p-4 text-center text-xs text-neutral-400">
            <span>No image</span>
          </div>
        )}

        {/* Internal Mini Carousel Controls */}
        {hasMultiple && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i - 1 + displayImages.length) % displayImages.length); }}
              className="bg-white/90 p-1.5 rounded-full shadow-lg text-store-navy hover:bg-white transition-all transform -translate-x-2 group-hover/card:translate-x-0 group/btn z-40"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i + 1) % displayImages.length); }}
              className="bg-white/90 p-1.5 rounded-full shadow-lg text-store-navy hover:bg-white transition-all transform translate-x-2 group-hover/card:translate-x-0 group/btn z-40"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Progress dots for internal carousel */}
        {hasMultiple && (
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 px-2 py-1 bg-black/20 backdrop-blur-sm rounded-full opacity-100 transition-opacity z-20">
              {displayImages.map((_, i) => (
                <div key={i} className={`h-1 transition-all ${i === imgIndex ? 'w-4 bg-store-button' : 'w-1 bg-white/50'}`} />
              ))}
           </div>
        )}

        {p.badge && (
          <span className="absolute left-4 top-4 bg-store-button text-black text-[9px] uppercase font-bold tracking-[0.1em] px-3 py-1 rounded-full shadow-lg z-20">
            {p.badge}
          </span>
        )}

        {/* Intercept clicks so the Link parent doesn't navigate */}
        <div
          className="absolute inset-x-0 bottom-0 p-4 transform translate-y-full group-hover/card:translate-y-0 transition-transform duration-500 z-40"
          onClick={(e) => e.preventDefault()}
        >
          {p.stock > 0 ? (
            <AddToCartButton
              productSlug={p.slug}
              quantity={p.minQty}
              imageSrc={displayImages[imgIndex] ?? undefined}
              className="w-full bg-store-navy text-white hover:bg-store-button hover:text-black border-none shadow-2xl py-3 text-[11px] font-bold uppercase tracking-widest rounded-none"
            />
          ) : (
            <div className="w-full bg-neutral-100 text-neutral-400 py-3 text-[11px] font-bold uppercase tracking-widest text-center cursor-not-allowed border border-neutral-200">
              Out of Stock
            </div>
          )}
        </div>
      </Link>

      <div className="mt-6 text-center space-y-2">
        <Link
          href={`/products/${p.slug}`}
          className="block text-xl font-serif text-store-navy group-hover/card:text-store-button transition-colors leading-snug line-clamp-1"
        >
          {p.title}
        </Link>
        {p.reviewCount > 0 && (
          <div className="flex justify-center gap-0.5 text-store-button">
            {Array.from({ length: 5 }).map((_, i) => (
              <IconStar
                key={i}
                className="h-3 w-3"
                filled={i < Math.floor(p.rating)}
              />
            ))}
          </div>
        )}
        <p className="text-[17px] font-bold text-store-navy/90 tracking-tighter">{p.price}</p>
        
        {p.bulkThreshold != null && (
          <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
            Bulk starting at {p.bulkThreshold} pcs
          </p>
        )}
      </div>
    </article>
  );
}

export function ProductCarousel({ title, viewAllHref, products }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 400);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="bg-transparent py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex items-end justify-between border-b border-gray-100 pb-6">
          <div className="space-y-1">
             <h2 className="text-2xl md:text-3xl font-serif text-store-navy">{title}</h2>
             <div className="w-12 h-0.5 bg-store-button"></div>
          </div>
          <Link
            href={viewAllHref}
            className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-store-navy/60 hover:text-store-navy transition-colors"
          >
            Explore All
          </Link>
        </div>
        <div className="relative group">
          <button
            type="button"
            className="absolute -left-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-100 bg-white p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50 text-store-navy"
            onClick={() => scroll("left")}
          >
            <IconChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="absolute -right-5 top-1/2 z-20 -translate-y-1/2 rounded-full border border-gray-100 bg-white p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50 text-store-navy"
            onClick={() => scroll("right")}
          >
            <IconChevronRight className="h-6 w-6" />
          </button>
          
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-6 md:gap-10 overflow-x-auto pb-10 no-scrollbar"
          >
            {products.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
