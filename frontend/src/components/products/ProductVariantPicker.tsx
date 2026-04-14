"use client";

import { useState, useCallback } from "react";
import type { ProductVariant } from "@/lib/catalog";

type Props = {
  variants: ProductVariant[];
  basePrice: string;
  /** Called whenever the active selection changes */
  onChange: (selected: {
    variant: ProductVariant | null;
    images: string[];
    price: string;
    stock: number;
  }) => void;
};

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function ProductVariantPicker({ variants, basePrice, onChange }: Props) {
  const colors = uniq(variants.map((v) => v.color).filter(Boolean));
  const sizes = uniq(variants.map((v) => v.size).filter(Boolean));

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length === 1 ? colors[0] : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null
  );

  const findVariant = useCallback(
    (color: string | null, size: string | null): ProductVariant | null => {
      return (
        variants.find((v) => {
          const colorMatch = colors.length === 0 || v.color === color;
          const sizeMatch = sizes.length === 0 || v.size === size;
          return colorMatch && sizeMatch;
        }) ?? null
      );
    },
    [variants, colors, sizes]
  );

  const notify = useCallback(
    (color: string | null, size: string | null) => {
      const variant = findVariant(color, size);
      onChange({
        variant,
        images: variant?.images ?? [],
        price: variant?.price ?? basePrice,
        stock: variant?.stock ?? 0,
      });
    },
    [findVariant, onChange, basePrice]
  );

  const handleColor = (c: string) => {
    const next = selectedColor === c ? null : c;
    setSelectedColor(next);
    notify(next, selectedSize);
  };

  const handleSize = (s: string) => {
    const next = selectedSize === s ? null : s;
    setSelectedSize(next);
    notify(selectedColor, next);
  };

  // Determine which sizes are available for the selected color
  const availableSizes = selectedColor
    ? uniq(
        variants
          .filter((v) => v.color === selectedColor || !selectedColor)
          .map((v) => v.size)
          .filter(Boolean)
      )
    : sizes;

  if (variants.length === 0) return null;

  return (
    <div className="space-y-5 pt-2 border-t border-gray-100">
      {/* Color Picker */}
      {colors.length > 0 && (
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
                  className={`group relative h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
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

      {/* Size Picker */}
      {sizes.length > 0 && (
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
              const isActive = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => isAvailable && handleSize(size)}
                  disabled={!isAvailable}
                  className={`relative h-9 min-w-[44px] px-4 rounded-md text-xs font-bold border transition-all duration-200 ${
                    isActive
                      ? "bg-store-navy text-white border-store-navy shadow-md"
                      : isAvailable
                      ? "bg-white text-store-navy border-gray-200 hover:border-store-navy"
                      : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                  }`}
                >
                  {size}
                  {/* Crossed-out line for unavailable sizes */}
                  {!isAvailable && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-full h-[1px] bg-gray-200 absolute rotate-[-20deg]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
