"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { WhatsAppWidget } from "./WhatsAppWidget";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Isolate the checkout to reduce friction (remove nav bars)
  const isCheckout = pathname === '/checkout';

  return (
    <>
      <div style={{ display: isCheckout ? 'none' : 'block' }}>
        <SiteHeader />
      </div>
      <main className="min-h-[60vh]">{children}</main>
      <div style={{ display: isCheckout ? 'none' : 'block' }}>
        <SiteFooter />
      </div>
      <div style={{ display: isCheckout ? 'none' : 'block' }}>
        <WhatsAppWidget />
      </div>
    </>
  );
}
