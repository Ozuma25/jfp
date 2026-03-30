"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { IconCart, IconUser } from "@/components/icons";
import { fetchCart } from "@/lib/cartApi";

export function HeaderActions() {
  const { user, logout } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const c = await fetchCart();
        if (cancelled) return;
        if (c && Array.isArray(c.items)) {
          const totalQty = c.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          setCount(totalQty);
          // Sync with local storage if possible or just update state
        } else {
          setCount(0);
        }
      } catch (e) {
        console.error("Cart fetch failed:", e);
        if (!cancelled) setCount(0);
      }
    }
    
    // Initial load
    load();

    const handleUpdate = () => {
      load();
    };

    window.addEventListener("jfp-cart-updated", handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("jfp-cart-updated", handleUpdate);
    };
  }, [user]);

  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-6">
      {user ? (
        <div className="relative group cursor-pointer py-4 flex flex-col justify-center">
          <Link
            href="/account"
            className="flex flex-col items-end justify-center"
          >
            <span className="text-[10px] uppercase tracking-widest font-bold text-store-navy/40 leading-tight group-hover:text-store-navy transition-colors">Hello, {user.first_name || "Member"}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-store-navy leading-tight">My Account</span>
          </Link>
          <div className="absolute top-full right-0 w-48 bg-white border border-gray-100 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-3 rounded-md z-[60]">
            <div className="grid grid-cols-1 gap-1">
              <Link href="/account" className="block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-store-navy/60 hover:text-store-navy hover:bg-neutral-50 rounded transition-all">Profile</Link>
              <Link href="/account/orders" className="block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-store-navy/60 hover:text-store-navy hover:bg-neutral-50 rounded transition-all">My Orders</Link>
              <Link href="/account/addresses" className="block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-store-navy/60 hover:text-store-navy hover:bg-neutral-50 rounded transition-all">Address</Link>
              <button 
                onClick={async () => { await logout(); window.location.href = '/'; }} 
                className="w-full text-left block px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-red-500/80 hover:text-red-700 hover:bg-red-50 rounded transition-all mt-2 border-t border-red-50 pt-3"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex flex-col items-end justify-center group"
        >
          <span className="text-[10px] uppercase tracking-widest font-bold text-store-navy/40 leading-tight group-hover:text-store-navy transition-colors">SignIn</span>
          <span className="text-xs font-bold uppercase tracking-wider text-store-navy leading-tight">Account</span>
        </Link>
      )}

      <Link
        href="/account/orders"
        className="hidden md:flex flex-col items-end justify-center group"
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-store-navy/40 leading-tight group-hover:text-store-navy transition-colors">Returns</span>
        <span className="text-xs font-bold uppercase tracking-wider text-store-navy leading-tight">& Orders</span>
      </Link>

      <Link
        id="cart-icon-target"
        href="/cart"
        className="relative flex items-center group bg-neutral-100 p-2.5 rounded-full hover:bg-store-navy transition-all"
      >
        <div className="relative">
           <IconCart className="h-4 w-4 text-store-navy group-hover:text-white transition-colors" />
           {count > 0 && (
             <span
               id="cart-count-badge"
               className="absolute -right-2.5 -top-2.5 h-4 w-4 rounded-full bg-store-button text-[9px] font-bold text-black flex items-center justify-center shadow-sm"
             >
               {count > 9 ? "9+" : count}
             </span>
           )}
        </div>
      </Link>
    </div>
  );
}
