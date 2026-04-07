"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateMe } from "@/lib/auth";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setMessage(null);
    try {
      await updateMe({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });
      await refreshUser();
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-neutral-900">Account Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Update your personal information and contact details.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {message && (
          <div
            className={`rounded-md p-4 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">First Name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Last Name</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Email Address</label>
          <input
            type="email"
            disabled
            value={user?.email || ""}
            className="mt-1 block w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-neutral-400">Email cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-md bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:opacity-50"
          >
            {isBusy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
