"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateMe } from "@/lib/auth";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  
  const [isBusiness, setIsBusiness] = useState(user?.is_business || false);
  const [companyName, setCompanyName] = useState(user?.company_name || "");
  const [gstNumber, setGstNumber] = useState(user?.gst_number || "");
  const [companyPhone, setCompanyPhone] = useState(user?.company_phone || "");
  const [companyEmail, setCompanyEmail] = useState(user?.company_email || "");
  const [companyAddress, setCompanyAddress] = useState(user?.company_address || "");
  const [companyCity, setCompanyCity] = useState(user?.company_city || "");
  const [companyState, setCompanyState] = useState(user?.company_state || "");
  const [companyCountry, setCompanyCountry] = useState(user?.company_country || "India");
  const [companyPincode, setCompanyPincode] = useState(user?.company_pincode || "");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const handleCompanyPincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setCompanyPincode(cleaned);
    if (cleaned.length === 6) {
      setPincodeLoading(true);
      setApiFailed(false);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          setCompanyState(po.State);
          setCompanyCity(po.District);
          setCompanyCountry("India");
        } else {
          setApiFailed(true);
        }
      } catch (e) {
        setApiFailed(true);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      if (cleaned.length < 6) {
        setCompanyState("");
        setCompanyCity("");
      }
    }
  };

  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setMessage(null);
    try {
      await updateMe({
        email: email !== user?.email ? email : undefined,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        is_business: isBusiness,
        company_name: isBusiness ? companyName : "",
        gst_number: isBusiness ? gstNumber : "",
        company_phone: isBusiness ? companyPhone : "",
        company_email: isBusiness ? companyEmail : "",
        company_address: isBusiness ? companyAddress : "",
        company_city: isBusiness ? companyCity : "",
        company_state: isBusiness ? companyState : "",
        company_country: isBusiness ? companyCountry : "",
        company_pincode: isBusiness ? companyPincode : "",
      });
      await refreshUser();
      if (email !== user?.email) {
        setMessage({ type: "warning", text: "Profile updated! You've changed your email, so please check your new email to verify it." });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      }
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
                : message.type === "warning"
                ? "bg-yellow-50 text-yellow-800"
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
          />
          <p className="mt-1 text-xs text-neutral-500">Changing your email will require re-verification.</p>
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

        <div className="pt-4 border-t border-neutral-200">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isBusinessProfile"
              checked={isBusiness}
              onChange={(e) => setIsBusiness(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-store-navy focus:ring-store-navy cursor-pointer"
            />
            <label htmlFor="isBusinessProfile" className="text-sm font-medium text-neutral-800 cursor-pointer">
              I am a business customer
            </label>
          </div>

          {isBusiness && (
            <div className="mt-4 space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Name *</label>
                <input
                  required={isBusiness}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">GST Number *</label>
                <input
                  required={isBusiness}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Phone</label>
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Email</label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Address</label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm resize-y focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={companyPincode}
                  onChange={(e) => handleCompanyPincodeChange(e.target.value)}
                  placeholder="6 digit PIN"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none transition-colors ${pincodeLoading ? 'bg-neutral-100 border-neutral-300' : 'border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy'}`}
                />
                {pincodeLoading && <p className="text-xs text-blue-600 mt-1">Verifying...</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Company State</label>
                  <input
                    value={companyState}
                    readOnly={!apiFailed && companyState !== ""}
                    onChange={(e) => setCompanyState(e.target.value)}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${!apiFailed && companyState !== "" ? "bg-neutral-100 border-neutral-200 text-neutral-600 cursor-not-allowed" : "border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy focus:outline-none"}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Company District / City</label>
                  <input
                    value={companyCity}
                    readOnly={!apiFailed && companyCity !== ""}
                    onChange={(e) => setCompanyCity(e.target.value)}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${!apiFailed && companyCity !== "" ? "bg-neutral-100 border-neutral-200 text-neutral-600 cursor-not-allowed" : "border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy focus:outline-none"}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Company Country</label>
                <input
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
                />
              </div>
            </div>
          )}
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
