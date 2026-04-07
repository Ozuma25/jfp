"use client";

import { useEffect, useState } from "react";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type SavedAddress,
} from "@/lib/auth";
import { IconMapPin, IconPlus, IconTrash, IconEdit } from "@/components/icons";
import { Button } from "@/components/ui/Button";



export default function AddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | "new" | null>(null);
  const [formData, setFormData] = useState<Omit<SavedAddress, "id">>({
    name: "",
    recipient_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    is_default: false,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const handlePincodeChange = async (val: string) => {
    setFormData(prev => ({ ...prev, postal_code: val }));
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 6) {
      setPincodeLoading(true);
      setApiFailed(false);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          setFormData(prev => ({ ...prev, state: po.State, city: po.District }));
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
        setFormData(prev => ({ ...prev, state: "", city: "" }));
      }
    }
  };

  async function load() {
    try {
      const data = await fetchAddresses();
      setAddresses(data);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleEdit(addr: SavedAddress) {
    setIsEditing(addr.id);
    setFormData({ ...addr });
  }

  function handleAddNew() {
    setIsEditing("new");
    setFormData({
      name: "",
      recipient_name: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      is_default: addresses.length === 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setErr("");
    try {
      if (isEditing === "new") {
        await createAddress(formData);
      } else if (typeof isEditing === "number") {
        await updateAddress(isEditing, formData);
      }
      setIsEditing(null);
      await load();
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteAddress(id);
      await load();
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Failed to delete address");
    }
  }

  if (loading) return <p className="text-neutral-600">Loading addresses...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Saved Addresses</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your shipping and billing addresses.</p>
        </div>
        {!isEditing && (
          <Button
            onClick={handleAddNew}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <IconPlus className="h-4 w-4" />
            Add New
          </Button>
        )}
      </div>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-6 rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900">
            {isEditing === "new" ? "Add New Address" : "Edit Address"}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700">Address Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Home, Office"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Recipient Name</label>
              <input
                type="text"
                required
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700">Address Line 1</label>
              <input
                type="text"
                required
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none focus:ring-1 focus:ring-store-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Pincode</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.postal_code}
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="6 digit PIN"
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none transition-colors ${pincodeLoading ? 'bg-neutral-100 border-neutral-300' : 'border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy'}`}
              />
              {pincodeLoading && <p className="text-xs text-blue-600 mt-1">Verifying pincode...</p>}
              {apiFailed && <p className="text-xs text-red-500 mt-1">Could not auto fetch. Please enter below.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">State</label>
              <input
                required
                value={formData.state}
                readOnly={!apiFailed && formData.state !== ""}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${!apiFailed && formData.state !== "" ? "bg-neutral-100 border-neutral-200 text-neutral-600 cursor-not-allowed" : "border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy focus:outline-none"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">City / District</label>
              <input
                required
                value={formData.city}
                readOnly={!apiFailed && formData.city !== ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm ${!apiFailed && formData.city !== "" ? "bg-neutral-100 border-neutral-200 text-neutral-600 cursor-not-allowed" : "border-neutral-300 focus:border-store-navy focus:ring-1 focus:ring-store-navy focus:outline-none"}`}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-store-navy focus:ring-store-navy"
              />
              <label htmlFor="is_default" className="text-sm font-medium text-neutral-700">
                Set as default address
              </label>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              isLoading={isBusy}
              variant="primary"
              className="px-8"
            >
              {isBusy ? "Saving..." : "Save Address"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(null)}
              className="px-8"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="relative rounded-lg border border-neutral-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-bold text-neutral-900">{addr.name}</span>
                  {addr.is_default && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    title="Edit"
                  >
                    <IconEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-neutral-600">
                <p className="font-semibold text-neutral-800">{addr.recipient_name}</p>
                <p className="mt-1">{addr.address_line1}</p>
                {addr.address_line2 && <p>{addr.address_line2}</p>}
                <p>
                  {addr.city}, {addr.state} - {addr.postal_code}
                </p>
                <p className="mt-2 text-xs">Phone: {addr.phone}</p>
              </div>
            </div>
          ))}
          {addresses.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 py-12 text-center text-neutral-500 border-2 border-dashed border-neutral-200 rounded-lg">
              <p>No addresses saved yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
