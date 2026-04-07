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

  const MAX_BULK_QTY = 99999;
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
    <div className="flex flex-col gap-5">
      {isCustomizable && (
        <div className="space-y-3 p-5 bg-neutral-50/50 border border-gray-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎨</span>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-store-navy">Bespoke Boutique Customization</p>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed italic mb-4">
            Upload your design (PDF, JPG, PNG). Our designers will review it for premium quality before you pay.
          </p>

          <div className="relative border-2 border-dashed border-gray-200 rounded-lg p-5 text-center group hover:border-store-button hover:bg-white transition-all">
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

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="qty" className="block text-[10px] font-bold uppercase tracking-widest text-store-navy/60 mb-2">
            Selection Quantity
          </label>
          <div className="flex items-center border border-gray-200 bg-white rounded-md px-1 h-11 shadow-sm">
            <button
              onClick={() => setQty(Math.max(minQty, qty - 1))}
              className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
            >–</button>
            <input
              type="number"
              min={minQty}
              max={MAX_BULK_QTY}
              value={qty || ""}
              onChange={(e) => {
                const val = Math.floor(Number(e.target.value));
                setQty(val > MAX_BULK_QTY ? MAX_BULK_QTY : val || 0);
              }}
              onBlur={() => setQty(Math.max(minQty, Math.min(qty || 0, MAX_BULK_QTY)))}
              onPaste={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
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
            <AddToCartButton productSlug={productSlug} quantity={qty} designFile={designFile} imageSrc={imageSrc} className="w-full bg-store-navy text-white hover:bg-store-button hover:text-black shadow-md py-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md border-none h-11 transition-all" />
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
              className="block w-full text-center py-3 border-2 border-store-button rounded-md text-[10px] font-bold uppercase tracking-[0.2em] text-store-navy hover:bg-store-button hover:text-black transition-all shadow-sm"
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
