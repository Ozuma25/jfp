"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchOrders, type OrderListItem } from "@/lib/ordersApi";
import { getApiBase } from "@/lib/api";

const statusLabel: Record<string, string> = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusColor: Record<string, string> = {
  pending_payment: "bg-rose-50 text-rose-600",
  paid: "bg-amber-50 text-amber-600",
  processing: "bg-amber-50 text-amber-600",
  shipped: "bg-blue-50 text-blue-600",
  delivered: "bg-green-50 text-green-600",
  cancelled: "bg-neutral-100 text-neutral-500",
};

const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith("/") ? "" : "/"}${path}`;
};

const groupByMonth = (items: any[]) => {
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const key = new Date(item.created_at).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
};

const ITEMS_PER_PAGE = 10;

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "cancelled">("orders");
  const [loading, setLoading] = useState(true);
  const [pageOrders, setPageOrders] = useState(1);
  const [pageCancelled, setPageCancelled] = useState(1);

  useEffect(() => {
    const saved = sessionStorage.getItem("activeOrdersTab");
    if (saved === "orders" || saved === "cancelled") setActiveTab(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchOrders();
        if (!cancelled) setOrders(list);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTabChange = (tab: "orders" | "cancelled") => {
    setActiveTab(tab);
    sessionStorage.setItem("activeOrdersTab", tab);
    setPageOrders(1); setPageCancelled(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeOrders = orders.filter(o => o.status !== "cancelled");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");

  const visibleOrders = activeOrders.slice((pageOrders - 1) * ITEMS_PER_PAGE, pageOrders * ITEMS_PER_PAGE);
  const visibleCancelled = cancelledOrders.slice((pageCancelled - 1) * ITEMS_PER_PAGE, pageCancelled * ITEMS_PER_PAGE);
  const totalOrderPages = Math.ceil(activeOrders.length / ITEMS_PER_PAGE);
  const totalCancelledPages = Math.ceil(cancelledOrders.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 py-2">
        <div className="h-9 bg-gray-100 rounded-xl w-48"></div>
        <div className="flex gap-6 pb-2 border-b border-gray-100">
          {[1, 2, 3].map(n => <div key={n} className="h-4 bg-gray-100 rounded w-20"></div>)}
        </div>
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-[100px] bg-gray-50 rounded-xl border border-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  const Pagination = ({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) => {
    if (total <= 1) return null;
    return (
      <div className="flex justify-between items-center pt-8 mt-4 border-t border-gray-100">
        <button
          onClick={() => { setPage(Math.max(1, page - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          disabled={page === 1}
          className="text-[12px] font-bold tracking-widest uppercase text-store-navy hover:text-store-button transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase">
          {page} of {total}
        </span>
        <button
          onClick={() => { setPage(Math.min(total, page + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          disabled={page === total}
          className="text-[12px] font-bold tracking-widest uppercase text-store-navy hover:text-store-button transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    );
  };

  const EmptyState = ({ message, showCta = false }: { message: string; showCta?: boolean }) => (
    <div className="text-center py-20 bg-neutral-50/60 rounded-2xl border border-gray-100">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <p className="text-neutral-500 text-sm font-medium mb-5">{message}</p>
      {showCta && (
        <Link href="/products" className="inline-block px-6 py-2.5 bg-store-navy text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-store-button hover:text-black shadow-sm transition-all">
          Browse Collection
        </Link>
      )}
    </div>
  );

  const OrderCard = ({ o, isCancelled = false }: { o: OrderListItem; isCancelled?: boolean }) => {
    const imgUrl = resolveImageUrl(o.first_item_image);
    return (
      <div className={`group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 ${isCancelled ? "opacity-70 hover:opacity-100" : ""}`}>
        {/* Image */}
        <div className={`shrink-0 relative w-20 h-20 bg-neutral-50 rounded-xl overflow-hidden border border-gray-100 ${isCancelled ? "grayscale" : ""}`}>
          {imgUrl ? (
            <Image src={imgUrl} alt="Product" fill sizes="80px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[15px] font-semibold text-store-navy tracking-tight">
              Order #{o.order_number || o.id}
            </span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
              isCancelled ? "bg-neutral-100 text-neutral-500" : (statusColor[o.status] ?? "bg-gray-100 text-gray-600")
            }`}>
              {statusLabel[o.status] ?? o.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-[13px] text-neutral-500 truncate max-w-sm font-medium mb-1.5">
            {o.first_item_name || "Custom Order"}
          </p>
          <div className="flex items-center gap-3 text-[12px] text-neutral-400">
            <span>{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="text-gray-200">·</span>
            <span className="font-bold text-store-navy">{o.currency} {o.total}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <Link
            href={`/orders/${o.order_number || o.id}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-store-navy hover:text-store-button transition-colors group/cta"
          >
            View Details
            <span className="transition-transform duration-200 group-hover/cta:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    );
  };


  const GroupedList = ({ items, renderCard }: { items: any[]; renderCard: (item: any) => React.ReactNode }) => {
    const groups = groupByMonth(items);
    return (
      <div className="space-y-8">
        {Object.entries(groups).map(([month, monthItems]) => (
          <div key={month}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{month}</h2>
              <div className="flex-1 h-px bg-gray-100"></div>
              <span className="text-[10px] text-neutral-300 font-bold">{monthItems.length}</span>
            </div>
            <div className="space-y-3">
              {monthItems.map((item: any) => renderCard(item))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="order-history-top">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-store-navy tracking-tight mb-1.5">Order History</h1>
        <p className="text-[13px] text-neutral-500">Track and manage your recent purchases.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-7 border-b border-gray-100 mb-8 overflow-x-auto">
        {(["orders", "cancelled"] as const).map(tab => {
          const labels = { orders: "Active Orders", cancelled: "Cancelled" };
          const counts = { orders: activeOrders.length, cancelled: cancelledOrders.length };
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-3 flex items-center gap-2 text-[13px] font-bold tracking-wide whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab ? "border-store-navy text-store-navy" : "border-transparent text-neutral-400 hover:text-store-navy"
              }`}
            >
              {labels[tab]}
              {counts[tab] > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? "bg-store-navy text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {counts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {err && (
        <div className="mb-8 p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 text-[13px] font-medium">{err}</div>
      )}

      {/* Active Orders */}
      {activeTab === "orders" && (
        activeOrders.length === 0
          ? <EmptyState message="You have no active orders yet." showCta />
          : <>
              <GroupedList items={visibleOrders} renderCard={(o) => <OrderCard key={o.id} o={o} />} />
              <Pagination page={pageOrders} total={totalOrderPages} setPage={setPageOrders} />
            </>
      )}


      {/* Cancelled */}
      {activeTab === "cancelled" && (
        cancelledOrders.length === 0
          ? <EmptyState message="You have no cancelled orders." />
          : <>
              <GroupedList items={visibleCancelled} renderCard={(o) => <OrderCard key={o.id} o={o} isCancelled />} />
              <Pagination page={pageCancelled} total={totalCancelledPages} setPage={setPageCancelled} />
            </>
      )}
    </div>
  );
}
