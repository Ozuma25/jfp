"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

function QuoteFormContent() {
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialQty = searchParams.get("qty") || "100";

  const { user } = useAuth();

  const [productSlug, setProductSlug] = useState(initialProduct);
  const [qty, setQty] = useState(initialQty);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requirements, setRequirements] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email.split("@")[0]);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      // Import api here to avoid SSR issues with some env vars
      const { getApiBase } = await import("@/lib/api");
      
      const payload = {
        product_slug: productSlug,
        quantity: parseInt(qty, 10),
        name,
        email,
        phone,
        requirements,
      };

      const res = await fetch(`${getApiBase()}/api/quotes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quote.");
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white p-10 shadow-xl border-t-4 border-green-600 text-center animate-in fade-in">
        <h2 className="text-2xl font-serif text-store-navy mb-4">Inquiry Received</h2>
        <p className="text-neutral-600 mb-8">
          Thank you for considering Jai Fancy Packs for your premium bulk needs. Our dedicated account manager will review your requirements and reach out within 24 business hours.
        </p>
        <Link href="/products" className="inline-block border-2 border-store-button text-store-navy font-bold text-xs uppercase tracking-widest px-8 py-3 hover:bg-store-button hover:text-black transition-colors">
          Return to Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 md:p-12 shadow-2xl border-t-4 border-store-button">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-in fade-in">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Reference SKU / Product ID</label>
            <input
              required
              type="text"
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
              className="w-full border-gray-200 bg-neutral-50 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-store-button text-sm"
              placeholder="e.g. jfp-premium-box"
              readOnly={!!initialProduct}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Estimated Quantity</label>
            <input
              required
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border-gray-200 bg-neutral-50 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-store-button text-sm"
              placeholder="100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Contact Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!user}
              className={`w-full border-gray-200 px-4 py-3 text-sm ${user ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-neutral-50 focus:outline-none focus:ring-1 focus:ring-store-button'}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              className={`w-full border-gray-200 px-4 py-3 text-sm ${user ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-neutral-50 focus:outline-none focus:ring-1 focus:ring-store-button'}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Phone Number</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border-gray-200 bg-neutral-50 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-store-button text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-store-navy/60 mb-2">Special Requirements</label>
          <textarea
            rows={4}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="w-full border-gray-200 bg-neutral-50 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-store-button text-sm"
            placeholder="Tell us about your customization needs, timeline, or packaging requirements..."
          ></textarea>
        </div>

        <div className="pt-4">
          <Button type="submit" isLoading={busy} className="w-full py-4 uppercase tracking-[0.2em] font-bold shadow-xl rounded-none text-xs">
            Submit Premium Request
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function QuotePage() {
  return (
    <div className="bg-[#F9F9F7] min-h-screen py-12 md:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl md:text-4xl font-serif text-store-navy mb-2 text-center">Boutique Bulk Inquiry</h1>
        <p className="text-neutral-500 text-center text-sm mb-10">Request a specialized quote for high-volume orders.</p>
        <Suspense fallback={<div className="text-center p-10 font-serif italic text-neutral-400">Loading form securely...</div>}>
          <QuoteFormContent />
        </Suspense>
      </div>
    </div>
  );
}
