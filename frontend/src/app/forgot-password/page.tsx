"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-neutral-50 min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 mb-6">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-serif text-store-navy mb-4">Check your email</h2>
          <p className="text-sm text-neutral-600 mb-8 leading-relaxed">
            If an account exists for <span className="font-semibold">{email}</span>, we have sent a password reset link. Please check your inbox and spam folder.
          </p>
          <Button
            onClick={() => window.open("https://mail.google.com", "_blank")}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest mb-4"
          >
            Open Gmail App
          </Button>
          <Link href="/login" className="block text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-store-navy transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-store-navy mb-3">Forgot Password</h1>
          <p className="text-sm text-neutral-500 font-medium">Enter your email address to receive a secure reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-wider">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-store-navy">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-store-button focus:outline-none focus:ring-1 focus:ring-store-button transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <Button type="submit" className="w-full py-4" disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link"}
          </Button>

          <div className="pt-4 text-center border-t border-gray-100">
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-store-navy transition-colors hover:underline underline-offset-4"
            >
              Return to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
