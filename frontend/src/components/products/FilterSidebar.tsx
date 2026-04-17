"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import type { Category } from "@/lib/catalog";

type Props = {
  categories: Category[];
};

export function FilterSidebar({ categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  const applyFilters = () => {
    const query = createQueryString({
      min_price: minPrice,
      max_price: maxPrice,
    });
    router.push(`${pathname}?${query}`);
    setIsMobileOpen(false); // Close on mobile after apply
  };

  const toggleFilter = (key: string, value: string) => {
    const current = searchParams.get(key);
    const query = createQueryString({
      [key]: current === value ? null : value,
    });
    router.push(`${pathname}?${query}`);
  };

  const clearFilters = () => {
    router.push(pathname);
    setMinPrice("");
    setMaxPrice("");
    setIsMobileOpen(false);
  };

  const isSelected = (key: string, value: string) => searchParams.get(key) === value;

  return (
    <aside className="w-full">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="w-full lg:hidden flex justify-between items-center py-4 px-5 bg-white border border-gray-100 mb-6 font-bold text-store-navy uppercase tracking-[0.2em] text-[10px]"
      >
        <span>Filter Portfolio</span>
        <span className="text-lg leading-none">{isMobileOpen ? "−" : "+"}</span>
      </button>

      {/* Wrapping the actual content in a container that hides on mobile unless isMobileOpen is true */}
      <div className={`space-y-8 ${isMobileOpen ? 'block' : 'hidden'} lg:block p-4 border border-gray-100 lg:border-none lg:p-0 bg-white lg:bg-transparent`}>
        {/* Category Filter */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-store-navy mb-4">Collections</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => toggleFilter("cat", category.slug)}
              className={`block w-full text-left text-sm py-1.5 px-3 rounded-md transition-all ${
                isSelected("cat", category.slug)
                  ? "bg-store-navy text-white font-bold"
                  : "text-neutral-600 hover:bg-neutral-100 font-medium"
              }`}
            >
              <span className="capitalize">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-store-navy mb-4">Price Range</h3>
        <div className="mb-6">
          <div className="flex justify-between items-center text-[10px] font-bold text-store-navy mb-4 tracking-widest">
            <span>₹ {Math.max(0, Number(minPrice || 0))}</span>
            <span>₹ {Math.max(0, Number(maxPrice || 10000))}</span>
          </div>

          <div className="relative w-full h-1 bg-neutral-200 rounded-full">
            <div 
              className="absolute top-0 bottom-0 bg-store-button rounded-full"
              style={{
                left: `${(Math.max(0, Number(minPrice || 0)) / 10000) * 100}%`,
                right: `${100 - (Math.max(0, Number(maxPrice || 10000)) / 10000) * 100}%`
              }}
            />
            <input 
              type="range"
              min="0" 
              max="10000" 
              step="100"
              value={Math.max(0, Number(minPrice || 0))}
              onChange={(e) => {
                 const v = Math.max(0, Number(e.target.value));
                 // Ensure min doesn't cross max
                 const currentMax = Math.max(0, Number(maxPrice || 10000));
                 setMinPrice(Math.min(v, currentMax).toString());
              }}
              className="absolute top-0 left-0 w-full h-1 -translate-y-1/2 appearance-none bg-transparent pointer-events-none custom-range-slider"
            />
            <input 
              type="range"
              min="0" 
              max="10000" 
              step="100"
              value={Math.max(0, Number(maxPrice || 10000))}
              onChange={(e) => {
                 const v = Math.max(0, Number(e.target.value));
                 // Ensure max doesn't cross min
                 const currentMin = Math.max(0, Number(minPrice || 0));
                 setMaxPrice(Math.max(v, currentMin).toString());
              }}
              className="absolute top-0 left-0 w-full h-1 -translate-y-1/2 appearance-none bg-transparent pointer-events-none custom-range-slider"
            />
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            .custom-range-slider::-webkit-slider-thumb {
              pointer-events: auto;
              appearance: none;
              width: 14px;
              height: 14px;
              background-color: #08043D;
              border: 2px solid white;
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            .custom-range-slider::-moz-range-thumb {
              pointer-events: auto;
              width: 14px;
              height: 14px;
              background-color: #08043D;
              border: 2px solid white;
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
          `}} />
        </div>
        <button
          onClick={applyFilters}
          className="mt-3 w-full bg-neutral-100 hover:bg-neutral-200 text-[10px] font-bold uppercase tracking-widest py-2 transition-colors border-none"
        >
          Apply Prices
        </button>
      </div>

      {/* Special Filters */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-store-navy mb-4">Special</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isSelected("is_bestseller", "true")}
              onChange={() => toggleFilter("is_bestseller", "true")}
              className="w-4 h-4 rounded-none border-neutral-300 text-store-button focus:ring-store-button cursor-pointer"
            />
            <span className="text-sm font-semibold text-neutral-600 group-hover:text-store-navy transition-colors">Bestsellers Only</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isSelected("custom", "true")}
              onChange={() => toggleFilter("custom", "true")}
              className="w-4 h-4 rounded-none border-neutral-300 text-store-button focus:ring-store-button cursor-pointer"
            />
            <span className="text-sm font-semibold text-neutral-600 group-hover:text-store-navy transition-colors">Custom Designs Available</span>
          </label>
        </div>
      </div>

      <button
        onClick={clearFilters}
        className="w-full py-3 border border-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-store-navy hover:border-store-navy transition-all"
      >
        Clear All Filters
      </button>
      </div>
    </aside>
  );
}
