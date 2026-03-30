"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCart, removeCartItem, updateCartItem, applyCoupon, removeCoupon, type CartData } from "@/lib/cartApi";

export default function CartPage() {
  const { user } = useAuth();
  const cartOwnerKey = user ? `u${user.id}` : "anon";
  const [cart, setCart] = useState<CartData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponLoading, setIsCouponLoading] = useState(false);

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

        {!cart || cart.items.length === 0 ? (
          <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="text-6xl mb-6 grayscale opacity-20">🛍️</div>
             <p className="text-2xl font-serif text-store-navy mb-8 italic">Your atelier basket is currently waiting.</p>
             <Link 
               href="/products" 
               className="inline-block bg-store-navy text-white px-10 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-store-button hover:text-black transition-all shadow-xl"
             >
               Explore the Collection
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-start">
            {/* Left: Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              {cart.items.map((item) => (
                <div 
                  key={item.id} 
                  className="group bg-white p-6 md:p-8 flex flex-col sm:flex-row border border-gray-50 shadow-sm hover:shadow-xl transition-all duration-500 relative"
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
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{item.product_slug}</p>
                      </div>
                      <p className="text-lg font-bold text-store-navy/90">{item.line_total}</p>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-gray-50">
                       <div className="flex items-center gap-4">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">Atelier Qty:</span>
                          <div className="flex items-center border border-gray-100 bg-neutral-50 pr-4">
                             <button 
                               onClick={() => setQty(item.id, Math.max(1, item.quantity - 1), item.product_slug)}
                               className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
                             >–</button>
                             <span className="px-4 py-2 text-xs font-bold text-store-navy min-w-[3rem] text-center">{item.quantity}</span>
                             <button 
                               onClick={() => setQty(item.id, Math.min(item.bulk_threshold, item.quantity + 1), item.product_slug)}
                               className="px-4 py-2 hover:bg-white hover:text-store-button transition-colors text-xs font-bold"
                             >+</button>
                          </div>
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
                    {user && !user.is_email_verified ? (
                      <div className="space-y-3">
                        <button
                          disabled
                          className="block w-full text-center bg-neutral-300 text-neutral-500 cursor-not-allowed py-5 text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl"
                        >
                          Checkout Locked
                        </button>
                        <p className="text-[10px] text-center text-amber-700 font-bold uppercase tracking-widest bg-amber-50 p-2">
                          Please verify your email to checkout
                        </p>
                      </div>
                    ) : (
                      <Link
                        href="/checkout"
                        className="block w-full text-center bg-store-navy text-white py-5 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-store-button hover:text-black transition-all shadow-xl"
                      >
                        Process Checkout
                      </Link>
                    )}
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
