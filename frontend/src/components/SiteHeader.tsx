"use client";

import Link from "next/link";

import { HeaderActions } from "@/components/HeaderActions";
import { IconSearch } from "@/components/icons";
import { useEffect, useState } from "react";
import { fetchCategories, type Category } from "@/lib/catalog";
import { useAuth } from "@/contexts/AuthContext";
import { resendVerification } from "@/lib/auth";

export function SiteHeader() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleResend = async () => {
    try {
      setResendStatus("loading");
      await resendVerification();
      setResendStatus("success");
      setTimeout(() => setResendStatus("idle"), 6000);
    } catch {
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 6000);
    }
  };

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;

    const currentWord = categories[wordIndex].name;
    const typingSpeed = isDeleting ? 30 : 60;

    const timeout = setTimeout(() => {
      if (!isDeleting && displayText === currentWord) {
        // Pause before starting backspace
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % categories.length);
      } else {
        const nextText = isDeleting
          ? currentWord.substring(0, displayText.length - 1)
          : currentWord.substring(0, displayText.length + 1);
        setDisplayText(nextText);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex, categories]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm transition-all border-b border-gray-100 font-sans">
      {/* Universal Announcement Bar */}
      <div className="bg-store-navy text-white py-2 px-4 text-center">
        <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase">Premium Gifting Solutions — Nationwide Shipping Available</p>
      </div>

      {/* Unverified Email Banner */}
      {user && !user.is_email_verified && (
        <div className="bg-amber-100 border-b border-amber-200 py-2.5 px-4 text-center">
          <p className="text-xs md:text-sm font-medium text-amber-900 tracking-wide">
            <span className="font-bold">Action Required:</span> Please{" "}
            {resendStatus === "success" ? (
              <span className="font-bold text-green-700">check your inbox (sent!)</span>
            ) : resendStatus === "loading" ? (
              <span className="font-bold text-amber-700 opacity-60">sending email...</span>
            ) : (
              <button onClick={handleResend} className="underline underline-offset-2 font-bold hover:text-amber-700 transition-colors">
                verify
              </button>
            )}
            {" "}your email address to unlock checkout and wholesale ordering features.
            {resendStatus === "error" && <span className="text-red-600 font-bold ml-2 text-[10px]">Failed. Try again.</span>}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main Header Bar - Clean 3 Columns */}
        <div className="flex h-20 md:h-24 items-center justify-between gap-4">

          {/* Column 1: Navigation Tools (Left) */}
          <div className="flex flex-1 items-center justify-start gap-8">
            <nav className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-[0.2em] text-store-navy/70">
              <div className="group relative">
                <span className="cursor-pointer hover:text-store-navy transition-colors border-b-2 border-transparent hover:border-store-button pb-1 text-xs">Collections</span>
                {/* Minimalist Dropdown */}
                <div className="absolute top-full left-0 mt-4 w-56 bg-white border border-gray-100 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-3 rounded-md z-[60]">
                  <div className="grid grid-cols-1 gap-1">
                    {categories.slice(0, 10).map(c => (
                      <Link key={c.slug} href={`/products?cat=${c.slug}`} className="block px-3 py-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-store-navy/60 hover:text-store-navy hover:bg-neutral-50 rounded transition-all capitalize">{c.name}</Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Minimalist Search - Fits in Left Side if needed, or stays separate */}
            <form action="/products" method="get" className="hidden xl:flex relative group ml-2">
              <input
                name="search"
                type="search"
                placeholder=" "
                className="peer w-64 bg-neutral-100 border-none rounded-none px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-store-navy focus:w-80 focus:bg-white focus:ring-1 focus:ring-store-button transition-all duration-500 outline-none"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] uppercase tracking-wider text-store-navy/50 opacity-0 peer-placeholder-shown:opacity-100 transition-opacity z-10 flex items-center font-normal">
                Search&nbsp;<span className="font-extrabold text-store-navy/80">"{categories.length === 0 ? 'Collection' : displayText}"</span>
              </div>
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                <IconSearch className="h-4 w-4 text-store-navy/40" />
              </button>
            </form>
          </div>

          {/* Column 2: Logo (Center) */}
          <div className="flex shrink-0 justify-center items-center" style={{ overflow: 'visible' }}>
            <Link href="/" className="group outline-none inline-block text-center relative" style={{ overflow: 'visible' }}>
              {/* Gift ribbon SVG */}
              <span className="absolute -top-5 md:-top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10 scale-75 md:scale-100">
                <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                  <path d="M24 14 C18 4, 6 6, 12 14 C6 22, 18 24, 24 14Z" fill="#C41E3A" opacity="0.85" />
                  <path d="M24 14 C30 4, 42 6, 36 14 C42 22, 30 24, 24 14Z" fill="#C41E3A" opacity="0.85" />
                  <circle cx="24" cy="14" r="3" fill="#9B1B30" />
                  <path d="M18 16 Q12 20, 6 22" stroke="#C41E3A" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
                  <path d="M30 16 Q36 20, 42 22" stroke="#C41E3A" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
                </svg>
              </span>

              {/* Brand name */}
              <span className="relative font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-none whitespace-nowrap block">
                <span className="text-store-navy group-hover:text-store-button transition-colors duration-300">Jai </span>
                <span className="text-store-button italic group-hover:text-store-navy transition-colors duration-300">Fancy </span>
                <span className="text-store-navy group-hover:text-store-button transition-colors duration-300">Packs</span>
              </span>

              {/* Flute — absolutely positioned just below the text, tassels overflow naturally */}
              <img
                src="/images/brand/flute.png"
                alt=""
                className="absolute left-0 w-full h-auto pointer-events-none z-30 opacity-95 group-hover:opacity-100 transition-opacity duration-300"
                style={{ top: 'calc(100% + 2px)' }}
              />
            </Link>
          </div>

          {/* Column 3: Actions (Right) */}
          <div className="flex flex-1 items-center justify-end gap-2 md:gap-6">
            <HeaderActions />
          </div>
        </div>

        <div className="lg:hidden pb-5">
          <form action="/products" method="get" className="relative group">
            <input
              name="search"
              type="search"
              placeholder=" "
              className="peer w-full bg-neutral-100 border-none rounded-none px-4 py-3 text-xs font-bold uppercase tracking-wider text-store-navy focus:bg-white focus:ring-1 focus:ring-store-button transition-all duration-500 outline-none"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] uppercase tracking-wider text-store-navy/50 opacity-0 peer-placeholder-shown:opacity-100 transition-opacity z-10 flex items-center font-normal">
              Search&nbsp;<span className="font-extrabold text-store-navy/80">"{categories.length === 0 ? 'Collection' : displayText}"</span>
            </div>
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
              <IconSearch className="h-5 w-5 text-store-navy/40" />
            </button>
          </form>
        </div>
      </div>

      {/* Category Ticker Bar - Single Line Balanced Design */}
      <div className="bg-[#F9F9F7] border-t border-gray-100 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 lg:gap-4 overflow-hidden">
          {categories.slice(0, 11).map((c) => (
            <Link
              key={c.slug}
              href={`/products?cat=${c.slug}`}
              className="text-[10px] lg:text-[11px] font-bold text-store-navy/50 hover:text-store-navy transition-all uppercase tracking-[0.1em] lg:tracking-[0.15em] whitespace-nowrap"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
