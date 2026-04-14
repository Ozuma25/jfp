"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveApiFetchUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { IconStar } from "@/components/icons";

type Review = {
  id: number;
  reviewer_name: string;
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
      const listUrl = await resolveApiFetchUrl(`/api/reviews/?product=${productId}`);
      const res = await fetch(listUrl);
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
      const token = getAccessToken();
      const canUrl = await resolveApiFetchUrl(`/api/reviews/can_review/?product=${productId}`);
      const res = await fetch(canUrl, {
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
      const token = getAccessToken();
      const postUrl = await resolveApiFetchUrl("/api/reviews/");
      const res = await fetch(postUrl, {
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
    <div className="mt-20 border-t border-gray-100 py-16 px-4 md:px-0 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-10">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column: Summary */}
          <div className="lg:col-span-4 space-y-8">
            {reviews.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-neutral-900 leading-none">
                    {(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex text-store-button text-xl">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const avg = reviews.reduce((a, b) => a + b.rating, 0) / reviews.length;
                        return <span key={i} className={i < Math.floor(avg) ? "text-store-button" : "text-gray-200"}>★</span>;
                      })}
                    </div>
                    <span className="text-sm text-neutral-500 mt-1">{reviews.length} global ratings</span>
                  </div>
                </div>

                {/* Simulated Histogram for Visuals */}
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-12 text-neutral-600 font-medium hover:underline cursor-pointer">{star} star</span>
                        <div className="flex-1 h-3 bg-gray-200 rounded overflow-hidden">
                          <div className="h-full bg-store-button rounded" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-10 text-right text-neutral-500">{Math.round(percent)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-neutral-500">No reviews yet.</div>
            )}

            <div className="pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Review this product</h3>
              <p className="text-sm text-neutral-500 mb-6">Share your thoughts with other customers</p>
              
              {user ? (
                canReview ? (
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full py-2 px-4 bg-white border border-gray-300 rounded-full text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    {showForm ? "Cancel Review" : "Write a customer review"}
                  </button>
                ) : (
                  <div className="text-sm text-neutral-500 bg-neutral-50 p-4 rounded-lg">
                    Only verified purchasers can write a review.
                  </div>
                )
              ) : (
                <div className="text-sm text-neutral-500 bg-neutral-50 p-4 rounded-lg">
                  Please log in to write a review.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Reviews List */}
          <div className="lg:col-span-8">
            {/* Form */}
            {showForm && (
              <div className="mb-10 bg-neutral-50 p-6 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-top-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="text-lg font-bold text-neutral-900">Write your review</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Overall rating</label>
                    <div className="flex gap-2 text-3xl">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          className={`transition-transform hover:scale-110 ${star <= formRating ? "text-store-button" : "text-gray-300"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Add a written review</label>
                    <textarea
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      required
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-store-button/30 focus:border-store-button outline-none"
                      placeholder="What did you like or dislike? What did you use this product for?"
                    />
                  </div>

                  {formError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                      {formError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-store-navy text-white text-sm font-medium rounded-full hover:bg-store-button transition-colors shadow-md disabled:opacity-50"
                    >
                      Submit Review
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-store-button border-t-transparent"></div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-8 divide-y divide-gray-200">
                {reviews.map((review) => (
                  <div key={review.id} className="pt-8 first:pt-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 font-bold text-sm">
                        {review.reviewer_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{review.reviewer_name}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex text-store-button text-sm">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < review.rating ? "text-store-button" : "text-gray-300"}>★</span>
                        ))}
                      </div>
                      {review.is_verified_purchase && (
                        <span className="text-xs font-bold text-orange-600 ml-1">Verified Purchase</span>
                      )}
                    </div>

                    <div className="text-xs text-neutral-500 mb-3">
                      Reviewed on {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>

                    <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 bg-neutral-50 rounded-xl border border-gray-100 px-6 text-center">
                <p className="text-neutral-500">No customer reviews yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
