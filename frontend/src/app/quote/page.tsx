"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const trustItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    label: "Premium Packaging",
    desc: "Luxury gift-ready boxes included",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    label: "Nationwide Delivery",
    desc: "Pan-India shipping for all orders",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    label: "Dedicated Support",
    desc: "Personal account manager assigned",
  },
];

const inputCls = "w-full bg-neutral-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-store-button/30 focus:border-store-button transition-all placeholder:text-neutral-300";
const labelCls = "block text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2";

function QuoteFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProduct = searchParams.get("product") || "";
  const initialQty = searchParams.get("qty") || "100";
  const { user } = useAuth();

  const [productSlug, setProductSlug] = useState(initialProduct);
  const [qty, setQty] = useState(initialQty);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customization, setCustomization] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email.split("@")[0]);
      setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { getApiBase } = await import("@/lib/api");
      const payload = {
        product_slug: productSlug,
        quantity: parseInt(qty, 10),
        name,
        email,
        phone,
        requirements: [customization, notes].filter(Boolean).join("\n\nNotes: "),
      };
      const res = await fetch(`${getApiBase()}/api/quotes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quote.");
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-3 tracking-tight">Quote Submitted!</h2>
        <p className="text-[14px] text-neutral-500 leading-relaxed max-w-sm mx-auto mb-2">
          Your bulk quote request has been received. Our team will review it and respond within <strong className="text-neutral-700">2–6 hours</strong>.
        </p>
        <p className="text-[13px] text-neutral-400 mb-8">
          You'll be notified via <strong className="text-neutral-600">email</strong> and <strong className="text-neutral-600">WhatsApp</strong> once your quote is ready.
        </p>

        {/* Notification preview */}
        <div className="flex justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-[11px] font-bold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Email Alert
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-600 rounded-full px-4 py-1.5 text-[11px] font-bold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.05.031C5.495.031.031 5.495.031 12.05c0 2.126.553 4.207 1.605 6.02L0 24l6.002-1.571A11.97 11.97 0 0012.05 24C18.605 24 24 18.536 24 11.981 24 5.426 18.605.031 12.05.031zm0 21.785a9.9 9.9 0 01-5.027-1.364l-.361-.213-3.735.978.997-3.635-.234-.375a9.863 9.863 0 01-1.514-5.277c0-5.477 4.459-9.93 9.93-9.93 2.655 0 5.15 1.035 7.023 2.907a9.864 9.864 0 012.907 7.023c-.037 5.471-4.496 9.929-9.986 9.929z"/></svg>
            WhatsApp Alert
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user && (
            <Link href="/account/quotes" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-store-navy text-white text-[12px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black shadow-md transition-all">
              View My Quotes →
            </Link>
          )}
          <Link href="/products" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-600 text-[12px] font-bold uppercase tracking-widest rounded-full hover:bg-neutral-200 transition-all">
            Continue Browsing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.07)] p-7 md:p-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-medium flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Product SKU / ID</label>
              <input required type="text" value={productSlug}
                onChange={e => setProductSlug(e.target.value)}
                readOnly={!!initialProduct}
                className={`${inputCls} ${initialProduct ? "opacity-60 cursor-not-allowed" : ""}`}
                placeholder="e.g. jfp-premium-box" />
            </div>
            <div>
              <label className={labelCls}>Quantity Required</label>
              <input required type="number" min="1" value={qty}
                onChange={e => setQty(e.target.value)}
                className={inputCls} placeholder="100" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input required type="text" value={name}
                onChange={e => setName(e.target.value)}
                disabled={!!user}
                className={`${inputCls} ${user ? "opacity-60 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className={labelCls}>Email Address</label>
              <input required type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!!user}
                className={`${inputCls} ${user ? "opacity-60 cursor-not-allowed" : ""}`} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Phone / WhatsApp</label>
            <input required type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              className={inputCls} placeholder="+91 98765 43210" />
          </div>

          <div>
            <label className={labelCls}>Customization Details</label>
            <textarea rows={3} value={customization}
              onChange={e => setCustomization(e.target.value)}
              className={inputCls}
              placeholder="Logo placement, colors, branding, material preferences..." />
          </div>

          <div>
            <label className={labelCls}>Additional Notes</label>
            <textarea rows={2} value={notes}
              onChange={e => setNotes(e.target.value)}
              className={inputCls}
              placeholder="Delivery timeline, budget range, event details..." />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={busy}
              className="w-full py-4 bg-store-navy text-white text-[12px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-store-button hover:text-black shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-3">
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting…
                </>
              ) : "Submit Quote Request"}
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Guidance */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-800 mb-0.5">Quick Response Guaranteed</p>
              <p className="text-[12px] text-amber-700 leading-relaxed">Our team reviews all requests within <strong>2–6 hours</strong> and sends you a custom price tailored to your order.</p>
            </div>
          </div>
        </div>

        {/* Notification banner */}
        <div className="bg-store-navy/5 border border-store-navy/10 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-store-navy/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          <p className="text-[12px] text-store-navy/70 font-medium leading-relaxed">
            You'll be notified <strong>instantly</strong> on email & WhatsApp when your quote is ready.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Why Jai Fancy Packs</p>
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 bg-neutral-50 rounded-xl flex items-center justify-center text-store-navy shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-neutral-800 leading-tight">{item.label}</p>
                <p className="text-[12px] text-neutral-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function QuotePage() {
  return (
    <div className="bg-[#F7F7F5] min-h-screen py-10 md:py-16">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-store-navy tracking-tight mb-2">Bulk Quote Request</h1>
          <p className="text-[14px] text-neutral-500">Fill in your details below and our team will craft a personalized pricing quote for you.</p>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="w-6 h-6 border-2 border-store-button border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        }>
          <QuoteFormContent />
        </Suspense>
      </div>
    </div>
  );
}
