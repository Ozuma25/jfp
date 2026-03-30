"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api";
import { fetchOrder, cancelOrder, payApprovedOrder, reuploadDesign, verifyRazorpayPayment, type OrderDetail, type CheckoutResponse } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";

const statusLabel: Record<string, string> = {
  under_review: "Under Review (Bespoke Design)",
  design_approved: "Design Approved, Pending Payment",
  design_rejected: "Design Rejected",
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: any) => void) => void; };
  }
}

const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [err, setErr] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOrder = async () => {
    if (!id) return;
    setLoadingOrder(true);
    try {
      const o = await fetchOrder(id as string);
      setOrder(o);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Not found.");
    } finally {
      setLoadingOrder(false);
    }
  };

  useEffect(() => {
    if (!user || !id) return;
    loadOrder();
  }, [user, id]);

  useEffect(() => {
    if (searchParams.get("error") === "payment_failed") {
      setActionErr("Your session closed before payment succeeded. You can retry paying below.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (order?.status === "design_approved" || order?.status === "pending_payment") {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
      return () => {
        if (s.parentNode) s.parentNode.removeChild(s);
      };
    }
  }, [order?.status]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this bespoke order?")) return;
    setActionErr("");
    setBusy(true);
    try {
      if (!id) return;
      await cancelOrder(id as string);
      await loadOrder();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReupload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setActionErr("Please select a new design file first.");
      return;
    }
    setActionErr("");
    setBusy(true);
    try {
      if (!id) return;
      await reuploadDesign(id as string, file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadOrder();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadReceipt() {
    setBusy(true);
    setActionErr("");
    try {
      const token = localStorage.getItem("jfp_access_token");
      const response = await fetch(`${getApiBase()}/api/orders/${id}/receipt/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        let errMsg = "Failed to generate receipt.";
        try {
          const info = await response.json();
          if (info.detail) errMsg = info.detail;
        } catch (e) { /* ignore parse error */ }
        throw new Error(errMsg);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `JFP_Receipt_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePayment() {
    setActionErr("");
    setBusy(true);
    try {
      if (!id) return;
      const data = await payApprovedOrder(id as string);
      if ("mock_payment" in data && data.mock_payment) {
        await loadOrder();
        return;
      }
      
      const rzpData = data as Extract<CheckoutResponse, { razorpay_order_id: string }>;

      if (!window.Razorpay) throw new Error("Payment gateway is securely loading. Please wait a moment.");
      
      const options: Record<string, unknown> = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "Jai Fancy Packs",
        description: `Bespoke Order #${rzpData.order_id}`,
        order_id: rzpData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment({
              order_id: rzpData.order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await loadOrder();
          } catch (e) {
            setActionErr(e instanceof Error ? e.message : "Payment verification failed.");
          }
        },
        prefill: { email: user?.email, name: order?.shipping_name },
        theme: { color: "#004B6E" },
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        if (response && response.error) {
          console.error("Payment failure response error:", response.error);
          const errObj = response.error;
          setActionErr(`Payment Failed: ${errObj.description || errObj.reason || "Something went wrong"}`);
        } else {
          console.error("Payment failure (null/empty response):", response);
          setActionErr("Payment window closed or failed during initialization.");
        }
      });
      rzp.open();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loadingOrder) return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-pulse space-y-6">
      <div className="h-4 bg-gray-200 w-48 rounded mb-6"></div>
      <div className="h-8 bg-gray-200 w-64 rounded mb-6"></div>
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-8"><div className="h-6 bg-gray-200 w-1/3 rounded mb-4"></div><div className="h-4 bg-gray-200 w-1/2 rounded"></div></div>
      <div className="border border-gray-200 rounded-lg p-6 flex justify-between h-24 mb-6"><div className="w-1/3 h-10 bg-gray-200 rounded"></div><div className="w-1/4 h-10 bg-gray-200 rounded"></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="border border-gray-200 rounded-lg p-6 h-64 bg-gray-100"></div><div className="border border-gray-200 rounded-lg p-6 h-64 bg-gray-100"></div></div>
    </div>
  );
  if (!user) return <div className="mx-auto max-w-7xl px-4 py-10"><Link href="/login" className="text-store-navy underline">Log in</Link> to view this order.</div>;
  if (err || !order) return <div className="mx-auto max-w-7xl px-4 py-10"><Link href="/orders" className="text-sm text-store-navy hover:underline">← All orders</Link><p className="mt-4 text-red-600">{err || "Order not found."}</p></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb section */}
      <div className="mb-6 flex items-center justify-between">
        <nav aria-label="breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-store-link">
             <li><Link href="/account" className="hover:underline hover:text-orange-700">Your Account</Link></li>
             <li className="text-gray-500">›</li>
             <li><Link href="/account/orders" className="hover:underline hover:text-orange-700">Your Orders</Link></li>
             <li className="text-gray-500">›</li>
             <li className="text-orange-700">Order Details</li>
          </ol>
        </nav>
      </div>

      <h1 className="text-3xl font-normal leading-tight text-gray-900 mb-6">Order Details</h1>

      {actionErr && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-in fade-in">
          {actionErr}
        </div>
      )}

      {/* Bespoke Actions Panel */}
      {["under_review", "design_rejected", "design_approved", "pending_payment"].includes(order.status) && (
        <div className={`mb-8 p-6 rounded-lg border-2 ${order.status === 'design_rejected' ? 'border-red-200 bg-red-50' : order.status === 'design_approved' ? 'border-green-200 bg-green-50' : 'border-store-button bg-store-button/5'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-widest flex items-center gap-2">
                {order.status === 'design_rejected' && <span className="text-red-500">Action Required</span>}
                {order.status === 'design_approved' && <span className="text-green-600">Design Approved</span>}
                {order.status === 'pending_payment' && <span className="text-store-navy">{order.is_bulk ? "Boutique Quote Ready" : "Awaiting Secure Payment"}</span>}
                {['under_review'].includes(order.status) && <span className="text-store-navy">Under Elite Review</span>}
              </h3>
              
              {order.status === 'under_review' && (
                <p className="text-sm text-gray-700">Your custom design is currently being reviewed by our atelier. We will notify you once approved.</p>
              )}
              
              {order.status === 'design_approved' && (
                <p className="text-sm text-gray-700">Excellent news! Your design meets our premium standards. Please complete your payment to begin production.</p>
              )}

              {order.status === 'pending_payment' && (
                <p className="text-sm text-gray-700">
                  {order.is_bulk 
                    ? "Your boutique quote has been accepted. Please finalize the transaction below to secure your items." 
                    : "Please finalize your payment to proceed with your order."}
                </p>
              )}
              
              {order.status === 'design_rejected' && (
                <>
                  <p className="text-sm text-gray-900 mb-3">Your design requires adjustments before printing.</p>
                  <div className="bg-white border border-red-100 p-4 rounded text-sm text-red-800 italic relative">
                    <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold uppercase text-red-400">Atelier Feedback</span>
                    "{order.admin_rejection_reason || "Please upload a higher quality file."}"
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 min-w-[250px]">
              {(order.status === 'design_approved' || order.status === 'pending_payment') && (
                <Button onClick={handlePayment} isLoading={busy} variant="primary" className="py-3 shadow-lg">Proceed to Secured Payment</Button>
              )}
              
              {order.status === 'design_rejected' && (
                <div className="flex flex-col gap-2">
                  <div className="relative group cursor-pointer border border-store-navy bg-white hover:bg-gray-50 flex items-center overflow-hidden">
                    <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                    <span className="w-full text-center py-2 text-xs font-bold text-store-navy uppercase tracking-widest z-0">Select New File...</span>
                  </div>
                  <Button onClick={handleReupload} isLoading={busy} variant="primary" className="py-2">Upload & Resubmit</Button>
                </div>
              )}

              {["under_review", "design_rejected", "pending_payment"].includes(order.status) && (
                <button onClick={handleCancel} disabled={busy} className="text-xs font-bold text-gray-500 hover:text-red-600 underline text-center mt-2 disabled:opacity-50 transition-colors">
                  Cancel this order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Summary Box */}
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-8">
        <div className="bg-gray-100 flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-300 text-sm">
          <div className="flex flex-col md:flex-row md:gap-12 gap-4">
            <div>
              <p className="text-gray-500 uppercase text-xs mb-1">Order Placed</p>
              <p className="text-gray-900">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase text-xs mb-1">Total</p>
              <p className="text-gray-900 font-bold">{order.currency} {order.total}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase text-xs mb-1">Ship To</p>
              <p className="text-store-link hover:underline hover:text-orange-700 cursor-pointer">{order.shipping_name}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:text-right">
             <p className="text-gray-500 uppercase text-xs mb-1">Order # {order.order_number || order.id}</p>
             {["paid", "processing", "shipped", "delivered"].includes(order.status) && (
               <button 
                 onClick={handleDownloadReceipt}
                 disabled={busy}
                 className={`text-store-link hover:underline hover:text-orange-700 font-medium disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed`}
               >
                 Download Receipt (PDF)
               </button>
             )}
          </div>
        </div>
        
        {/* Tracking progress */}
        <div className="p-6">
           <h2 className="text-2xl font-bold text-gray-900 mb-2">
             {statusLabel[order.status] ?? order.status}
           </h2>
           <p className="text-sm text-gray-700 mb-8">Detailed tracking timeline below.</p>
           
           {/* Visual Tracker */}
           <div className="max-w-3xl mx-auto mb-10 mt-6 relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -mt-0.5 rounded-full z-0"></div>
              {(() => {
                 const step = ["under_review", "design_rejected", "cancelled", "pending_payment", "design_approved"].includes(order.status) ? 0 :
                              ["paid", "processing"].includes(order.status) ? 1 :
                              order.status === "shipped" ? 2 : 3;
                 
                 const pW = step === 1 ? "33%" : step === 2 ? "66%" : step === 3 ? "100%" : "0%";
                 return <div className="absolute top-1/2 left-0 h-1 bg-green-600 -mt-0.5 rounded-full z-0 transition-all duration-1000" style={{width: pW}}></div>;
              })()}
              
              <div className="relative z-10 flex justify-between">
                <div className="flex flex-col items-center">
                   <div className={`w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-300 mb-2 ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-green-600'}`}></div>
                   <span className={`text-sm font-medium ${order.status === 'cancelled' ? 'text-red-600' : 'text-green-700'}`}>{order.status === 'cancelled' ? 'Cancelled' : 'Ordered'}</span>
                </div>
                <div className="flex flex-col items-center">
                   <div className={`w-5 h-5 rounded-full ${['shipped', 'delivered'].includes(order.status) ? 'bg-green-600' : 'bg-gray-300'} border-2 border-white shadow-sm ring-1 ring-gray-300 mb-2`}></div>
                   <span className={`text-sm font-medium ${['shipped', 'delivered'].includes(order.status) ? 'text-green-700' : 'text-gray-500'}`}>Shipped</span>
                </div>
                <div className="flex flex-col items-center">
                   <div className={`w-5 h-5 rounded-full ${order.status === 'delivered' ? 'bg-green-600' : 'bg-gray-300'} border-2 border-white shadow-sm ring-1 ring-gray-300 mb-2`}></div>
                   <span className={`text-sm font-medium ${order.status === 'delivered' ? 'text-green-700' : 'text-gray-500'}`}>Delivered</span>
                </div>
              </div>
           </div>
           
           {/* Items Section */}
           <div className="border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-5">
                 {order.lines.map((line, idx) => (
                    <div key={`${line.product_slug}-${line.quantity}-${line.line_total}-${idx}`} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 relative border border-gray-200 overflow-hidden">
                         {resolveImageUrl(line.product_image) ? (
                            <Image src={resolveImageUrl(line.product_image)!} alt={line.product_name} fill className="object-cover" />
                         ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Product</div>
                         )}
                      </div>
                      <div className="flex-1">
                        <Link href={`/products/${line.product_slug}`} className="text-base font-medium text-store-link hover:underline hover:text-orange-700">
                           {line.product_name}
                        </Link>
                        {line.custom_design_file && <span className="ml-3 inline-block bg-store-button text-black px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">Bespoke</span>}
                        <p className="text-sm text-gray-500 mt-1">Quantity: {line.quantity}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{line.line_total}</p>
                        
                        <div className="mt-3 flex gap-2">
                           {line.custom_design_file && (
                             <button
                               onClick={() => setPreviewFile(resolveImageUrl(line.custom_design_file)!)} 
                               className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors border border-gray-300 shadow-sm flex items-center gap-1.5"
                             >
                               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                               View Design
                             </button>
                           )}
                           {["paid", "processing", "shipped", "delivered"].includes(order.status) && (
                             <button className="bg-store-button text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#D4AF37] transition-colors border border-transparent shadow-sm">
                               Buy it again
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                 ))}
              </div>
              
              <div className="md:w-64 flex flex-col gap-2">
                   {["shipped", "delivered"].includes(order.status) && (
                     <button 
                        onClick={() => {
                          if (order.tracking_url) window.open(order.tracking_url, "_blank");
                          else alert(order.tracking_number ? `Tracking Number: ${order.tracking_number} (${order.tracking_provider})` : "Tracking details are still being updated. Please check back later.");
                        }}
                        className="w-full text-sm py-2 rounded-full border border-gray-300 bg-white shadow-sm hover:bg-gray-50 font-medium"
                      >
                       {order.tracking_url || order.tracking_number ? 'Track package' : 'Tracking Pending'}
                     </button>
                   )}
                   {order.status === "delivered" && (
                     <button className="w-full text-sm py-2 rounded-full border border-gray-300 bg-white shadow-sm hover:bg-gray-50 font-medium">
                       Leave packaging feedback
                     </button>
                   )}
              </div>
           </div>
        </div>
      </div>
      
      {/* Detail grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
         <div className="border border-gray-300 rounded-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 text-lg">Shipping Address</h3>
            <p className="text-sm text-gray-800">
              {order.shipping_name}<br/>
              {order.shipping_address_line1}<br/>
              {order.shipping_address_line2 && <>{order.shipping_address_line2}<br/></>}
              {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}<br/>
              Phone: {order.shipping_phone}
            </p>
         </div>
         <div className="border border-gray-300 rounded-lg p-5">
            <h3 className="font-bold text-gray-900 mb-3 text-lg">Tracking History</h3>
            <div className="space-y-4">
               {[...order.history].reverse().map((h, i, arr) => (
                 <div key={`${h.status}-${h.created_at}`} className="flex gap-3">
                    <div className="text-sm text-gray-500 w-24 flex-shrink-0 pt-0.5">
                       {new Date(h.created_at).toLocaleDateString()}<br/>
                       <span className="text-xs">{new Date(h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <div className={`w-3 h-3 rounded-full mt-1.5 ${i === 0 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                       {i !== arr.length - 1 && <div className="w-0.5 h-full bg-gray-200 my-1"></div>}
                    </div>
                    <div className="pb-3 flex-1">
                       <p className={`font-bold text-sm ${i === 0 ? 'text-green-700' : 'text-gray-800'}`}>
                         {statusLabel[h.status] ?? h.status}
                       </p>
                       {h.note && <p className={`text-sm mt-1 ${h.status === 'design_rejected' ? 'text-red-600 font-medium p-2 bg-red-50 rounded' : 'text-gray-600'}`}>{h.note}</p>}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Modal Preview */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in" onClick={() => setPreviewFile(null)}>
           <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                 <h3 className="font-bold text-gray-900 border-l-4 border-store-navy pl-3">Design Assessment Preview</h3>
                 <button onClick={() => setPreviewFile(null)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-1 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center min-h-[50vh]">
                 {previewFile.toLowerCase().includes('.pdf') ? (
                    <iframe src={previewFile} className="w-full h-[70vh] border-0 rounded bg-white shadow-sm" title="PDF Preview" />
                 ) : (
                    <img src={previewFile} alt="Design Preview" className="max-w-full max-h-[70vh] object-contain rounded shadow-md bg-white border border-gray-200" />
                 )}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                 <a href={previewFile} download target="_blank" rel="noopener noreferrer" className="bg-store-navy text-white px-5 py-2 text-sm font-semibold rounded hover:bg-black transition-colors shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Full Resolution File
                 </a>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
