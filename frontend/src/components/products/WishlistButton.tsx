"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBase } from "@/lib/api";

type Props = {
  productSlug: string;
  productId: number;
  variant?: "icon" | "full";
};

export function WishlistButton({ productId, variant = "icon" }: Props) {
  const { user, loading } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if in wishlist - this could be optimized by passing global wishlist state
    const checkWishlist = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        
        const res = await fetch(`${getApiBase()}/api/wishlist/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.results || [];
          setIsInWishlist(items.some((item: any) => item.product === productId));
        }
      } catch (err) {
        console.error("Wishlist check failed", err);
      }
    };
    
    checkWishlist();
  }, [user, productId]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Redirect to login or show modal
      window.location.href = `/login?next=${window.location.pathname}`;
      return;
    }

    setIsProcessing(true);
    const token = localStorage.getItem("accessToken");
    
    try {
      if (isInWishlist) {
        const res = await fetch(`${getApiBase()}/api/wishlist/remove/${productId}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setIsInWishlist(false);
      } else {
        const res = await fetch(`${getApiBase()}/api/wishlist/`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ product: productId })
        });
        if (res.ok) setIsInWishlist(true);
      }
    } catch (err) {
      console.error("Wishlist toggle failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (variant === "full") {
    return (
      <button
        onClick={toggleWishlist}
        disabled={isProcessing || loading}
        className="flex w-full items-center justify-center gap-2 border border-neutral-200 py-3 text-[10px] font-bold uppercase tracking-widest text-store-navy hover:bg-neutral-50 transition-colors disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isInWishlist ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isInWishlist ? "text-red-500" : ""}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {isInWishlist ? "Saved to Wishlist" : "Save for Later"}
      </button>
    );
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={isProcessing || loading}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-110 disabled:opacity-50 ${
        isInWishlist ? "text-red-500" : "text-neutral-400"
      }`}
      title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={isInWishlist ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
