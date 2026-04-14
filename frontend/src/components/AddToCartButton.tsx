"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { addToCart } from "@/lib/cartApi";
import { cacheProductSnapshot } from "@/lib/guestCart";
import { fetchProductDetail } from "@/lib/catalog";

export function AddToCartButton({
  productSlug,
  quantity = 1,
  designFile = null,
  className = "mt-2 w-full",
  imageSrc,
}: {
  productSlug: string;
  quantity?: number;
  designFile?: File | null;
  className?: string;
  imageSrc?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [err, setErr] = useState("");
  const [errCode, setErrCode] = useState<string | null>(null);
  const [productSku, setProductSku] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function animateFly() {
    const cartEl = document.getElementById("cart-icon-target");
    if (!cartEl || !btnRef.current) return;

    const r1 = btnRef.current.getBoundingClientRect();
    const r2 = cartEl.getBoundingClientRect();

    const f = document.createElement("div");
    f.style.cssText = `
      position: fixed;
      z-index: 9999;
      border-radius: 50%;
      pointer-events: none;
      transition: top 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  left 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                  width 0.75s ease,
                  height 0.75s ease,
                  opacity 0.65s ease;
      top: ${r1.top + r1.height / 2}px;
      left: ${r1.left + r1.width / 2}px;
      width: ${Math.min(r1.width, 80)}px;
      height: ${Math.min(r1.height, 80)}px;
      transform: translate(-50%, -50%);
      background-color: #f0f0f0;
      ${imageSrc ? `background-image: url(${imageSrc}); background-size: cover; background-position: center;` : "background-color: #c8a96e;"}
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(f);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        f.style.top = `${r2.top + r2.height / 2}px`;
        f.style.left = `${r2.left + r2.width / 2}px`;
        f.style.width = "18px";
        f.style.height = "18px";
        f.style.opacity = "0";
      });
    });

    setTimeout(() => {
      cartEl.classList.add("cart-wiggle");
      setTimeout(() => cartEl.classList.remove("cart-wiggle"), 500);
      f.remove();
    }, 2100);
  }

  async function handleClick() {
    if (status !== "idle") return;
    setStatus("loading");
    setErr("");
    setErrCode(null);
    animateFly();

    try {
      try {
        const detail = await fetchProductDetail(productSlug);
        setProductSku(detail.sku);
        cacheProductSnapshot({
          slug: detail.slug,
          title: detail.title,
          price: detail.price,
          image: detail.image,
          bulk_threshold: detail.bulk_threshold ?? null,
          stock: detail.stock,
        });
      } catch { /* ignore cache pre-warm fail */ }

      await addToCart(productSlug, quantity, designFile);
      window.dispatchEvent(new Event("jfp-cart-updated"));
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e: any) {
      setStatus("err");
      setErr(e.message || "Could not add to cart");
      setErrCode(e.code || null);
      // Wait longer before resetting if it's a critical bulk error
      setTimeout(() => setStatus("idle"), e.code === "BULK_QUOTE_REQUIRED" ? 8000 : 3000);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className={[
          className,
          "relative overflow-hidden transition-all duration-300 select-none",
          status === "ok" ? "!bg-green-600 !text-white scale-95" : "",
          status === "loading" ? "opacity-75 cursor-wait" : "active:scale-95",
        ].join(" ")}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {status === "loading" && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {status === "ok" && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === "loading" ? "Adding…" : status === "ok" ? "Added!" : "Add to Cart"}
        </span>
      </button>

      {status === "err" && (
        <div className="mt-2.5 p-3 bg-red-50 border-l-2 border-red-500 animate-in slide-in-from-top-2">
          <p className="text-[10px] text-red-700 font-bold leading-relaxed">
            {err}
            {errCode === "BULK_QUOTE_REQUIRED" && (
              <Link href={`/quote?product=${productSku || productSlug}&qty=${quantity}`} className="inline-block mt-1 underline decoration-red-200 hover:decoration-red-500 transition-colors uppercase tracking-widest ml-1">
                Request Quote Instead
              </Link>
            )}
          </p>
        </div>
      )}

      <style>{`
        @keyframes cart-wiggle-anim {
          0%   { transform: rotate(0deg) scale(1); }
          20%  { transform: rotate(-14deg) scale(1.2); }
          40%  { transform: rotate(10deg) scale(1.1); }
          60%  { transform: rotate(-6deg) scale(1.05); }
          80%  { transform: rotate(3deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .cart-wiggle {
          animation: cart-wiggle-anim 0.45s ease-in-out !important;
        }
      `}</style>
    </>
  );
}
