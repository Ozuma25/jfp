"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrder, payApprovedOrder, verifyRazorpayPayment, type OrderDetail } from "@/lib/ordersApi";
import { fetchAddresses, authFetch, type SavedAddress } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (res: any) => void) => void; };
  }
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-store-button/30 focus:border-store-button transition-all";
const labelCls = "block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2";

function BulkCheckoutContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderErr, setOrderErr] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [shipping_name, setShippingName] = useState("");
  const [shipping_phone, setShippingPhone] = useState("");
  const [shipping_address_line1, setLine1] = useState("");
  const [shipping_address_line2, setLine2] = useState("");
  const [shipping_city, setCity] = useState("");
  const [shipping_state, setState] = useState("");
  const [shipping_postal_code, setPostal] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!orderId) { setOrderErr("No order specified."); setOrderLoading(false); return; }
    fetchOrder(orderId)
      .then(o => { setOrder(o); setOrderLoading(false); })
      .catch(e => { setOrderErr(e.message || "Failed to load order."); setOrderLoading(false); });
  }, [orderId]);

  // ── Auth / verification redirect ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/checkout/bulk?order=${orderId}`);
    } else if (!user.is_email_verified) {
      router.replace("/account?verify=1");
    }
  }, [authLoading, user, orderId, router]);

  useEffect(() => {
    if (!user) return;
    fetchAddresses().then(addrs => {
      setSavedAddresses(addrs);
      if (addrs.length === 0) {
        setUseNewAddress(true);
      } else {
        const def = addrs.find(a => a.is_default) || addrs[0];
        applyAddress(def);
        setSelectedAddressId(def.id);
      }
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
    return () => { if (s.parentNode) s.parentNode.removeChild(s); };
  }, []);

  const applyAddress = (addr: SavedAddress) => {
    setShippingName(addr.recipient_name);
    setShippingPhone(addr.phone);
    setLine1(addr.address_line1);
    setLine2(addr.address_line2 || "");
    setState(addr.state);
    setCity(addr.city);
    setPostal(addr.postal_code);
  };

  const handlePincodeChange = async (val: string) => {
    setPostal(val);
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length === 6) {
      setPincodeLoading(true);
      setApiFailed(false);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setState(po.State);
          setCity(po.District);
        } else setApiFailed(true);
      } catch { setApiFailed(true); }
      finally { setPincodeLoading(false); }
    } else if (cleaned.length < 6) { setState(""); setCity(""); }
  };

  // Update the order's shipping address before initiating payment
  async function updateShippingAndPay() {
    setBusy(true);
    setErr("");
    try {
      // 1. Patch the order's shipping address
      const patchRes = await authFetch<OrderDetail>(`/api/orders/${orderId}/shipping/`, {
        method: "PATCH",
        body: JSON.stringify({
          shipping_name,
          shipping_phone,
          shipping_address_line1,
          shipping_address_line2: shipping_address_line2 || "",
          shipping_city,
          shipping_state,
          shipping_postal_code,
        }),
      });
      
      // If PATCH endpoint isn't available, continue anyway
      // (order was already created when quote was accepted)
      
      // 2. Request payment for the order
      const data = await payApprovedOrder(orderId!);

      if ("mock_payment" in data && data.mock_payment) {
        router.push(`/orders/${data.order_id}`);
        return;
      }

      // 3. Open Razorpay
      if (!scriptReady || !window.Razorpay) {
        setErr("Payment gateway is loading. Please try again in a moment.");
        return;
      }

      const rpData = data as Extract<typeof data, { razorpay_order_id: string }>;
      const rzp = new window.Razorpay({
        key: rpData.key_id,
        amount: rpData.amount,
        currency: rpData.currency,
        name: "Jai Fancy Packs",
        description: `Bulk Order #${orderId}`,
        order_id: rpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment({
              order_id: rpData.order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            router.push(`/orders/${orderId}`);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Payment verification failed.");
          }
        },
        prefill: { email: user?.email ?? "", name: shipping_name, contact: shipping_phone },
        theme: { color: "#004B6E" },
        modal: {
          ondismiss: () => router.push(`/orders/${orderId}`),
        },
      });
      rzp.on("payment.failed", () => router.push(`/orders/${orderId}?error=payment_failed`));
      rzp.open();
    } catch (e: any) {
      // If shipping update fails but it's just a 404 on the patch endpoint, still try to pay
      if (e.message?.includes("shipping")) {
        try {
          const data = await payApprovedOrder(orderId!);
          if ("mock_payment" in data && data.mock_payment) {
            router.push(`/orders/${data.order_id}`);
            return;
          }
          const rpData = data as any;
          if (window.Razorpay) {
            const rzp = new window.Razorpay({
              key: rpData.key_id,
              amount: rpData.amount,
              currency: rpData.currency,
              name: "Jai Fancy Packs",
              order_id: rpData.razorpay_order_id,
              handler: async (response: any) => {
                try {
                  await verifyRazorpayPayment({ order_id: rpData.order_id, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
                  router.push(`/orders/${orderId}`);
                } catch (e) { setErr(e instanceof Error ? e.message : "Verification failed."); }
              },
              theme: { color: "#004B6E" },
              modal: { ondismiss: () => router.push(`/orders/${orderId}`) },
            });
            rzp.open();
          }
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : "Payment initiation failed.");
        }
      } else {
        setErr(e.message || "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || orderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-store-button border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[13px] text-neutral-500">Loading your order…</p>
        </div>
      </div>
    );
  }

  // Still waiting for redirect to fire
  if (!user || !user.is_email_verified) return null;

  if (orderErr || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{orderErr || "Order not found."}</p>
        <Link href="/account/quotes" className="text-store-navy font-bold text-sm hover:underline">← Back to Quotes</Link>
      </div>
    );
  }

  const totalPrice = parseFloat(order.total);
  const subtotal = parseFloat(order.subtotal || order.total);
  const gstTotal = Math.max(0, totalPrice - subtotal);
  const cgst = gstTotal / 2;
  const sgst = gstTotal / 2;
  const hasGst = gstTotal > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

      {/* Left: Address & Payment steps */}
      <div className="lg:col-span-3 space-y-5">
        {/* Step 1: Address */}
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${step === 1 ? "border-store-navy/30" : "border-gray-100"}`}>
          <div
            className="flex items-center justify-between px-6 py-4 cursor-pointer bg-neutral-50/50 border-b border-gray-100"
            onClick={() => setStep(1)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${step >= 1 ? "bg-store-navy text-white" : "bg-gray-200 text-gray-500"}`}>1</div>
              <h2 className="text-[15px] font-bold text-neutral-800">Delivery Address</h2>
            </div>
            {step === 2 && <span className="text-[12px] font-bold text-store-navy hover:text-store-button cursor-pointer">Edit</span>}
          </div>

          {step === 1 && (
            <div className="p-6">
              {savedAddresses.length > 0 && !useNewAddress ? (
                <div>
                  <div className="space-y-3 mb-5">
                    {savedAddresses.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => { applyAddress(addr); setSelectedAddressId(addr.id); }}
                        className={`border rounded-xl p-4 flex gap-3 cursor-pointer transition-all ${selectedAddressId === addr.id ? "border-store-navy bg-store-navy/5" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                      >
                        <input type="radio" name="addr" readOnly checked={selectedAddressId === addr.id} className="mt-1 accent-store-navy" />
                        <div className="text-[13px] text-neutral-700 leading-relaxed">
                          <p className="font-bold text-neutral-900 mb-0.5">{addr.name} {addr.is_default && <span className="ml-2 text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full uppercase">Default</span>}</p>
                          <p>{addr.recipient_name}</p>
                          <p>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</p>
                          <p>{addr.city}, {addr.state} – {addr.postal_code}</p>
                          <p className="text-neutral-500 mt-0.5">📞 {addr.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setStep(2)}
                      disabled={!shipping_name}
                      className="px-7 py-2.5 bg-store-navy text-white text-[12px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black transition-all shadow-sm disabled:opacity-40"
                    >
                      Deliver Here
                    </button>
                    <button onClick={() => setUseNewAddress(true)} className="text-[13px] font-bold text-store-navy hover:text-store-button transition-colors">
                      + Use a new address
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setStep(2); }} className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <button type="button" onClick={() => setUseNewAddress(false)} className="text-[13px] font-bold text-store-navy hover:underline mb-2">
                      ← Saved addresses
                    </button>
                  )}
                  <div>
                    <label className={labelCls}>Pincode</label>
                    <input required type="text" maxLength={6} value={shipping_postal_code}
                      onChange={e => handlePincodeChange(e.target.value)}
                      disabled={pincodeLoading}
                      className={inputCls} placeholder="6-digit PIN code" />
                    {pincodeLoading && <p className="text-[12px] text-blue-500 mt-1">Verifying pincode…</p>}
                    {apiFailed && <p className="text-[12px] text-amber-600 mt-1">Could not auto-detect. Please fill state & city manually.</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>State</label>
                      <input required value={shipping_state} onChange={e => setState(e.target.value)} readOnly={!apiFailed && !!shipping_state} className={`${inputCls} ${!apiFailed && shipping_state ? "bg-gray-50 opacity-70" : ""}`} />
                    </div>
                    <div>
                      <label className={labelCls}>City / District</label>
                      <input required value={shipping_city} onChange={e => setCity(e.target.value)} readOnly={!apiFailed && !!shipping_city} className={`${inputCls} ${!apiFailed && shipping_city ? "bg-gray-50 opacity-70" : ""}`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input required value={shipping_name} onChange={e => setShippingName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone / WhatsApp</label>
                    <input required type="tel" value={shipping_phone} onChange={e => setShippingPhone(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Address Line 1</label>
                    <input required value={shipping_address_line1} onChange={e => setLine1(e.target.value)} placeholder="House no., Building, Street" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Address Line 2 (optional)</label>
                    <input value={shipping_address_line2} onChange={e => setLine2(e.target.value)} placeholder="Area, Landmark" className={inputCls} />
                  </div>
                  <button type="submit" className="px-7 py-2.5 bg-store-navy text-white text-[12px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black transition-all shadow-sm">
                    Use this address
                  </button>
                </form>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="px-6 py-4 text-[13px] text-neutral-700 leading-relaxed">
              <p className="font-bold text-neutral-900">{shipping_name}</p>
              <p>{shipping_address_line1}{shipping_address_line2 ? `, ${shipping_address_line2}` : ""}</p>
              <p>{shipping_city}, {shipping_state} – {shipping_postal_code}</p>
              <p className="text-neutral-500">📞 {shipping_phone}</p>
            </div>
          )}
        </div>

        {/* Step 2: Payment */}
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${step === 2 ? "border-store-navy/30 opacity-100" : "border-gray-100 opacity-50 pointer-events-none"}`}>
          <div className="flex items-center gap-3 px-6 py-4 bg-neutral-50/50 border-b border-gray-100">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${step === 2 ? "bg-store-navy text-white" : "bg-gray-200 text-gray-500"}`}>2</div>
            <h2 className="text-[15px] font-bold text-neutral-800">Payment</h2>
          </div>

          {step === 2 && (
            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                <div>
                  <p className="text-[13px] font-bold text-amber-800 mb-0.5">Secure Bulk Order Payment</p>
                  <p className="text-[12px] text-amber-700">Your approved bulk price is locked in. Pay securely via Razorpay — UPI, Cards, or Net Banking.</p>
                </div>
              </div>

              {err && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  {err}
                </div>
              )}

              <button
                onClick={updateShippingAndPay}
                disabled={busy}
                className="w-full py-4 bg-store-navy text-white text-[13px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-3"
              >
                {busy ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                ) : `Pay ₹${totalPrice.toLocaleString("en-IN")} Securely`}
              </button>
              <p className="text-center text-[11px] text-neutral-400">
                By placing your order, you accept our terms. Payment powered by Razorpay.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-28 space-y-5">
          <h3 className="text-[15px] font-bold text-neutral-900">Order Summary</h3>

          {/* Items */}
          <div className="space-y-3">
            {order.lines?.map((line, i) => (
              <div key={i} className="flex gap-3">
                <div className="relative w-14 h-14 shrink-0 bg-neutral-50 rounded-xl overflow-hidden border border-gray-100">
                  {line.product_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.product_image.startsWith("http") ? line.product_image : `${getApiBase()}${line.product_image}`} alt={line.product_name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-800 leading-tight truncate">{line.product_name}</p>
                  <p className="text-[12px] text-neutral-400 mt-0.5">Qty: {line.quantity}</p>
                  <p className="text-[13px] font-bold text-neutral-900">₹{parseFloat(line.line_total).toLocaleString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal (excl. GST)</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            {hasGst && (
              <>
                <div className="flex justify-between text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 inline-block"></span>
                    CGST (9%)
                  </span>
                  <span>₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 inline-block"></span>
                    SGST (9%)
                  </span>
                  <span>₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-neutral-500 bg-neutral-50 rounded-lg px-2 py-1">
                  <span className="font-medium">Total GST (18%)</span>
                  <span className="font-medium">₹{gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Delivery</span>
              <span className="italic text-[12px]">Calculated at dispatch</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <span className="text-[15px] font-bold text-neutral-900">Total</span>
            <span className="text-[18px] font-bold text-green-700">₹{totalPrice.toLocaleString("en-IN")}</span>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[12px] font-bold text-green-700">Admin-approved bulk pricing applied</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            SSL Secured · Powered by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulkCheckoutPage() {
  return (
    <div className="bg-[#F7F7F5] min-h-screen py-10 md:py-14">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-store-navy tracking-tight mb-1">Bulk Order Checkout</h1>
            <p className="text-[13px] text-neutral-500">Select your delivery address and complete your approved bulk order payment.</p>
          </div>
          <Link href="/account/quotes" className="text-[12px] font-bold text-neutral-400 hover:text-store-navy transition-colors hidden sm:block">
            ← Back to Quotes
          </Link>
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-2 border-store-button border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <BulkCheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
