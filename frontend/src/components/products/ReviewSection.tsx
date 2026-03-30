"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api";
import { IconStar } from "@/components/icons";

type Review = {
  id: number;
  username: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
};

type Props = {
  productId: number;
  productTitle: string;
};

export function ReviewSection({ productId, productTitle }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState("");

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/reviews/?product=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!user) {
      setCanReview(false);
      return;
    }
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${getApiBase()}/api/reviews/can_review/?product=${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCanReview(data.can_review);
      }
    } catch (err) {
      console.error("Failed to check review permission", err);
    }
  };

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setFormError("");
    
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${getApiBase()}/api/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          product: productId,
          rating: formRating,
          comment: formComment
        })
      });
      
      if (res.ok) {
        setFormComment("");
        setShowForm(false);
        fetchReviews();
      } else {
        const data = await res.json();
        setFormError(data.detail || data.non_field_errors?.[0] || "Failed to submit review. You may have already reviewed this product.");
      }
    } catch (err) {
      setFormError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-3xl font-serif text-store-navy">Customer <span className="text-store-button">Curations</span></h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Authentic feedback for {productTitle}</p>
        </div>
        
        {user ? (
          canReview ? (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="text-[10px] font-bold uppercase tracking-widest bg-store-navy text-white px-8 py-3 hover:bg-store-button transition-colors shadow-lg"
            >
              {showForm ? "Cancel Review" : "Share Your Experience"}
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
               <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Reviews restricted to verified purchasers
               </p>
               <p className="text-[8px] font-bold uppercase tracking-widest text-green-600 italic">
                  Complete your order to share your story
               </p>
            </div>
          )
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
             Sign in to share your experience
          </p>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-16 bg-white p-8 border-t-2 border-store-button shadow-xl max-w-2xl">
          <h3 className="text-lg font-serif text-store-navy mb-6">Write your story</h3>
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2">Rating</p>
              <div className="flex gap-2 text-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormRating(star)}
                    className={star <= formRating ? "text-store-button" : "text-gray-200"}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2">Comment</p>
              <textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                required
                rows={4}
                className="w-full border border-gray-100 bg-neutral-50 px-4 py-3 text-sm focus:ring-1 focus:ring-store-button outline-none"
                placeholder="What did you love about this piece?"
              />
            </div>

            {formError && (
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">{formError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-store-button text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all disabled:opacity-50"
            >
              Post My Review
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-20 text-center">
           <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-store-button border-r-transparent"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {reviews.map((review) => (
            <div key={review.id} className="group border-b border-gray-50 pb-10">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-store-navy">{review.username}</span>
                    <span className="text-[9px] text-neutral-400 font-medium uppercase tracking-widest">
                       {new Date(review.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                 </div>
                 <div className="flex gap-0.5 text-store-button">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < review.rating ? "text-store-button text-xs" : "text-gray-100 text-xs"}>★</span>
                    ))}
                 </div>
              </div>
              
              <div className="flex items-start gap-4">
                 {review.is_verified_purchase && (
                   <div className="mt-1 shrink-0" title="Verified Purchase">
                      <div className="h-4 w-4 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                         <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                   </div>
                 )}
                 <p className="text-sm font-medium leading-relaxed text-neutral-600 italic">"{review.comment}"</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-white border border-gray-50 uppercase tracking-[0.3em]">
           <p className="text-neutral-300 font-bold text-xs">Be the first to curate a story</p>
        </div>
      )}
    </div>
  );
}
