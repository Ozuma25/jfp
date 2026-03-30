"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountSidebar } from "@/components/account/AccountSidebar";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/account");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex flex-col gap-8 md:flex-row">
        <AccountSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
