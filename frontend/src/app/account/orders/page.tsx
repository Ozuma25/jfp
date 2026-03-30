"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchOrders, fetchQuotes, acceptQuote, rejectQuote, type OrderListItem, type BulkQuote } from "@/lib/ordersApi";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

const statusLabel: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [quotes, setQuotes] = useState<BulkQuote[]>([]);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "bulk" | "cancelled">("orders");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function handleAccept(id: number) {
    if (!confirm("Accept this quote and proceed to order payment?")) return;
    try {
      const res = await acceptQuote(id);
      router.push(`/orders/${res.order_number || res.order_id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error accepting quote");
    }
  }

  async function handleReject(id: number) {
    if (!confirm("Are you sure you want to decline this quote?")) return;
    try {
      await rejectQuote(id);
      const quotesList = await fetchQuotes();
      setQuotes(quotesList);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error rejecting quote");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, quotesList] = await Promise.all([
           fetchOrders(),
           fetchQuotes()
        ]);
        if (!cancelled) {
          setOrders(list);
          setQuotes(quotesList);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  if (loading) {
    return (
       <div className="animate-pulse space-y-8 py-4">
         <div className="h-10 bg-gray-200 w-48 rounded"></div>
         <div className="flex gap-8 border-b border-gray-200 pb-2">
           <div className="h-6 bg-gray-200 w-20 rounded"></div>
           <div className="h-6 bg-gray-200 w-24 rounded"></div>
           <div className="h-6 bg-gray-200 w-28 rounded"></div>
         </div>
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
           {[1,2,3,4].map(n => (
             <div key={n} className="border border-gray-200 p-6 flex flex-col h-[280px]">
               <div className="flex justify-between mb-6">
                 <div className="space-y-2"><div className="h-3 bg-gray-200 w-20 rounded"></div><div className="h-4 bg-gray-200 w-24 rounded"></div></div>
                 <div className="space-y-2 text-right flex flex-col items-end"><div className="h-3 bg-gray-200 w-12 rounded"></div><div className="h-4 bg-gray-200 w-16 rounded"></div></div>
               </div>
               <div className="flex gap-4 mb-6">
                 <div className="h-16 w-16 bg-gray-200 rounded flex-shrink-0"></div>
                 <div className="flex-1 space-y-3 pt-1">
                   <div className="h-5 bg-gray-200 w-3/4 rounded"></div>
                   <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
                 </div>
               </div>
               <div className="mt-auto h-10 bg-gray-200 w-full rounded"></div>
             </div>
           ))}
         </div>
       </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-serif text-store-navy mb-8">Order History</h1>

      <div className="flex space-x-8 border-b border-gray-200 mb-8 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
            activeTab === "orders" ? "border-b-2 border-store-navy text-store-navy" : "text-gray-400 hover:text-store-navy"
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
            activeTab === "bulk" ? "border-b-2 border-store-navy text-store-navy" : "text-gray-400 hover:text-store-navy"
          }`}
        >
          Bulk Quotes
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={`pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
            activeTab === "cancelled" ? "border-b-2 border-store-navy text-store-navy" : "text-gray-400 hover:text-store-navy"
          }`}
        >
          Cancelled Orders
        </button>
      </div>

      {err && (
        <p className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-in fade-in">
          {err}
        </p>
      )}

      {activeTab === "orders" &&
        (activeOrders.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 border border-gray-200">
            <p className="text-neutral-600 font-serif italic mb-4">You have no active orders.</p>
            <Link href="/products" className="text-store-button font-bold text-xs uppercase tracking-widest hover:underline">
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {activeOrders.map((o) => (
              <div key={o.id} className="border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Order Placed</p>
                    <p className="text-xs font-bold text-store-navy">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Total</p>
                    <p className="text-xs font-bold text-store-navy">
                      {o.currency} {o.total}
                    </p>
                  </div>
                </div>

                <div className="flex-1 py-4 border-t border-b border-gray-100 mb-4 flex gap-4">
                  {resolveImageUrl(o.first_item_image) ? (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200">
                      <Image src={resolveImageUrl(o.first_item_image)!} alt="Order Product" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200"></div>
                  )}
                  <div>
                    <h3 className="font-serif text-lg text-store-navy mb-1 leading-tight">Order #{o.order_number || o.id}</h3>
                    <p className="text-xs text-neutral-500 mb-2 truncate max-w-[150px]">{o.first_item_name || "Custom Order"}</p>
                    <span
                      className={`inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded ${
                        ["paid", "processing"].includes(o.status)
                          ? "bg-amber-100 text-amber-800"
                          : ["shipped"].includes(o.status)
                          ? "bg-blue-100 text-blue-800"
                          : o.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : o.status === "pending_payment"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabel[o.status] ?? o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/orders/${o.order_number || o.id}`}
                  className="block w-full text-center bg-store-button/10 text-store-navy hover:bg-store-button hover:text-black transition-colors py-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  View Order Details
                </Link>
              </div>
            ))}
          </div>
        ))}

      {activeTab === "bulk" &&
        (quotes.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 border border-gray-200">
            <p className="text-neutral-600 font-serif italic mb-4">You have no bulk quote inquiries.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {quotes.map((q) => (
              <div key={q.id} className="border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Requested On</p>
                    <p className="text-xs font-bold text-store-navy">
                      {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Quantity</p>
                    <p className="text-xs font-bold text-store-navy">{q.quantity} units</p>
                  </div>
                </div>

                <div className="flex-1 py-4 border-t border-b border-gray-100 mb-4 flex gap-4">
                  {resolveImageUrl(q.product_image) ? (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200">
                      <Image src={resolveImageUrl(q.product_image)!} alt="Quote Product" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200"></div>
                  )}
                  <div className="flex-1 flex flex-col items-start">
                    <h3 className="font-serif text-lg text-store-navy mb-1 leading-tight">Quote #{q.id}</h3>
                    <p className="text-xs text-neutral-500 mb-2 truncate max-w-[150px]">{q.product_name || q.product_slug}</p>
                    {q.status === 'quoted' ? (
                       <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded bg-green-100 text-green-800 mb-2`}>
                         Quote Ready: ₹{q.quoted_price_per_unit}/unit
                       </span>
                    ) : q.status === 'accepted' ? (
                       <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded bg-blue-100 text-blue-800 mb-2`}>
                         Accepted — Handled via Order #{q.order_display_number || q.order}
                       </span>
                    ) : q.status === 'rejected' ? (
                       <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded bg-red-100 text-red-800 mb-2`}>
                         Declined
                       </span>
                    ) : (
                       <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded bg-store-navy text-white mb-2`}>
                         Processing Request
                       </span>
                    )}
                  </div>
                </div>

                {q.status === 'quoted' ? (
                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      onClick={() => handleAccept(q.id)}
                      className="flex-1 bg-store-button text-black hover:bg-[#C59B27] transition-colors py-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                    >
                      Accept & Pay
                    </button>
                    <button
                      onClick={() => handleReject(q.id)}
                      className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/products/${q.product_slug}`}
                    className="block w-full text-center bg-white border border-gray-200 text-store-navy hover:bg-gray-50 transition-colors py-3 text-[10px] font-bold uppercase tracking-[0.2em] mt-auto"
                  >
                    View Product
                  </Link>
                )}
              </div>
            ))}
          </div>
        ))}

      {activeTab === "cancelled" &&
        (cancelledOrders.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 border border-gray-200">
            <p className="text-neutral-600 font-serif italic mb-4">You have no cancelled orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 opacity-75">
            {cancelledOrders.map((o) => (
              <div key={o.id} className="border border-gray-200 bg-gray-50 p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Order Placed</p>
                    <p className="text-xs font-bold text-store-navy">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex-1 py-4 border-t border-b border-gray-200 mb-4 flex gap-4">
                  {resolveImageUrl(o.first_item_image) ? (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200">
                      <Image src={resolveImageUrl(o.first_item_image)!} alt="Order Product" fill className="object-cover opacity-50 grayscale" />
                    </div>
                  ) : (
                    <div className="relative h-16 w-16 flex-shrink-0 bg-neutral-100 border border-neutral-200"></div>
                  )}
                  <div>
                    <h3 className="font-serif text-lg text-store-navy mb-1 leading-tight line-through">Order #{o.order_number || o.id}</h3>
                    <p className="text-xs text-neutral-500 mb-2 truncate max-w-[150px] line-through">{o.first_item_name || "Custom Order"}</p>
                    <span className="inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded bg-red-100 text-red-800">
                      Cancelled
                    </span>
                  </div>
                </div>

                <Link
                  href={`/orders/${o.order_number || o.id}`}
                  className="block w-full text-center border-2 border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors py-3 text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
