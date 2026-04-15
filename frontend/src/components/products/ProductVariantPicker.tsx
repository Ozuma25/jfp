"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ProductVariant } from "@/lib/catalog";

type Props = {
  variants: ProductVariant[];
  basePrice: string;
  /** Called whenever the active selection changes */
  onChange: (selected: {
    variant: ProductVariant | null;   // null = incomplete / invalid selection
    images: string[];
    price: string;
    stock: number;
  }) => void;
};

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** Find the one exact variant that matches both color and size (strict). */
function findExactVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null,
  hasColors: boolean,
  hasSizes: boolean
): ProductVariant | null {
  return (
    variants.find((v) => {
      const colorOk = !hasColors || v.color === color;
      const sizeOk  = !hasSizes  || v.size  === size;
      return colorOk && sizeOk;
    }) ?? null
  );
}

/** Sizes that actually exist for a given color. */
function sizesForColor(variants: ProductVariant[], color: string | null): string[] {
  return uniq(
    variants
      .filter((v) => !color || v.color === color)
      .map((v) => v.size)
      .filter(Boolean)
  );
}

export function ProductVariantPicker({ variants, basePrice, onChange }: Props) {
  const colors    = uniq(variants.map((v) => v.color).filter(Boolean));
  const sizes     = uniq(variants.map((v) => v.size).filter(Boolean));
  const hasColors = colors.length > 0;
  const hasSizes  = sizes.length  > 0;

  // ── Initial selection: first color, then first size valid for that color ──
  const firstColor = hasColors ? colors[0] : null;
  const firstSizesForFirstColor = hasSizes
    ? sizesForColor(variants, firstColor)
    : [];
  const firstSize = firstSizesForFirstColor.length > 0 ? firstSizesForFirstColor[0] : null;

  const [selectedColor, setSelectedColor] = useState<string | null>(firstColor);
  const [selectedSize,  setSelectedSize]  = useState<string | null>(firstSize);

  // ── Notify parent ──────────────────────────────────────────────────────────
  const notify = useCallback(
    (color: string | null, size: string | null) => {
      const variant = findExactVariant(variants, color, size, hasColors, hasSizes);
      onChange({
        variant,
        images: variant?.images ?? [],
        price:  variant?.price  ?? basePrice,
        // Critical: stock 0 when no valid variant — disables Add to Cart
        stock:  variant?.stock  ?? 0,
      });
    },
    [variants, hasColors, hasSizes, onChange, basePrice]
  );

  // Keep a ref so the mount effect always uses the latest notify
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // Fire once on mount so parent immediately reflects first variant
  useEffect(() => {
    if (variants.length > 0) {
      notifyRef.current(selectedColor, selectedSize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Color change ──────────────────────────────────────────────────────────
  const handleColor = (c: string) => {
    const nextColor = selectedColor === c ? null : c;
    setSelectedColor(nextColor);

    // Determine which sizes are available for the new color
    const availForNewColor = hasSizes ? sizesForColor(variants, nextColor) : [];

    // Keep current size if it's valid for the new color; otherwise pick first available
    let nextSize = selectedSize;
    if (hasSizes) {
      if (!nextColor) {
        // Deselected color — keep size selection as-is
        nextSize = selectedSize;
      } else if (selectedSize && availForNewColor.includes(selectedSize)) {
        // Current size is valid for new color — keep it
        nextSize = selectedSize;
      } else {
        // ⚠️ Current size is NOT available for new color — auto-switch to first valid
        nextSize = availForNewColor.length > 0 ? availForNewColor[0] : null;
      }
      setSelectedSize(nextSize);
    }

    notify(nextColor, nextSize);
  };

  // ── Size change ───────────────────────────────────────────────────────────
  const handleSize = (s: string) => {
    // Only toggle off if clicking the already-active size
    const nextSize = selectedSize === s ? null : s;
    setSelectedSize(nextSize);
    notify(selectedColor, nextSize);
  };

  // ── Available sizes for current color selection ───────────────────────────
  const availableSizes = hasSizes ? sizesForColor(variants, selectedColor) : [];

  if (variants.length === 0) return null;

  return (
    <div className="space-y-5 pt-2 border-t border-gray-100">

      {/* ── Color Picker ── */}
      {hasColors && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy/60 mb-3">
            Color
            {selectedColor && (
              <span className="ml-2 normal-case font-semibold text-store-navy tracking-normal">
                — {selectedColor}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isActive = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => handleColor(color)}
                  title={color}
                  className={`h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
                    isActive
                      ? "bg-store-navy text-white border-store-navy shadow-md"
                      : "bg-white text-store-navy border-gray-200 hover:border-store-navy"
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Size Picker ── */}
      {hasSizes && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy/60 mb-3">
            Size
            {selectedSize && (
              <span className="ml-2 normal-case font-semibold text-store-navy tracking-normal">
                — {selectedSize}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isAvailable = availableSizes.includes(size);
              const isActive    = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => isAvailable && handleSize(size)}
                  disabled={!isAvailable}
                  title={isAvailable ? size : `${size} — not available for ${selectedColor}`}
                  className={`relative h-9 min-w-[44px] px-4 rounded-md text-xs font-bold border transition-all duration-200 ${
                    isActive
                      ? "bg-store-navy text-white border-store-navy shadow-md"
                      : isAvailable
                      ? "bg-white text-store-navy border-gray-200 hover:border-store-navy"
                      : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                  }`}
                >
                  {size}
                  {!isAvailable && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-full h-[1px] bg-gray-200 absolute rotate-[-20deg]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Warn if no valid variant resolved */}
          {hasColors && selectedColor && !findExactVariant(variants, selectedColor, selectedSize, hasColors, hasSizes) && (
            <p className="mt-2 text-[10px] text-amber-600 font-semibold">
              Please select a valid size for {selectedColor}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
