"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { confirmPasswordReset } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

function ResetPasswordProcessor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If link is malformed
  if (!uid || !token) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-store-navy mb-4">Invalid Link</h1>
        <p className="text-neutral-600 mb-8">This password reset link is invalid or expired.</p>
        <Link href="/forgot-password">
          <Button variant="outline">Request New Link</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await confirmPasswordReset(uid, token, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 4000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-16 animate-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-store-navy mb-4">Password Reset!</h1>
        <p className="text-neutral-600 mb-8">Your password has been successfully updated. Redirecting you to login...</p>
        <Button onClick={() => router.push("/login")}>Go to Login Now</Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-serif text-store-navy mb-3">New Password</h1>
        <p className="text-sm text-neutral-500 font-medium">Create a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-store-button focus:outline-none focus:ring-1 focus:ring-store-button transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-store-navy mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-store-button focus:outline-none focus:ring-1 focus:ring-store-button transition-colors"
              placeholder="••••••••"
            />
          </div>
          <p className="text-[10px] text-neutral-400 font-medium italic">
            Must be at least 8 characters, and contain one uppercase letter and one special character.
          </p>
        </div>

        <Button type="submit" className="w-full py-4 mt-8" disabled={loading}>
          {loading ? "Re-securing..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-neutral-50 min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
        <Suspense fallback={<div className="text-center py-20 text-neutral-500">Loading...</div>}>
          <ResetPasswordProcessor />
        </Suspense>
      </div>
    </div>
  );
}
