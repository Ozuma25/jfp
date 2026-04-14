"use client";

import { useState } from "react";

type Props = {
  title: string;
};

export function ShareButton({ title }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or browser unsupported — fall through to clipboard
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Share this product"
      className="group flex items-center gap-2 text-store-navy/50 hover:text-store-navy transition-colors"
    >
      {/* Share Icon */}
      <span className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 group-hover:border-store-navy group-hover:bg-store-navy/5 transition-all">
        {copied ? (
          // Checkmark
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          // Share / Upload icon
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">
        {copied ? "Copied!" : "Share"}
      </span>
    </button>
  );
}
