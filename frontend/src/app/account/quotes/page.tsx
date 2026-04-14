"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchQuotes, acceptQuote, rejectQuote, type BulkQuote } from "@/lib/ordersApi";
import { getApiBase } from "@/lib/api";

const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
};

type TabKey = "pending" | "ready" | "approved" | "expired";

const TAB_CONFIG: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: "pending", label: "Pending Review", statuses: ["pending", "pending_review"] },
  { key: "ready", label: "Ready for Approval", statuses: ["quoted"] },
  { key: "approved", label: "Approved", statuses: ["accepted"] },
  { key: "expired", label: "Expired / Declined", statuses: ["rejected", "expired"] },
];

function ExpiryCountdown({ createdAt }: { createdAt: string }) {
  const EXPIRY_HOURS = 48;
  const expiresAt = new Date(new Date(createdAt).getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setUrgent(h < 6);
      setRemaining(`${h}h ${m}m remaining`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [createdAt]);

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${urgent ? "text-rose-600" : "text-neutral-400"}`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {remaining}
    </span>
  );
}

function QuoteCard({ quote, onAction }: { quote: BulkQuote; onAction: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const imgUrl = resolveImageUrl(quote.product_image);

  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-neutral-100 text-neutral-500" },
    pending_review: { label: "Pending Review", cls: "bg-neutral-100 text-neutral-500" },
    quoted: { label: "Ready", cls: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
    accepted: { label: "Approved", cls: "bg-green-50 text-green-600 ring-1 ring-green-200" },
    rejected: { label: "Declined", cls: "bg-red-50 text-red-500" },
    expired: { label: "Expired", cls: "bg-neutral-100 text-neutral-400" },
  };
  const badge = statusMap[quote.status] ?? { label: quote.status, cls: "bg-gray-100 text-gray-500" };
  const isReady = quote.status === "quoted";
  const isApproved = quote.status === "accepted";
  const isExpiredOrRejected = ["rejected", "expired"].includes(quote.status);

  const totalPrice = quote.quoted_price_per_unit
    ? parseFloat(quote.quoted_price_per_unit) * quote.quantity
    : null;

  const handleApprove = async () => {
    if (!confirm("Approve this quote and proceed to checkout?")) return;
    setBusy(true);
    try {
      const res = await acceptQuote(quote.id);
      // Redirect to bulk checkout where user selects address and pays
      const orderId = res.order_number || res.order_id;
      router.push(`/checkout/bulk?order=${orderId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve");
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Decline this quote?")) return;
    setBusy(true);
    try {
      await rejectQuote(quote.id);
      onAction();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error declining");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`group bg-white rounded-2xl border shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden ${
      isReady ? "border-amber-200" : "border-gray-100"
    }`}>
      {isReady && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Your quote is ready — action required
          </span>
          <ExpiryCountdown createdAt={quote.created_at} />
        </div>
      )}

      <div className="p-5 flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* Image */}
        <div className={`shrink-0 relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-50 border border-gray-100 ${isExpiredOrRejected ? "grayscale opacity-60" : ""}`}>
          {imgUrl ? (
            <Image src={imgUrl} alt="Product" fill sizes="96px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-[15px] font-semibold text-neutral-900 tracking-tight">
                  {quote.product_name || quote.product_slug}
                </h3>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[12px] text-neutral-400">Quote #{quote.id} · {new Date(quote.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Quantity</p>
              <p className="text-[14px] font-semibold text-neutral-800">{quote.quantity.toLocaleString()} units</p>
            </div>
            {totalPrice !== null && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Total Price</p>
                <p className="text-[14px] font-semibold text-green-700">₹{totalPrice.toLocaleString()}</p>
              </div>
            )}
            {quote.quoted_price_per_unit && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Per Unit</p>
                <p className="text-[14px] font-semibold text-neutral-800">₹{quote.quoted_price_per_unit}</p>
              </div>
            )}
          </div>

          {quote.admin_notes && (
            <div className="bg-neutral-50 rounded-xl p-3 mb-3 border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Admin Notes</p>
              <p className="text-[13px] text-neutral-600">{quote.admin_notes}</p>
            </div>
          )}

          {isApproved && quote.order_display_number && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-neutral-400">Converted to:</span>
              <Link href={`/orders/${quote.order_display_number}`} className="font-bold text-store-navy hover:text-store-button transition-colors">
                Order #{quote.order_display_number} →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div className="px-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[11px] text-neutral-400 italic">
          {isReady ? '"This price is reserved for you for a limited time"' :
           isApproved ? "Order has been created successfully." :
           isExpiredOrRejected ? "This quote is no longer active." :
           "Awaiting admin review..."}
        </p>

        <div className="flex gap-2.5 shrink-0">
          {isReady && (
            <>
              <button
                onClick={handleApprove}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-store-navy text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black shadow-md transition-all disabled:opacity-60"
              >
                {busy ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Approve & Checkout
              </button>
              <button
                onClick={handleReject}
                disabled={busy}
                className="inline-flex items-center px-4 py-2.5 bg-neutral-100 text-neutral-500 text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-60"
              >
                Decline
              </button>
            </>
          )}
          {(quote.status === "pending" || quote.status === "pending_review") && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-400 text-[11px] font-bold uppercase tracking-widest rounded-full cursor-not-allowed">
              <div className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-pulse" />
              Awaiting Review
            </div>
          )}
          {isExpiredOrRejected && (
            <Link
              href={`/quote?product=${quote.product_slug}&qty=${quote.quantity}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black transition-all"
            >
              Request Again
            </Link>
          )}
          {isApproved && quote.order_display_number && (
            <Link
              href={`/orders/${quote.order_display_number}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-green-700 transition-all"
            >
              View Order →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyQuotesPage() {
  const [quotes, setQuotes] = useState<BulkQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuotes();
      setQuotes(data);
      // Auto-switch to ready tab if there are ready quotes
      const hasReady = data.some(q => q.status === "quoted");
      if (hasReady) setActiveTab("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load quotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredQuotes = (tab: TabKey) => {
    const cfg = TAB_CONFIG.find(t => t.key === tab);
    if (!cfg) return [];
    return quotes.filter(q => cfg.statuses.includes(q.status));
  };

  const tabCounts = TAB_CONFIG.reduce((acc, t) => {
    acc[t.key] = filteredQuotes(t.key).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const visible = filteredQuotes(activeTab);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 py-2">
        <div className="h-9 bg-gray-100 rounded-xl w-48"></div>
        <div className="flex gap-6 pb-2 border-b border-gray-100">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-4 bg-gray-100 rounded w-24"></div>)}
        </div>
        <div className="space-y-4 pt-2">
          {[1, 2].map(n => <div key={n} className="h-40 bg-gray-50 rounded-2xl border border-gray-100"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-store-navy tracking-tight mb-1.5">My Quotes</h1>
        <p className="text-[13px] text-neutral-500">Manage your bulk quote requests and approve pricing when ready.</p>
      </div>

      {/* Notification banner */}
      {quotes.some(q => q.status === "quoted") && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          </div>
          <p className="text-[13px] text-amber-800 font-medium flex-1">
            You have <strong>{quotes.filter(q => q.status === "quoted").length}</strong> quote(s) ready for approval. Review and approve them before they expire.
          </p>
          <button onClick={() => setActiveTab("ready")} className="text-[11px] font-bold text-amber-700 uppercase tracking-widest hover:text-amber-900 shrink-0">
            View Now →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 mb-7 overflow-x-auto">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 flex items-center gap-2 text-[13px] font-bold tracking-wide whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.key ? "border-store-navy text-store-navy" : "border-transparent text-neutral-400 hover:text-store-navy"
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? tab.key === "ready" ? "bg-amber-500 text-white" : "bg-store-navy text-white"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {err && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-medium">{err}</div>
      )}

      {/* Content */}
      {visible.length === 0 ? (
        <div className="text-center py-20 bg-neutral-50/60 rounded-2xl border border-gray-100">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-neutral-500 text-sm font-medium mb-5">
            No {TAB_CONFIG.find(t => t.key === activeTab)?.label.toLowerCase()} quotes.
          </p>
          <Link href="/quote" className="inline-block px-6 py-2.5 bg-store-navy text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black shadow-sm transition-all">
            Request a Quote
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(q => (
            <QuoteCard key={q.id} quote={q} onAction={load} />
          ))}
        </div>
      )}
    </div>
  );
}
