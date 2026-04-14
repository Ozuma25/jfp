"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      const nextUrl = searchParams.get("next");
      if (nextUrl && nextUrl.startsWith("/")) {
        router.push(nextUrl);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid email or password.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-neutral-50 min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-store-navy mb-3">Welcome Back</h1>
          <p className="text-sm text-neutral-500 font-medium">Sign in to your Jai Fancy Packs account.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-100 space-y-6">
          {resetSuccess && (
            <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 text-xs font-bold uppercase tracking-wider">
              ✓ Password reset successfully! Please sign in with your new password.
            </div>
          )}

          {err && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-wider">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-store-navy">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-store-button focus:outline-none focus:ring-1 focus:ring-store-button transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-widest text-store-navy">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold uppercase tracking-wider text-store-navy/50 hover:text-store-navy transition-colors hover:underline underline-offset-2"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-4 py-3 text-sm focus:border-store-button focus:outline-none focus:ring-1 focus:ring-store-button transition-colors"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" isLoading={loading} className="w-full py-4" variant="primary">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="pt-4 text-center border-t border-gray-100">
            <p className="text-xs text-neutral-500">
              No account?{" "}
              <a
                href="/register"
                onClick={(e) => { e.preventDefault(); router.push(`/register${window.location.search}`); }}
                className="font-bold text-store-navy hover:underline underline-offset-4"
              >
                Create one now
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-neutral-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
