import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, Great_Vibes, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { TopProgressBar } from "@/components/TopProgressBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const serif = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Jai Fancy Packs — Premium Wholesale Gifts & Boutique Packaging",
    template: "%s | Jai Fancy Packs",
  },
  description:
    "Exquisite wholesale return gifts and premium packaging since 2023. Shop our boutique collection or request a bulk quote for nationwide delivery.",
  keywords: ["return gifts", "wholesale packaging", "fancy boxes", "wedding return gifts", "bulk gifting India"],
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Jai Fancy Packs",
    description: "Premium Wholesale Gifts & Boutique Packaging since 2023.",
    url: "https://jaifancypacks.com",
    siteName: "Jai Fancy Packs",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jai Fancy Packs",
    description: "Premium Wholesale Gifts & Boutique Packaging.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${dmSans.variable} ${greatVibes.variable} ${serif.variable} min-h-screen bg-[#F9F9F7] font-sans antialiased text-store-navy`}
      >
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
