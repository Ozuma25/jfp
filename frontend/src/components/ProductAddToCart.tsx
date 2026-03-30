"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";

export function ProductAddToCart({
  productSlug,
  minQty = 1,
  bulkThreshold,
  isCustomizable = false,
  imageSrc,
}: {
  productSlug: string;
  minQty?: number,
  bulkThreshold?: number | null,
  isCustomizable?: boolean,
  imageSrc?: string | null,
}) {
  const [qty, setQty] = useState(minQty);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const isBulk = bulkThreshold ? qty > bulkThreshold : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        setError("Unsupported file format. Please upload JPG, PNG, or PDF.");
        setDesignFile(null);
      } else if (file.size > 10 * 1024 * 1024) {
        setError("Design file too large. Max 10MB permitted.");
        setDesignFile(null);
      } else {
        setError("");
        setDesignFile(file);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {isCustomizable && (
        <div className="space-y-4 p-6 bg-white border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">🎨</span>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-store-navy">Bespoke Boutique Customization</p>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed italic mb-4">
            Upload your design (PDF, JPG, PNG). Our designers will review it for premium quality before you pay.
          </p>

          <div className="relative border-2 border-dashed border-gray-100 p-8 text-center group hover:border-store-button transition-colors">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-store-navy/60 group-hover:text-store-navy uppercase tracking-widest transition-colors">
                {designFile ? designFile.name : "Select Design File"}
              </p>
              <p className="text-[9px] text-neutral-300 uppercase tracking-tighter">JPG, PNG, PDF — MAX 10MB</p>
            </div>
          </div>
          {error && <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest animate-pulse">{error}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="qty" className="block text-[10px] font-bold uppercase tracking-widest text-store-navy/60 mb-2">
            Selection Quantity
          </label>
          <div className="flex items-center border border-gray-100 bg-neutral-50 px-2 h-12">
            <button
              onClick={() => setQty(Math.max(minQty, qty - 1))}
              className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
            >–</button>
            <input
              type="number"
              min={minQty}
              value={qty || ""}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              onBlur={() => setQty(Math.max(minQty, qty || 0))}
              className="w-16 bg-transparent text-center text-xs font-bold text-store-navy focus:outline-none focus:ring-1 focus:ring-store-button appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => setQty(qty + 1)}
              className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
            >+</button>
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          {!isBulk ? (
            <AddToCartButton productSlug={productSlug} quantity={qty} designFile={designFile} imageSrc={imageSrc} className="w-full bg-store-navy text-white hover:bg-store-button hover:text-black shadow-xl py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-none border-none h-12" />
          ) : (
            <div className="h-12 w-full flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-widest cursor-not-allowed">
              Exceeds Cart Capacity
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {minQty > 1 && (
          <p className="text-[10px] text-store-navy/40 font-bold uppercase tracking-widest italic flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-store-button" />
            Minimum Order Quantity: {minQty} Pieces
          </p>
        )}

        {isBulk && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <Link
              href={`/quote?product=${productSlug}&qty=${qty}`}
              className="block w-full text-center py-4 border-2 border-store-button text-[10px] font-bold uppercase tracking-[0.2em] text-store-navy hover:bg-store-button hover:text-black transition-all shadow-lg"
            >
              Request Bulk Boutique Quote
            </Link>
            <p className="mt-2 text-[9px] text-center text-neutral-400 font-medium italic">
              Great choice! Quantities above {bulkThreshold} pieces qualify for handcrafted custom pricing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
