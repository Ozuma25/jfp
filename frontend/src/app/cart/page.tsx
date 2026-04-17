"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCart, removeCartItem, updateCartItem, applyCoupon, removeCoupon, type CartData } from "@/lib/cartApi";

export default function CartPage() {
  const { user } = useAuth();
  const cartOwnerKey = user ? `u${user.id}` : "anon";
  const searchParams = useSearchParams();
  const emptyFromCheckout = searchParams.get("empty") === "checkout";
  const [cart, setCart] = useState<CartData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  // Tracks which cart item ID the user just tried to exceed the bulk threshold on
  const [bulkLimitHitId, setBulkLimitHitId] = useState<number | null>(null);

  const load = useCallback(async (opts?: { showSpinner?: boolean }) => {
    setErr("");
    if (opts?.showSpinner) setLoading(true);
    try {
      const c = await fetchCart();
      setCart(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load cart.");
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleApplyCoupon() {
    if (!couponCode) return;
    setIsCouponLoading(true);
    setErr("");
    try {
      const c = await applyCoupon(couponCode);
      setCart(c);
      setCouponCode("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid coupon.");
    } finally {
      setIsCouponLoading(false);
    }
  }

  async function handleRemoveCoupon() {
    setIsCouponLoading(true);
    try {
      const c = await removeCoupon();
      setCart(c);
    } catch (e) {
      setErr("Failed to remove coupon.");
    } finally {
      setIsCouponLoading(false);
    }
  }

  useEffect(() => {
    load({ showSpinner: true });
  }, [load, cartOwnerKey]);

  async function setQty(id: number, q: number, slug: string) {
    setBulkLimitHitId(null); // clear bulk-limit warning whenever qty changes
    try {
      const c = await updateCartItem(id, q, slug);
      setCart(c);
      window.dispatchEvent(new Event("jfp-cart-updated"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function remove(id: number, slug: string) {
    try {
      const c = await removeCartItem(id, slug);
      setCart(c);
      window.dispatchEvent(new Event("jfp-cart-updated"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
         <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-store-button border-t-transparent animate-spin rounded-full mx-auto" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-store-navy/40">Curating your selection...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F9F7] min-h-screen pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 md:pt-20">
        <header className="mb-12 border-b border-gray-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-serif text-store-navy">Your Selection</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-store-navy/40">Itemized Boutique Curator</p>
          </div>
          <Link href="/products" className="text-[10px] font-bold uppercase tracking-widest text-store-navy/60 hover:text-store-navy transition-colors pb-1 border-b border-transparent hover:border-store-button">
            ← Continue Browsing
          </Link>
        </header>

        {err && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-wider">
            {err}
          </div>
        )}

        {emptyFromCheckout && (
          <div className="mb-8 flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
            <span className="text-2xl shrink-0">🛒</span>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Your cart is empty — checkout cancelled</p>
              <p className="text-xs text-amber-700">
                You removed all items during checkout. Add items to continue shopping or{" "}
                <Link href="/products" className="underline font-bold hover:text-amber-900">explore our collection</Link>.
              </p>
            </div>
          </div>
        )}

        {!cart || cart.items.length === 0 ? (
          <div className="py-16 md:py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
             {/* Illustrated empty gift box SVG */}
             <div className="relative mx-auto w-48 h-48 md:w-56 md:h-56 mb-8">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                   {/* Shadow */}
                   <ellipse cx="100" cy="180" rx="60" ry="8" fill="#08043D" opacity="0.06" />
                   {/* Box body */}
                   <rect x="40" y="100" width="120" height="70" rx="4" fill="#F0C75E" opacity="0.15" stroke="#D4AF37" strokeWidth="1.5" />
                   <rect x="40" y="100" width="120" height="70" rx="4" fill="url(#boxGrad)" />
                   {/* Box lid (open, tilted) */}
                   <g transform="rotate(-8, 40, 100)">
                      <rect x="35" y="85" width="130" height="20" rx="3" fill="#D4AF37" opacity="0.25" stroke="#D4AF37" strokeWidth="1.5" />
                      <rect x="93" y="85" width="14" height="20" fill="#D4AF37" opacity="0.5" />
                   </g>
                   {/* Vertical ribbon */}
                   <rect x="93" y="100" width="14" height="70" fill="#D4AF37" opacity="0.35" />
                   {/* Bow */}
                   <path d="M100 90 C85 75, 65 80, 75 90 C65 100, 85 105, 100 90Z" fill="#C41E3A" opacity="0.6" />
                   <path d="M100 90 C115 75, 135 80, 125 90 C135 100, 115 105, 100 90Z" fill="#C41E3A" opacity="0.6" />
                   <circle cx="100" cy="90" r="4" fill="#C41E3A" opacity="0.8" />
                   {/* Ribbon tails */}
                   <path d="M87 92 Q80 105, 72 115" stroke="#C41E3A" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
                   <path d="M113 92 Q120 105, 128 115" stroke="#C41E3A" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
                   {/* Sparkles around the box */}
                   <path d="M30 70 L32 65 L34 70 L32 75Z" fill="#D4AF37" opacity="0.5" />
                   <path d="M170 60 L172 55 L174 60 L172 65Z" fill="#D4AF37" opacity="0.4" />
                   <path d="M155 130 L157 127 L159 130 L157 133Z" fill="#D4AF37" opacity="0.3" />
                   <circle cx="45" cy="130" r="2" fill="#D4AF37" opacity="0.3" />
                   <circle cx="165" cy="85" r="1.5" fill="#F0C75E" opacity="0.5" />
                   {/* Gradient definition */}
                   <defs>
                      <linearGradient id="boxGrad" x1="40" y1="100" x2="160" y2="170" gradientUnits="userSpaceOnUse">
                         <stop offset="0" stopColor="#F0C75E" stopOpacity="0.08" />
                         <stop offset="1" stopColor="#D4AF37" stopOpacity="0.12" />
                      </linearGradient>
                   </defs>
                </svg>
             </div>

             <p className="text-sm font-bold uppercase tracking-[0.3em] text-store-button mb-3">Your Gift Box</p>
             <p className="text-2xl md:text-3xl font-serif text-store-navy mb-3 leading-tight">Waiting to be filled with joy</p>
             <p className="text-sm text-store-navy/40 max-w-md mx-auto mb-10">
               Explore our curated collections of premium gifts, handcrafted packaging, and festive hampers for every celebration.
             </p>
             <Link 
               href="/products" 
               className="group inline-flex items-center gap-3 bg-store-navy text-white px-10 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-store-button hover:text-black transition-all shadow-xl relative overflow-hidden"
             >
               <span className="absolute inset-0 -translate-x-full bg-white/10 group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
               <span className="relative">🎁 Start Gifting</span>
               <span className="relative text-base group-hover:translate-x-1 transition-transform">→</span>
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-start">
            {/* Left: Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className={`group bg-white p-6 md:p-8 flex flex-col sm:flex-row shadow-sm hover:shadow-xl transition-all duration-500 relative border ${
                    item.stock_warning
                      ? "border-red-200"
                      : item.price_changed
                      ? "border-amber-200"
                      : "border-gray-50"
                  }`}
                >
                  <Link
                    href={`/products/${item.product_slug}`}
                    className="relative aspect-square h-32 w-32 shrink-0 overflow-hidden rounded-t-[3rem] bg-neutral-50 mb-4 sm:mb-0"
                  >
                    {item.product_image ? (
                      <Image
                        src={item.product_image}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        sizes="128px"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">no image</span>
                    )}
                  </Link>

                  <div className="sm:ml-8 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <Link
                          href={`/products/${item.product_slug}`}
                          className="text-xl md:text-2xl font-serif text-store-navy hover:text-store-button transition-colors leading-tight"
                        >
                          {item.product_name}
                        </Link>
                        {item.variant_label && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-store-button bg-store-button/10 border border-store-button/20 px-2 py-0.5 rounded-full">
                            {item.variant_label}
                          </span>
                        )}
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{item.product_slug}</p>
                      </div>
                      <p className="text-lg font-bold text-store-navy/90">{item.line_total}</p>
                    </div>

                    {/* ── Price-change warning ─────────────────────────────── */}
                    {item.price_changed && (
                      <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <span className="text-amber-500 text-base mt-0.5">⚠️</span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Price Updated</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            This item was added at{" "}
                            <span className="line-through font-bold">₹{Number(item.price_at_add).toFixed(2)}</span>
                            {" "}— now{" "}
                            <span className="font-bold">₹{Number(item.unit_price).toFixed(2)}</span>.
                            The new price will be used at checkout.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Stock warning ────────────────────────────────────── */}
                    {item.stock_warning && (
                      <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        <span className="text-red-500 text-base mt-0.5">🚫</span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Insufficient Stock</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Only <span className="font-bold">{item.available_stock}</span> unit{item.available_stock !== 1 ? "s" : ""} available.
                            {" "}Please reduce your quantity to continue.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-gray-50">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Atelier Qty:</span>
                          <div className="flex items-center border border-gray-100 bg-neutral-50 pr-4">
                            <button
                              onClick={() => setQty(item.id, Math.max(1, item.quantity - 1), item.product_slug)}
                              className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
                            >–</button>
                            <span className={`px-4 py-2 text-xs font-bold min-w-[3rem] text-center ${
                              item.stock_warning ? "text-red-600" : "text-store-navy"
                            }`}>{item.quantity}</span>
                            <button
                              onClick={() => {
                                if (item.quantity < item.bulk_threshold) {
                                  setQty(item.id, item.quantity + 1, item.product_slug);
                                } else {
                                  // User tried to exceed threshold — show the nudge
                                  setBulkLimitHitId(item.id);
                                }
                              }}
                              title={item.quantity >= item.bulk_threshold ? `Max ${item.bulk_threshold} units — request a bulk quote for more` : undefined}
                              className={`px-4 py-2 transition-colors text-xs font-bold ${
                                item.quantity >= item.bulk_threshold
                                  ? "opacity-30 cursor-not-allowed"
                                  : "hover:bg-white hover:text-store-button"
                              }`}
                            >+</button>
                          </div>
                          {item.stock_warning && (
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                              Max: {item.available_stock}
                            </span>
                          )}
                        </div>

                        {/* Bulk threshold nudge — only when user actively tried to go beyond */}
                        {bulkLimitHitId === item.id && (
                          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                            <span className="text-amber-500 text-base mt-0.5 shrink-0">📦</span>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                Cart limit reached ({item.bulk_threshold} units max)
                              </p>
                              <p className="text-xs text-amber-600 mt-0.5">
                                Need more than {item.bulk_threshold} pieces?{" "}
                                <Link
                                  href={`/quote?sku=${item.effective_sku}&qty=${item.bulk_threshold + 1}`}
                                  className="font-bold underline underline-offset-2 hover:text-amber-800 transition-colors"
                                >
                                  Request a bulk quote
                                </Link>{" "}
                                for custom pricing on large orders.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(item.id, item.product_slug)}
                        className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-700 transition-colors flex items-center gap-2"
                      >
                        <span className="text-lg">×</span> Remove Selection
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Summary Card */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
               <div className="bg-white p-8 md:p-10 shadow-2xl border-t-4 border-store-button">
                  <h2 className="text-xl font-serif text-store-navy mb-8">Selection Summary</h2>
                  
                  <div className="space-y-4 text-[11px] font-bold uppercase tracking-widest border-b border-gray-50 pb-8">
                     <div className="flex justify-between">
                        <span className="text-neutral-400">Items Total</span>
                        <span className="text-store-navy">{cart.subtotal}</span>
                     </div>
                     {cart.discount && parseFloat(cart.discount.replace(/[^0-9.]/g, '')) > 0 && (
                       <div className="flex justify-between text-green-600">
                          <span>Boutique Savings</span>
                          <span>- {cart.discount}</span>
                       </div>
                     )}
                     
                     <div className="pt-4 space-y-2 border-t border-gray-50/50">
                        <div className="flex justify-between text-neutral-400">
                           <span>CGST (9%)</span>
                           <span>₹ {cart.tax_data.cgst_amount}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                           <span>SGST (9%)</span>
                           <span>₹ {cart.tax_data.sgst_amount}</span>
                        </div>
                        <div className="flex justify-between text-store-navy">
                           <span>Total Tax</span>
                           <span>₹ {cart.tax_data.gst_amount}</span>
                        </div>
                     </div>

                     <div className="flex justify-between">
                        <span className="text-neutral-400">Premium Packaging</span>
                        <span className="text-green-600">Included</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-neutral-400">Atelier Delivery</span>
                        <span className="text-store-navy italic">Calculated at Checkout</span>
                     </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="py-6 border-b border-gray-50">
                    {cart.coupon ? (
                      <div className="flex items-center justify-between bg-neutral-50 p-4 border border-dashed border-store-button/40">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Applied Premium Code</span>
                            <span className="text-xs font-bold text-store-navy">{cart.coupon.code}</span>
                         </div>
                         <button 
                           onClick={handleRemoveCoupon}
                           disabled={isCouponLoading}
                           className="text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-700 transition-colors"
                         >
                           Remove
                         </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Promotion Code</p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Enter Code"
                            className="flex-1 bg-neutral-50 px-4 py-2 text-[11px] font-bold uppercase tracking-widest outline-none border border-transparent focus:border-store-button/40 transition-all text-store-navy"
                          />
                          <button 
                            onClick={handleApplyCoupon}
                            disabled={isCouponLoading || !couponCode}
                            className="bg-store-navy text-white px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-store-button hover:text-black transition-all disabled:opacity-50"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="py-8 flex justify-between items-baseline mb-4">
                     <span className="text-xs font-bold uppercase tracking-[0.2em] text-store-navy">Subtotal Payable</span>
                     <span className="text-4xl font-serif text-store-navy leading-none">{cart.total}</span>
                  </div>

                  <div className="space-y-4 pt-4">
                    {(() => {
                      const hasStockIssue = cart.items.some(i => i.stock_warning);
                      const hasPriceChange = cart.items.some(i => i.price_changed);
                      if (user && !user.is_email_verified) {
                        return (
                          <div className="space-y-3">
                            <button disabled className="block w-full text-center bg-neutral-300 text-neutral-500 cursor-not-allowed py-5 text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl">
                              Checkout Locked
                            </button>
                            <p className="text-[10px] text-center text-amber-700 font-bold uppercase tracking-widest bg-amber-50 p-2">
                              Please verify your email to checkout
                            </p>
                          </div>
                        );
                      }
                      if (hasStockIssue) {
                        return (
                          <div className="space-y-3">
                            <button disabled className="block w-full text-center bg-red-100 text-red-500 cursor-not-allowed py-5 text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl">
                              Resolve Stock Issues to Checkout
                            </button>
                            <p className="text-[10px] text-center text-red-600 font-bold uppercase tracking-widest bg-red-50 p-2">
                              One or more items exceed available stock. Please adjust quantities.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          {hasPriceChange && (
                            <p className="text-[10px] text-center text-amber-700 font-bold uppercase tracking-widest bg-amber-50 p-2 border border-amber-200">
                              ⚠️ Some prices have changed. Review before proceeding.
                            </p>
                          )}
                          <Link
                            href="/checkout"
                            className="block w-full text-center bg-store-navy text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-store-button hover:text-black transition-all shadow-xl"
                          >
                            Process Checkout
                          </Link>
                        </div>
                      );
                    })()}
                    <p className="text-[10px] text-center text-neutral-400 font-medium italic">
                      Complimentary handling & secured shipping packaging on every boutique order. Delivery charges calculated at final step.
                    </p>
                  </div>
               </div>

               {/* Bulk Note */}
               <div className="mt-8 p-6 border border-gray-100 bg-white/50 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy">Wholesale Inquiry</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                    Quantities above the atelier limit require a custom quote.
                    {user && !user.is_email_verified ? (
                       <span className="block mt-2 text-amber-700 font-bold not-italic">Verify your email to request quotes.</span>
                    ) : (
                       <Link href="/quote" className="text-store-navy underline font-bold ml-1">Request Bulk Quote</Link>
                    )}
                  </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
