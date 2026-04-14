"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { ProductVariantPicker } from "@/components/products/ProductVariantPicker";
import { ShareButton } from "@/components/products/ShareButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PincodeCheck } from "@/components/PincodeCheck";
import type { ProductVariant } from "@/lib/catalog";

/* 
  All props are plain serializable data — safe to pass from a Server Component.
  No function props / render props.
*/
type Props = {
  productTitle: string;
  productSlug: string;
  basePrice: string;
  compareAtPrice: string | null;
  baseImages: string[];
  baseStock: number;
  minQty: number;
  bulkThreshold: number | null;
  isCustomizable: boolean;
  isReturnable: boolean;
  recentSalesCount: number;
  rating: number;
  reviewCount: number;
  description: string;
  categorySlug: string;
  variants: ProductVariant[];
  firstImageSrc?: string | null;
};

export function ProductDetailClient({
  productTitle,
  productSlug,
  basePrice,
  compareAtPrice,
  baseImages,
  baseStock,
  minQty,
  bulkThreshold,
  isCustomizable,
  isReturnable,
  recentSalesCount,
  rating,
  reviewCount,
  description,
  variants,
  firstImageSrc,
}: Props) {
  const [activeImages, setActiveImages] = useState<string[]>(baseImages);
  const [activePrice, setActivePrice] = useState<string>(basePrice);
  const [activeStock, setActiveStock] = useState<number>(baseStock);

  const handleVariantChange = (selected: {
    variant: ProductVariant | null;
    images: string[];
    price: string;
    stock: number;
  }) => {
    setActiveImages(selected.images.length > 0 ? selected.images : baseImages);
    setActivePrice(selected.price ?? basePrice);
    setActiveStock(selected.stock > 0 ? selected.stock : baseStock);
  };

  const stock = activeStock;
  const price = activePrice;

  return (
    <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-14">

      {/* ── Left: Sticky Gallery ── */}
      <div className="w-full lg:w-[50%] xl:w-[55%] lg:sticky lg:top-28 h-max z-10">
        <ProductImageGallery images={activeImages} productTitle={productTitle} />
      </div>

      {/* ── Right: Scrollable Info ── */}
      <div className="w-full lg:w-[45%] xl:w-[40%] pb-12">

        <div className="space-y-8">

          {/* Title & Share */}
          <div className="space-y-3">
            {isCustomizable && (
              <span className="inline-block bg-store-button/10 text-store-button text-[9px] uppercase font-bold tracking-[0.2em] px-3 py-1 rounded-full mb-1 border border-store-button/20">
                Customizable Boutique
              </span>
            )}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-serif text-store-navy leading-[1.1]">
                {productTitle}
              </h1>
              <ShareButton title={productTitle} />
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-4 text-store-button text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-store-navy leading-none">{rating.toFixed(1)}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < Math.floor(rating) ? "text-store-button" : "text-gray-200"}>★</span>
                    ))}
                  </div>
                </div>
                <span className="text-neutral-400 font-bold uppercase tracking-widest text-[9px]">
                  {reviewCount} Verified {reviewCount === 1 ? "Review" : "Reviews"}
                </span>
              </div>
            )}
          </div>

          {/* Price — live-updates on variant select */}
          <div className="pb-2 border-b border-gray-100">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-store-navy leading-none transition-all duration-300">
                {price}
              </span>
              {compareAtPrice && price === basePrice && (
                <span className="text-base text-neutral-400 line-through decoration-store-button/40">
                  {compareAtPrice}
                </span>
              )}
            </div>
          </div>

          {/* Variant Picker */}
          {variants.length > 0 && (
            <ProductVariantPicker
              variants={variants}
              basePrice={basePrice}
              onChange={handleVariantChange}
            />
          )}

          {/* Urgency & Social Proof */}
          {(recentSalesCount > 0 || (stock > 0 && stock <= 10)) && (
            <div className="flex flex-wrap gap-2">
              {recentSalesCount > 0 && (
                <div className="flex items-center gap-2 bg-[#F9F9F7] px-3 py-1.5 rounded-md border border-gray-100">
                  <span className="text-base text-orange-500">🔥</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy">
                    <span className="text-store-button bg-store-button/10 px-1 rounded">{recentSalesCount} people</span> bought this in the last 24h
                  </p>
                </div>
              )}
              {stock > 0 && stock <= 10 && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                  <span className="text-base text-red-500">⏳</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                    Only <span className="bg-red-100 px-1 rounded">{stock} left</span> — Order soon
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Purchase Box */}
          <div className="bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl border border-gray-100">
            {stock > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                  <span className="text-green-600 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                    Currently in Stock
                  </span>
                  <span className="text-neutral-400 italic">Nationwide Shipping</span>
                </div>
                <div className="space-y-5">
                  <AddToCartButton
                    productSlug={productSlug}
                    quantity={minQty}
                    imageSrc={firstImageSrc ?? undefined}
                    className="w-full bg-store-navy text-white hover:bg-store-button hover:text-black shadow-md py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md border-none h-11 transition-all"
                  />
                  <div className="pt-2">
                    <PincodeCheck />
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] text-center text-neutral-400 font-medium italic">
                    Delivery charges calculated at checkout.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-store-navy font-serif italic text-lg mb-4">Temporarily out of the atelier.</p>
                <Link href="/products" className="text-store-button font-bold text-xs uppercase tracking-widest underline underline-offset-8 decoration-2">
                  Explore Similar Pieces
                </Link>
              </div>
            )}
          </div>

          {/* Return Policy — Amazon-style */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
            isReturnable
              ? "bg-emerald-50 border-emerald-100"
              : "bg-amber-50 border-amber-100"
          }`}>
            <span className="text-2xl flex-shrink-0">
              {isReturnable ? "↩️" : "🚫"}
            </span>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${
                isReturnable ? "text-emerald-700" : "text-amber-700"
              }`}>
                {isReturnable ? "7-Day Easy Returns" : "Non-Returnable"}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {isReturnable
                  ? "Return or exchange within 7 days of delivery."
                  : "This item is not eligible for return or exchange."}
              </p>
            </div>
          </div>

          {/* Product Story */}
          <div className="bg-[#F8F8F7] px-8 py-10 rounded-2xl border border-gray-100">
            <h2 className="text-xl font-serif text-store-navy mb-5">The Product Story</h2>
            <div className="prose prose-sm prose-neutral max-w-none text-neutral-600 leading-relaxed">
              {description.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
