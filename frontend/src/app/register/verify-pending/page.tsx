"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export default function VerifyPendingPage() {
  const { user } = useAuth();
  const email = user?.email || "your registered email address";

  return (
    <div className="bg-neutral-50 min-h-[60vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 mb-6">
          <svg
            className="h-10 w-10 text-store-navy"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold font-serif text-store-navy mb-4">
          Please check your email
        </h2>
        <p className="text-sm text-neutral-600 mb-8 leading-relaxed">
           We've sent a verification link to <span className="font-semibold text-store-navy">{email}</span>. Click the link in the email to finish setting up your account and unlock wholesale features.
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => {
              window.open("https://mail.google.com", "_blank");
            }}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest"
          >
             Open Gmail App
          </Button>

          <div className="pt-4">
             <Link
               href="/"
               className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-store-navy transition-colors underline-offset-4 hover:underline"
             >
               Verify Later
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
