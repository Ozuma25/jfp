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

  // Determine badge styling based on text
  let badgeStyle = "bg-slate-100 text-slate-800";
  if (p.badge) {
    const lowerBadge = p.badge.toLowerCase();
    if (lowerBadge.includes("sale")) {
      badgeStyle = "bg-[#f5e1e5] text-[#8e4a59]";
    } else if (lowerBadge.includes("new")) {
      badgeStyle = "bg-[#4a5568] text-white";
    } else if (lowerBadge.includes("best")) {
      badgeStyle = "bg-[#fef3c7] text-[#92400e]";
    }
  }

  return (
    <article className="w-[240px] md:w-[280px] shrink-0 snap-start flex flex-col group/card">
      <Link href={`/products/${p.slug}`} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 transition-all duration-300">
        {displayImages.length > 0 ? (
          <CloudImage
            src={displayImages[imgIndex]}
            alt={p.title}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover/card:scale-105 ${p.stock <= 0 ? 'grayscale opacity-60' : ''}`}
            sizes="280px"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f7f7f7] text-center text-xs text-neutral-500 uppercase tracking-widest">
            <span>No image</span>
          </div>
        )}

        {/* Dynamic Floating Pill Badges */}
        {p.badge && (
          <div className={`absolute left-3 top-3 z-20 rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm ${badgeStyle}`}>
            {p.badge}
          </div>
        )}

        {/* Out of stock overlay */}
        {p.stock <= 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 pointer-events-none">
            <span className="bg-white/90 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-md backdrop-blur-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Internal Mini Carousel Controls */}
        {hasMultiple && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i - 1 + displayImages.length) % displayImages.length); }}
              className="bg-white/90 p-1.5 rounded-full shadow-lg text-slate-800 hover:bg-white transition-all transform -translate-x-2 group-hover/card:translate-x-0 z-40"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i + 1) % displayImages.length); }}
              className="bg-white/90 p-1.5 rounded-full shadow-lg text-slate-800 hover:bg-white transition-all transform translate-x-2 group-hover/card:translate-x-0 z-40"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Add To Cart Hover Button */}
        <div
          className="absolute inset-x-0 bottom-0 p-3 transform translate-y-full group-hover/card:translate-y-0 transition-transform duration-500 z-40"
          onClick={(e) => e.preventDefault()}
        >
          {p.stock > 0 ? (
            <AddToCartButton
              productSlug={p.slug}
              quantity={p.minQty}
              imageSrc={displayImages[imgIndex] ?? undefined}
              className="w-full bg-[#1c2434] text-white hover:bg-[#0f172a] hover:text-white border-none shadow-lg py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-colors"
            />
          ) : (
             <div className="w-full bg-white/80 backdrop-blur-md text-red-600 font-bold uppercase tracking-widest text-[10px] text-center py-2.5 rounded-xl border border-red-100 cursor-not-allowed">
                Out of Stock
             </div>
          )}
        </div>
      </Link>

      {/* Clean Left-Aligned Typography */}
      <div className="mt-4 px-1 flex flex-col gap-1">
        <Link
          href={`/products/${p.slug}`}
          className="text-[14px] font-medium leading-[1.3] text-[#1c2434] line-clamp-2 transition-colors hover:text-blue-600"
        >
          {p.title}
        </Link>
        <div className="flex items-center justify-between mt-1">
          <p className="font-normal text-[#64748b] text-[13px] tracking-tight">{p.price}</p>
          
          {p.reviewCount > 0 && (
            <div className="flex items-center gap-1 opacity-80">
              <IconStar className="h-3 w-3 text-store-yellow" filled={true} />
              <span className="text-[11px] font-medium text-slate-500">{p.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
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
