"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fetchOrder, cancelOrder, payApprovedOrder, reuploadDesign, verifyRazorpayPayment, type OrderDetail } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";

const statusLabel: Record<string, string> = {
  under_review: "Under Review",
  design_approved: "Design Approved",
  design_rejected: "Design Rejected",
  pending_payment: "Pending Payment",
  paid: "Confirmed",
  processing: "Processing",
  shipped: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const resolveImageUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
};

function ItemReviewForm({ productId, orderId, productTitle, onSuccess }: { productId: number, orderId: number, productTitle: string, onSuccess: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const token = getAccessToken();
      const res = await fetch(`${getApiBase()}/api/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ product: productId, order: orderId, rating, comment })
      });
      if (!res.ok) {
        const data = await res.json();
        // Modern error extraction: prioritizes 'detail', then checks for 'non_field_errors', 
        // then joins any field-level errors into a cohesive message.
        let msg = data.detail || (data.non_field_errors && data.non_field_errors[0]);
        if (!msg && typeof data === 'object') {
           const firstField = Object.keys(data)[0];
           if (firstField && Array.isArray(data[firstField])) msg = data[firstField][0];
           else if (firstField) msg = `${firstField}: ${data[firstField]}`;
        }
        throw new Error(msg || "Submission failed. Please check your network or try again.");
      }
      setSubmitted(true);
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error submitting review.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <p className="review-submitted">Thank you for your feedback on {productTitle}!</p>;

  return (
    <form onSubmit={handleSubmit} className="review-box mt-3 animate-in fade-in">
      <div className="mb-3">
        <p className="form-label mb-1">How would you rate this piece?</p>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type="button" onClick={() => setRating(s)} className={s <= rating ? 'active' : ''}>★</button>
          ))}
        </div>
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your thoughts on the craftsmanship..."
        required
        className="form-control mb-2"
        rows={2}
      />
      {err && <p className="text-danger small fw-bold mb-2">{err}</p>}
      <button type="submit" disabled={busy} className="btn-save btn-sm">
        {busy ? "Posting..." : "Share Story"}
      </button>
    </form>
  );
}

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
  const [showItemReviews, setShowItemReviews] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

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

  useEffect(() => { if (user && id) loadOrder(); }, [user, id]);

  useEffect(() => {
    if (searchParams.get("error") === "payment_failed") {
      setActionErr("Payment process was interrupted. You can retry below.");
    }
  }, [searchParams]);

  async function handleDownloadReceipt() {
    setBusy(true); setActionErr("");
    try {
      const token = getAccessToken();
      const response = await fetch(`${getApiBase()}/api/orders/${id}/receipt/`, {
        method: "GET", headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to generate invoice.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Receipt_JFP_${id}.pdf`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e) { setActionErr(e instanceof Error ? e.message : "Download failed."); } finally { setBusy(false); }
  }

  async function handlePayment() {
    setActionErr(""); setBusy(true);
    try {
      if (!id) return;
      const data = await payApprovedOrder(id as string) as any;
      if (data.mock_payment) { await loadOrder(); return; }
      if (!window.Razorpay) {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => handlePayment();
          document.body.appendChild(s);
          return;
      }
      const options = {
        key: data.key_id, amount: data.amount, currency: data.currency, name: "Jai Fancy Packs",
        description: `Premium Order #${data.order_id}`, order_id: data.razorpay_order_id,
        handler: async (res: any) => {
          try {
            await verifyRazorpayPayment({ order_id: data.order_id, razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature });
            await loadOrder();
          } catch (e) { setActionErr("Verification failed."); }
        },
        prefill: { email: user?.email, name: order?.shipping_name }, theme: { color: "#D4AF37" },
      };
      const rzp = new window.Razorpay!(options); rzp.open();
    } catch (e) { setActionErr("Gateway error."); } finally { setBusy(false); }
  }

  if (authLoading || loadingOrder) return <div className="loading-state">Accessing Order Ledger...</div>;
  if (!user) return <div className="p-5 text-center font-serif">Unauthorized Access.</div>;
  if (err || !order) return <div className="p-5 text-center text-danger font-serif">{err || "Order not located."}</div>;

  return (
    <div className="order-details-modern animate-in fade-in">
      <div className="container-custom py-5">
        
        {/* Breadcrumbs & Navigation */}
        <div className="nav-row mb-4">
          <Link href="/account/orders" className="back-link">
             <span className="me-2">←</span> Back to My Ledger
          </Link>
        </div>

        {actionErr && <div className="alert alert-danger mb-4 shadow-sm">{actionErr}</div>}
        {successMsg && <div className="alert alert-success mb-4 shadow-sm">{successMsg}</div>}

        <div className="row g-4">
          
          {/* LEFT COLUMN: 70% Order Summary + Items */}
          <div className="col-lg-8">
             
             {/* Main Order Card */}
             <div className="order-main-card shadow-sm mb-4 overflow-hidden">
                <div className="card-header-boutique d-flex justify-content-between align-items-center">
                   <div className="d-flex align-items-center gap-4 flex-wrap">
                      <div className="info-item">
                         <label>Order ID</label>
                         <p className="mb-0">#{order.order_number}</p>
                      </div>
                      <div className="info-item">
                         <label>Status</label>
                         <span className={`status-badge ${order.status}`}>{statusLabel[order.status] || order.status}</span>
                      </div>
                      <div className="info-item">
                         <label>Placed On</label>
                         <p className="mb-0">{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="info-item">
                         <label>Grand Total</label>
                         <p className="mb-0 fw-bold">{order.currency} {order.total}</p>
                      </div>
                   </div>
                   {!["pending_payment", "under_review", "design_rejected", "design_approved"].includes(order.status) && (
                     <button onClick={handleDownloadReceipt} disabled={busy} className="btn-invoice">
                        <svg width="14" height="14" fill="currentColor" className="me-2" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                        Receipt
                     </button>
                   )}
                </div>

                <div className="card-body p-0">
                   <div className="items-list">
                      {order.lines.map((line, idx) => (
                         <div key={`${line.product_id}-${idx}`} className="product-row animate-in fade-in transition-all">
                            <div className="d-flex align-items-center justify-content-between p-4 border-bottom-soft">
                               <div className="d-flex align-items-center gap-4">
                                  <div className="product-thumb">
                                     {line.product_image && <Image src={resolveImageUrl(line.product_image)!} alt={line.product_name} fill className="object-cover" />}
                                  </div>
                                  <div className="product-meta">
                                     <h5 className="mb-1">{line.product_name}</h5>
                                     <div className="d-flex align-items-center gap-3">
                                        <span className="text-secondary small">Qty: <span className="text-dark fw-semibold">{line.quantity}</span></span>
                                        <span className="text-secondary small">|</span>
                                        <span className="fw-bold">{line.line_total}</span>
                                        {line.custom_design_file && <span className="badge-bespoke">Custom Design</span>}
                                     </div>
                                  </div>
                               </div>
                               <div className="d-flex align-items-center gap-2">
                                  {line.custom_design_file && <button onClick={() => setPreviewFile(resolveImageUrl(line.custom_design_file)!)} className="btn-outline-boutique">Preview</button>}
                                  <Link href={`/products/${line.product_slug}`} className="btn-boutique-sm">Buy Again</Link>
                               </div>
                            </div>
                            {/* Review portal moved to a dedicated section below */}
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Actionable items like payment or feedback toggle */}
             <div className="d-flex flex-column gap-3 mb-5">
                {["design_approved", "pending_payment"].includes(order.status) && (
                   <Button onClick={handlePayment} isLoading={busy} className="btn-pay shadow-xl px-5 py-3 align-self-end">Finalize & Pay</Button>
                )}
                {order.status === "delivered" && (
                   <div className="align-self-start w-100">
                     <button onClick={() => setShowItemReviews(!showItemReviews)} className="btn-feedback-action mb-4">
                        {showItemReviews ? "Close Review Portal" : "Leave a Review"}
                     </button>
                     
                     {showItemReviews && (
                        <div className="review-portal-container p-4 bg-white shadow-sm rounded-lg border border-gray-100 animate-in slide-in-from-top-2">
                           {/* Deduplicate lines by product_id for review purposes */}
                           {Array.from(new Map(order.lines.map(item => [item.product_id, item])).values()).map((line, idx) => (
                              <div key={`review-${line.product_id}`} className={idx > 0 ? "pt-4 border-t border-gray-100 mt-4" : ""}>
                                 <h6 className="text-[11px] font-bold uppercase tracking-widest text-store-navy mb-1">{line.product_name}</h6>
                                 <ItemReviewForm productId={line.product_id} orderId={order.id} productTitle={line.product_name} onSuccess={() => setSuccessMsg("Review successfully shared!")} />
                              </div>
                           ))}
                        </div>
                     )}
                   </div>
                )}
             </div>
          </div>

          {/* RIGHT COLUMN: 30% Sidebar */}
          <div className="col-lg-4">
             <div className="sidebar-stack space-y-4">
                
                {/* 1. Precise Status Card */}
                <div className="status-history-card shadow-sm">
                   <h3 className="section-title-premium mb-3">Live Status</h3>
                   <div className="d-flex align-items-center gap-3 bg-neutral-50 p-3 border border-gray-100 rounded-lg">
                      <span className="pulse-dot"></span>
                      <div>
                         <p className="mb-0 fw-bold text-store-navy">{statusLabel[order.status] || order.status}</p>
                         <p className="mb-0 small text-secondary">Updated {new Date(order.history[order.history.length-1]?.created_at || order.created_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                </div>

                {/* 2. Tracking Timeline Card */}
                <div className="timeline-card shadow-sm">
                   <h3 className="section-title-premium mb-4">Journey Ledger</h3>
                   <div className="timeline-vertical">
                      {(() => {
                         const history = [...order.history].reverse();
                         return history.map((h, i) => (
                           <div key={i} className={`timeline-step ${i === 0 ? 'active' : ''}`}>
                              <div className="step-point"></div>
                              {i < history.length - 1 && <div className="step-line"></div>}
                              <div className="step-content">
                                 <p className="status-text">{statusLabel[h.status] || h.status}</p>
                                 <p className="timestamp-text">{new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                 {h.note && <p className="note-text italic">{h.note}</p>}
                              </div>
                           </div>
                         ));
                      })()}
                   </div>
                </div>

                {/* 3. Destination Card */}
                <div className="address-card shadow-sm">
                   <h3 className="section-title-premium mb-3">Delivery Destination</h3>
                   <div className="destination-details">
                      <p className="name-recipient mb-1">{order.shipping_name}</p>
                      <address className="mb-0 small text-secondary leading-relaxed font-medium">
                         {order.shipping_address_line1}<br/>
                         {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
                      </address>
                   </div>
                </div>

             </div>
          </div>

        </div>
      </div>

      {previewFile && (
        <div className="preview-modal" onClick={() => setPreviewFile(null)}>
           <div className="modal-content-glass" onClick={e => e.stopPropagation()}>
              <div className="modal-header d-flex justify-content-between p-3 border-bottom">
                 <h6 className="mb-0 font-serif">Bespoke Design Preview</h6>
                 <button className="close-btn" onClick={() => setPreviewFile(null)}>×</button>
              </div>
              <div className="modal-body p-4 bg-neutral-50 text-center">
                 {previewFile.toLowerCase().includes('.pdf') ? <iframe src={previewFile} className="w-full h-screen-70 border-0 rounded" /> : <img src={previewFile} alt="Design" className="img-fluid rounded shadow-lg max-h-[70vh]" />}
              </div>
           </div>
        </div>
      )}

      <style>{`
        .order-details-modern {
           --accent-gold: #D4AF37;
           --accent-green: #008148;
           --dark-navy: #004B6E;
           --soft-bg: #F9F9F7;
           --border-color: rgba(0,0,0,0.06);
           background-color: var(--soft-bg);
           min-h: 100vh;
           font-family: var(--font-dm-sans), system-ui, sans-serif;
        }

        .container-custom {
           max-width: 1240px;
           margin: 0 auto;
           padding-left: 1.5rem;
           padding-right: 1.5rem;
        }

        /* Card Styles */
        .order-main-card, .status-history-card, .timeline-card, .address-card {
           background: #ffffff;
           border-radius: 12px;
           border: 1px solid var(--border-color);
           padding: 1.5rem;
           transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .order-main-card { padding: 0; }
        .order-main-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1) !important; }

        .card-header-boutique {
           background-color: #ffffff;
           padding: 1.25rem 1.5rem;
           border-bottom: 1px solid var(--border-color);
        }

        .info-item label {
           display: block;
           font-size: 10px;
           text-transform: uppercase;
           letter-spacing: 0.15em;
           font-weight: 700;
           color: #94a3b8;
           margin-bottom: 4px;
        }
        .info-item p { font-size: 14px; font-weight: 600; color: var(--dark-navy); }

        /* Badges */
        .status-badge {
           font-size: 9px;
           text-transform: uppercase;
           font-weight: 800;
           letter-spacing: 0.1em;
           padding: 4px 10px;
           border-radius: 4px;
           background: #f1f5f9;
           color: #64748b;
        }
        .status-badge.delivered { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .status-badge.shipped { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
        .status-badge.paid, .status-badge.processing { background: #ecfdf5; color: #059669; }
        .status-badge.cancelled { background: #fef2f2; color: #dc2626; }

        .badge-bespoke {
           font-size: 8px;
           text-transform: uppercase;
           font-weight: 800;
           letter-spacing: 0.2em;
           background: var(--accent-gold);
           color: #000;
           padding: 2px 6px;
           border-radius: 3px;
        }

        /* Product Rows */
        .product-row:hover { background-color: #fafaf9; }
        .border-bottom-soft { border-bottom: 1px solid rgba(0,0,0,0.03); }
        .product-thumb { width: 56px; height: 56px; position: relative; border-radius: 8px; overflow: hidden; background: #f1f1f1; border: 1px solid rgba(0,0,0,0.05); }
        .product-meta h5 { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: var(--dark-navy); }
        
        /* Buttons */
        .btn-invoice {
           background: #ffffff;
           border: 1px solid #e2e8f0;
           padding: 8px 16px;
           font-size: 11px;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.1em;
           border-radius: 8px;
           color: var(--dark-navy);
           transition: all 0.2s;
        }
        .btn-invoice:hover { background: var(--dark-navy); color: #fff; border-color: var(--dark-navy); }
        
        .btn-boutique-sm { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #fff; background: var(--dark-navy); padding: 8px 16px; border-radius: 6px; text-decoration: none; transition: 0.2s; }
        .btn-boutique-sm:hover { background: #000; transform: scale(1.05); }
        
        .btn-outline-boutique { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: var(--dark-navy); background: transparent; padding: 7px 15px; border-radius: 6px; border: 1.5px solid var(--dark-navy); transition: 0.2s; }
        .btn-outline-boutique:hover { background: var(--dark-navy); color: #fff; }

        /* Timeline Vertical */
        .section-title-premium { font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.2em; color: #94a3b8; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.75rem; }
        
        .timeline-vertical { padding-left: 0.5rem; }
        .timeline-step { position: relative; padding-left: 24px; padding-bottom: 20px; }
        .timeline-step.active .step-point { background-color: var(--accent-green); border-color: #fff; box-shadow: 0 0 0 4px rgba(0, 129, 72, 0.1); }
        .timeline-step.active .status-text { color: var(--accent-green); }
        
        .step-point { position: absolute; left: 0; top: 0; width: 10px; height: 10px; background-color: #e2e8f0; border-radius: 50%; z-index: 2; }
        .step-line { position: absolute; left: 4.5px; top: 10px; width: 1px; height: 100%; background-color: #f1f5f9; z-index: 1; }
        
        .status-text { font-size: 13px; font-weight: 700; color: var(--dark-navy); margin-bottom: 2px; line-height: 1; }
        .timestamp-text { font-size: 10px; color: #94a3b8; font-weight: 500; margin-bottom: 4px; }
        .note-text { font-size: 11px; color: #64748b; line-height: 1.4; }

        /* Destination */
        .name-recipient { font-weight: 700; color: var(--dark-navy); font-size: 14px; }
        
        /* Pulse */
        .pulse-dot { width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; position: relative; }
        .pulse-dot::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--accent-green); border-radius: 50%; animation: pulse-ring 2s infinite; }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(3); opacity: 0; } }

        /* Miscellaneous utilities for Bootstrap feel */
        .row { display: flex; flex-wrap: wrap; margin-right: -0.75rem; margin-left: -0.75rem; }
        .col-lg-8 { flex: 0 0 auto; width: 66.666667%; padding: 0.75rem; }
        .col-lg-4 { flex: 0 0 auto; width: 33.333333%; padding: 0.75rem; }
        @media (max-width: 991px) { .col-lg-8, .col-lg-4 { width: 100%; } }
        
        .d-flex { display: flex !important; }
        .flex-column { flex-direction: column !important; }
        .align-items-center { align-items: center !important; }
        .justify-content-between { justify-content: space-between !important; }
        .gap-2 { gap: 0.5rem !important; }
        .gap-3 { gap: 0.75rem !important; }
        .gap-4 { gap: 1rem !important; }
        .ms-2 { margin-left: 0.5rem !important; }
        .mb-0 { margin-bottom: 0 !important; }
        .mb-2 { margin-bottom: 0.5rem !important; }
        .mb-3 { margin-bottom: 0.75rem !important; }
        .mb-4 { margin-bottom: 1rem !important; }
        .me-2 { margin-right: 0.5rem !important; }
        .p-4 { padding: 1.5rem !important; }
        .py-5 { padding-top: 3rem !important; padding-bottom: 3rem !important; }
        .shadow-sm { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03) !important; }
        .rounded-lg { border-radius: 0.75rem !important; }
        .fw-bold { font-weight: 700 !important; }
        .text-secondary { color: #64748b !important; }
        .small { font-size: 0.875em !important; }

        /* High-end Form styling */
        .form-control { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 15px; font-size: 13px; background: #f8fafc; }
        .btn-save { background: var(--dark-navy); color: #fff; border: none; border-radius: 8px; padding: 8px 20px; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; transition: 0.2s; }
        .btn-save:hover { background: #000; }
        .star-rating button { background: none; border: none; font-size: 20px; color: #e2e8f0; transition: color 0.1s; }
        .star-rating button.active { color: var(--accent-gold); }

        .btn-feedback-action {
           background: #ffffff;
           border: 1.5px solid var(--dark-navy);
           color: var(--dark-navy);
           padding: 10px 24px;
           border-radius: 8px;
           font-size: 11px;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.15em;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           box-shadow: 0 4px 6px -1px rgba(0, 75, 110, 0.1);
        }
        .btn-feedback-action:hover {
           background: var(--dark-navy);
           color: #fff;
           transform: translateY(-1px);
           box-shadow: 0 10px 20px -10px rgba(0, 75, 110, 0.3);
        }

        .preview-modal { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .modal-content-glass { background: #fff; width: 100%; max-width: 900px; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .close-btn { background: none; border: none; font-size: 24px; color: #94a3b8; }
      `}</style>
    </div>
  );
}
