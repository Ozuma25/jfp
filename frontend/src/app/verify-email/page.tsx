"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

function VerificationProcessor() {
  const { user, refreshUser, broadcastSync } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!uid || !token) {
      setError("Invalid or missing verification link parameters.");
      setLoading(false);
      return;
    }

    verifyEmail(uid, token)
      .then(() => {
        setSuccess(true);
        refreshUser();
        broadcastSync();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Verification failed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [uid, token, refreshUser, broadcastSync]);

  if (loading) {
    return (
      <div className="text-center py-20 animate-pulse">
        <p className="text-lg font-medium text-store-navy">Verifying your email...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-store-navy mb-4">Verification Failed</h1>
        <p className="text-neutral-600 mb-8">{error}</p>
        <Link href="/register">
          <Button variant="outline">Back to Registration</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    // If the user is logged in, auto-redirect them after 2.5 seconds
    if (user) {
      setTimeout(() => {
        router.push("/");
      }, 2500);
      
      return (
        <div className="text-center py-16 animate-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-store-navy mb-4">Email Verified!</h1>
          <p className="text-neutral-600 mb-8">Your account is fully secured. Redirecting you back to the shop...</p>
        </div>
      );
    }

    // If they verified on a different device/browser and aren't logged in
    return (
      <div className="text-center py-16 animate-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-store-navy mb-4">Email Verified!</h1>
        <p className="text-neutral-600 mb-8">Your account is fully verified. You can log in to continue.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  return null;
}

export default function VerifyEmailPage() {
  return (
    <div className="bg-neutral-50 min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 border border-gray-100">
        <Suspense fallback={<div className="text-center py-20 text-neutral-500">Loading...</div>}>
          <VerificationProcessor />
        </Suspense>
      </div>
    </div>
  );
}
