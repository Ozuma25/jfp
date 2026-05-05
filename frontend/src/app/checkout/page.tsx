"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkoutRequest,
  fetchShippingInfo,
  verifyRazorpayPayment,
  type CheckoutResponse,
  type ShippingInfo,
  type ShippingMethodId,
} from "@/lib/ordersApi";
import { fetchCart, updateCartItem, removeCartItem, type CartData } from "@/lib/cartApi";
import { fetchAddresses, createAddress, type SavedAddress, updateMe } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: any) => void) => void; };
  }
}

export default function CheckoutPage() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [cart, setCart] = useState<CartData | null>(null);
  const [cartBusy, setCartBusy] = useState<number | null>(null); // item id being updated

  const [step, setStep] = useState<1 | 2>(1); // 1 = Address, 2 = Payment
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [isBusinessOrder, setIsBusinessOrder] = useState(false);
  const [selectedAddressKey, setSelectedAddressKey] = useState<string | null>(null); // "company" | "<id>"
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>("doorstep");
  const prevShippingMethod = useRef<ShippingMethodId>(shippingMethod);
  
  const [promptBusinessSave, setPromptBusinessSave] = useState(false);
  const [bCompanyName, setBCompanyName] = useState("");
  const [bGstNumber, setBGstNumber] = useState("");
  const [bCompanyPhone, setBCompanyPhone] = useState("");
  const [bCompanyEmail, setBCompanyEmail] = useState("");
  const [bCompanyAddress, setBCompanyAddress] = useState("");
  const [bCompanyCity, setBCompanyCity] = useState("");
  const [bCompanyState, setBCompanyState] = useState("");
  const [bCompanyCountry, setBCompanyCountry] = useState("India");
  const [bCompanyPincode, setBCompanyPincode] = useState("");
  const [bPincodeLoading, setBPincodeLoading] = useState(false);
  const [bApiFailed, setBApiFailed] = useState(false);

  const handleBCompanyPincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setBCompanyPincode(cleaned);
    if (cleaned.length === 6) {
      setBPincodeLoading(true);
      setBApiFailed(false);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          setBCompanyState(po.State);
          setBCompanyCity(po.District);
          setBCompanyCountry("India");
        } else {
          setBApiFailed(true);
        }
      } catch (e) {
        setBApiFailed(true);
      } finally {
        setBPincodeLoading(false);
      }
    } else {
      if (cleaned.length < 6) {
        setBCompanyState("");
        setBCompanyCity("");
      }
    }
  };

  const [savingBusiness, setSavingBusiness] = useState(false);

  // ── Auth / verification redirect ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/checkout");
    } else if (!user.is_email_verified) {
      router.replace("/account?verify=1");
    }
  }, [authLoading, user, router]);

  const [shipping_name, setShippingName] = useState("");
  const [shipping_phone, setShippingPhone] = useState("");
  const [shipping_address_line1, setLine1] = useState("");
  const [shipping_address_line2, setLine2] = useState("");
  const [shipping_city, setCity] = useState("");
  const [shipping_state, setState] = useState("");
  const [shipping_postal_code, setPostal] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPostal(cleaned);
    if (cleaned.length === 6) {
      setPincodeLoading(true);
      setApiFailed(false);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          setState(po.State);
          setCity(po.District);
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
        setState("");
        setCity("");
      }
    }
  };

  useEffect(() => {
    fetchShippingInfo()
      .then((info) => {
        setShippingInfo(info);
        const flags = info.shipping_methods;
        if (flags) {
          const firstEnabled: ShippingMethodId | null =
            (flags.store_pickup ? "store_pickup" : null) ??
            (flags.doorstep ? "doorstep" : null) ??
            (flags.custom_courier ? "custom_courier" : null);
          if (firstEnabled && shippingMethod !== firstEnabled && !flags[shippingMethod]) {
            setShippingMethod(firstEnabled);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCart().then(setCart).catch(console.error);
    if (user) {
      fetchAddresses().then((addrs) => {
        setSavedAddresses(addrs);
        if (addrs.length === 0) {
          setUseNewAddress(true);
        } else {
          // Pre-select default address
          const defAddr = addrs.find(a => a.is_default) || addrs[0];
          setSelectedAddressKey(String(defAddr.id));
          setShippingName(defAddr.recipient_name);
          setShippingPhone(defAddr.phone);
          setLine1(defAddr.address_line1);
          setLine2(defAddr.address_line2 || "");
          setState(defAddr.state);
          setCity(defAddr.city);
          setPostal(defAddr.postal_code);
        }
      }).catch(console.error);
    }

    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
    return () => {
      if (s.parentNode) s.parentNode.removeChild(s);
    };
  }, []);

  function openRazorpay(data: Extract<CheckoutResponse, { razorpay_order_id: string }>) {
    if (!window.Razorpay) {
      setErr("Razorpay script failed to load.");
      return;
    }
    const options: Record<string, unknown> = {
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: "Jai Fancy Packs",
      description: `Order #${data.order_id}`,
      order_id: data.razorpay_order_id,
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await verifyRazorpayPayment({
            order_id: data.order_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          window.dispatchEvent(new Event("jfp-cart-updated"));
          
          const redirectId = ('order_number' in data && data.order_number) ? data.order_number : data.order_id;
          router.push(`/orders/${redirectId}?success=1`);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Payment verification failed.");
        }
      },
      prefill: user?.email ? { email: user.email, name: shipping_name } : { name: shipping_name },
      theme: { color: "#08043D" },
      modal: {
        ondismiss: function () {
          window.dispatchEvent(new Event("jfp-cart-updated"));
          const redirectId = ('order_number' in data && data.order_number) ? data.order_number : data.order_id;
          router.push(`/orders/${redirectId}`);
        }
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      console.error("Payment failure response:", response);
      window.dispatchEvent(new Event("jfp-cart-updated"));
      const redirectId = ('order_number' in data && data.order_number) ? data.order_number : data.order_id;
      router.push(`/orders/${redirectId}?error=payment_failed`);
    });
    rzp.open();
  }

  async function handleBusinessDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    
    if (!bCompanyName.trim() || !bGstNumber.trim() || !bCompanyPhone.trim() || !bCompanyEmail.trim() || !bCompanyAddress.trim()) {
       setErr("Please fill all business details.");
       return;
    }
    
    const cleanPhone = bCompanyPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
       setErr("Company phone must be exactly 10 digits.");
       return;
    }

    setSavingBusiness(true);
    try {
       await updateMe({
         is_business: true,
         company_name: bCompanyName,
         gst_number: bGstNumber,
         company_phone: cleanPhone,
         company_email: bCompanyEmail,
         company_address: bCompanyAddress,
         company_city: bCompanyCity,
         company_state: bCompanyState,
         company_country: bCompanyCountry,
         company_pincode: bCompanyPincode,
       });
       await refreshUser();
       setPromptBusinessSave(false);
    } catch(err) {
       setErr(err instanceof Error ? err.message : "Failed to save business details.");
    } finally {
       setSavingBusiness(false);
    }
  }

  const companyAddressOption: SavedAddress | null =
    user?.is_business && user?.company_address
      ? {
          id: -1,
          name: "Company Address",
          recipient_name: user.company_name || user.first_name || "Company",
          phone: user.company_phone || user.phone || "",
          address_line1: user.company_address || "",
          address_line2: "",
          city: user.company_city || "",
          state: user.company_state || "",
          postal_code: user.company_pincode || "",
          is_default: false,
        }
      : null;

  const addressOptions: SavedAddress[] = useMemo(
    () => (companyAddressOption ? [companyAddressOption, ...savedAddresses] : savedAddresses),
    [companyAddressOption, savedAddresses]
  );

  function applyStorePickupFields(info: ShippingInfo) {
    setLine1(info.store_pickup.line1);
    setLine2(info.store_pickup.line2 || "");
    setCity(info.store_pickup.city);
    setState(info.store_pickup.state);
    setPostal(info.store_pickup.postal_code);
  }

  useEffect(() => {
    const prev = prevShippingMethod.current;
    prevShippingMethod.current = shippingMethod;

    if (shippingMethod === "store_pickup" && shippingInfo) {
      applyStorePickupFields(shippingInfo);
      return;
    }

    if (prev === "store_pickup" && shippingMethod !== "store_pickup") {
      const key = selectedAddressKey;
      const addr = key && addressOptions.find((a) => (a.id === -1 ? "company" : String(a.id)) === key);
      if (addr) {
        setShippingName(addr.recipient_name);
        setShippingPhone(addr.phone);
        setLine1(addr.address_line1);
        setLine2(addr.address_line2 || "");
        setCity(addr.city);
        setState(addr.state);
        setPostal(addr.postal_code);
      }
    }
  }, [shippingMethod, shippingInfo, selectedAddressKey, addressOptions]);

  function applySelectedAddress(addr: SavedAddress) {
    setSelectedAddressKey(addr.id === -1 ? "company" : String(addr.id));
    if (shippingMethod === "store_pickup" && shippingInfo) {
      setShippingName(addr.recipient_name);
      setShippingPhone(addr.phone);
      applyStorePickupFields(shippingInfo);
      return;
    }
    setShippingName(addr.recipient_name);
    setShippingPhone(addr.phone);
    setLine1(addr.address_line1);
    setLine2(addr.address_line2 || "");
    setState(addr.state);
    setCity(addr.city);
    setPostal(addr.postal_code);
  }

  function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!shipping_name.trim() || !shipping_address_line1.trim() || !shipping_city.trim() || !shipping_state.trim()) {
      setErr("Please ensure all required fields are filled completely.");
      return;
    }

    const cleanPhone = shipping_phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErr("Mobile number must be exactly 10 digits.");
      return;
    }

    const cleanPincode = shipping_postal_code.replace(/\D/g, "");
    if (cleanPincode.length !== 6) {
       setErr("Pincode must be exactly 6 digits.");
       return;
    }

    setShippingName(shipping_name.trim());
    setShippingPhone(cleanPhone);
    setLine1(shipping_address_line1.trim());
    setLine2(shipping_address_line2.trim());
    setPostal(cleanPincode);
    setCity(shipping_city.trim());
    setState(shipping_state.trim());

    createAddress({
       name: "Saved Checkout Address",
       recipient_name: shipping_name.trim(),
       phone: cleanPhone,
       address_line1: shipping_address_line1.trim(),
       address_line2: shipping_address_line2.trim(),
       postal_code: cleanPincode,
       city: shipping_city.trim(),
       state: shipping_state.trim(),
       is_default: savedAddresses.length === 0
    }).catch(e => console.error("Auto-save address failed:", e));

    setStep(2);
  }

  const isBespoke = cart?.items.some(item => !!item.custom_design_file);

  async function handleQtyChange(itemId: number, newQty: number, slug: string) {
    if (newQty < 1) return;
    setCartBusy(itemId);
    try {
      const updated = await updateCartItem(itemId, newQty, slug);
      setCart(updated);
      window.dispatchEvent(new Event("jfp-cart-updated"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update quantity.");
    } finally {
      setCartBusy(null);
    }
  }

  async function handleRemove(itemId: number, slug: string) {
    setCartBusy(itemId);
    try {
      const updated = await removeCartItem(itemId, slug);
      setCart(updated);
      window.dispatchEvent(new Event("jfp-cart-updated"));
      // If cart is now empty, send user back to cart page
      if (updated.items.length === 0) {
        router.replace("/cart?empty=checkout");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove item.");
    } finally {
      setCartBusy(null);
    }
  }

  async function handlePaymentRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBanner(null);

    // Guard: never allow checkout with an empty cart
    if (!cart || cart.items.length === 0) {
      router.replace("/cart?empty=checkout");
      return;
    }

    setBusy(true);
    try {
      let finalShipping = {
        shipping_name,
        shipping_phone,
        shipping_address_line1,
        shipping_address_line2: shipping_address_line2 || undefined,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_method: shippingMethod,
        is_business_order: isBusinessOrder,
      };

      const data = await checkoutRequest(finalShipping);

      if (isBespoke || ("mock_payment" in data && data.mock_payment)) {
        window.dispatchEvent(new Event("jfp-cart-updated"));
        
        const redirectId = ('order_number' in data && data.order_number) ? data.order_number : data.order_id;
        router.push(`/orders/${redirectId}?success=1`);
        return;
      }

      if (!scriptReady) {
        setErr("Payment UI is still loading. Try again in a moment.");
        return;
      }
      openRazorpay(data as any);
    } catch (e) {
      const anyErr = e as any;
      if (anyErr?.code === "out_of_stock") {
        setBanner(
          anyErr?.message ||
            "One or more items just went out of stock while you were checking out. Please review your cart and try again."
        );
        // Refresh cart to reflect latest stock + quantities
        fetchCart().then(setCart).catch(console.error);
        return;
      }
      setErr(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !cart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 min-h-[50vh] flex items-center justify-center">
        <p className="text-xl text-neutral-600 animate-pulse">Loading checkout...</p>
      </div>
    );
  }

  // Still waiting for redirect to fire
  if (!user || !user.is_email_verified) return null;

  const doorstepFeeNum = parseFloat(shippingInfo?.doorstep_fee_inr || "0");
  const cartTotalNum = parseFloat(cart.total || "0");
  const shippingChargeNum = shippingMethod === "doorstep" ? doorstepFeeNum : 0;
  const estimatedOrderTotal = (cartTotalNum + shippingChargeNum).toFixed(2);

  const methodOptionsAll: { id: ShippingMethodId; title: string; description: string }[] = [
    {
      id: "store_pickup",
      title: "Direct store pickup",
      description: "No shipping fee. We will notify you when your order is ready to collect at our store.",
    },
    {
      id: "doorstep",
      title: "Doorstep delivery",
      description:
        doorstepFeeNum > 0
          ? `Standard home or office delivery. Fee added at checkout: ₹${doorstepFeeNum.toFixed(2)}.`
          : "Standard home or office delivery. No delivery fee is added at checkout right now.",
    },
    {
      id: "custom_courier",
      title: "Custom courier service",
      description:
        "We arrange transport with your courier. Shipping cost will be quoted separately — you pay the courier fee outside this checkout.",
    },
  ];
  const methodFlags = shippingInfo?.shipping_methods ?? {
    store_pickup: true,
    doorstep: true,
    custom_courier: true,
  };
  const methodOptions = methodOptionsAll.filter((o) => (methodFlags as any)[o.id] !== false);
  const isStorePickup = shippingMethod === "store_pickup";

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="mx-auto max-w-6xl px-4 py-10">

        {banner && (
          <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-5">{banner}</p>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-xs font-semibold underline underline-offset-4 hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* Amazon-style Checkout Header */}
        <div className="mb-8 hidden md:block">
           <h1 className="text-[28px] font-normal text-gray-900 leading-tight">
             Checkout (<Link href="/cart" className="text-store-link hover:underline hover:text-orange-700">{cart.items.reduce((sum, item) => sum + item.quantity, 0)} items</Link>)
           </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Action Column */}
          <div className="lg:w-[65%] space-y-4">

            {/* Step 1: Shipping Address Accordion */}
            <div className={`bg-white rounded overflow-hidden shadow-sm border ${step === 1 ? 'border-store-navy' : 'border-gray-200'}`}>
               <div className="p-5 flex justify-between items-center bg-gray-50 cursor-pointer" onClick={() => setStep(1)}>
                  <h2 className={`text-[19px] font-bold ${step === 1 ? 'text-store-navy' : 'text-gray-900'}`}>1 &nbsp; Delivery address</h2>
                  {step === 2 && <span className="text-store-link hover:underline hover:text-orange-700 text-sm font-semibold">Change</span>}
               </div>
               
               {step === 1 && (
                 <div className="p-6 border-t border-gray-200">
                    <div className="mb-6 pb-4 border-b border-gray-200 flex items-center">
                       <input 
                         type="checkbox" 
                         id="businessToggle"
                         className="h-4 w-4 rounded border-gray-300 text-store-navy focus:ring-store-navy cursor-pointer"
                         checked={isBusinessOrder}
                         onChange={(e) => {
                            setIsBusinessOrder(e.target.checked);
                            if (e.target.checked && (!user?.is_business || !user?.gst_number)) {
                               setPromptBusinessSave(true);
                               setBCompanyName(user?.company_name || "");
                               setBGstNumber(user?.gst_number || "");
                               setBCompanyPhone(user?.company_phone || "");
                               setBCompanyEmail(user?.company_email || "");
                               setBCompanyAddress(user?.company_address || "");
                               setBCompanyCity(user?.company_city || "");
                               setBCompanyState(user?.company_state || "");
                               setBCompanyCountry(user?.company_country || "India");
                               setBCompanyPincode(user?.company_pincode || "");
                            } else {
                               setPromptBusinessSave(false);
                            }
                            // Prefer company address when switching to business order
                            if (e.target.checked && companyAddressOption) {
                              applySelectedAddress(companyAddressOption);
                              setUseNewAddress(false);
                            }
                         }}
                       />
                       <label htmlFor="businessToggle" className="ml-2 font-bold text-gray-900 cursor-pointer">
                          Order for your business?
                       </label>
                    </div>

                    <div className="mb-6 space-y-3">
                      <p className="text-[13px] font-bold text-gray-900">How would you like to receive this order?</p>
                      <div className="space-y-2">
                        {methodOptions.map((opt) => {
                          const checked = shippingMethod === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={`flex gap-3 rounded-lg border p-3 cursor-pointer text-[13px] leading-snug ${
                                checked ? "border-store-navy bg-blue-50/40" : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="shipping_method"
                                className="mt-0.5"
                                checked={checked}
                                onChange={() => setShippingMethod(opt.id)}
                              />
                              <span>
                                <span className="font-bold text-gray-900 block">{opt.title}</span>
                                <span className="text-gray-600">{opt.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {isBusinessOrder && promptBusinessSave && (
                        <form onSubmit={handleBusinessDetailsSubmit} className="mb-6 bg-blue-50/40 border border-store-navy rounded-lg p-5">
                           <h3 className="font-bold text-store-navy mb-4">Complete Business Profile for B2B Billing</h3>
                           {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
                           <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company Name</label>
                                <input required value={bCompanyName} onChange={(e)=>setBCompanyName(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">GST Number</label>
                                <input required value={bGstNumber} onChange={(e)=>setBGstNumber(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm uppercase focus:border-store-navy focus:outline-none"/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company Phone</label>
                                <input required type="tel" maxLength={10} value={bCompanyPhone} onChange={(e)=>setBCompanyPhone(e.target.value.replace(/\D/g,''))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company Email</label>
                                <input required type="email" value={bCompanyEmail} onChange={(e)=>setBCompanyEmail(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="text-[13px] font-bold text-gray-900">Company Address</label>
                                <textarea required value={bCompanyAddress} onChange={(e)=>setBCompanyAddress(e.target.value)} rows={2} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company Pincode</label>
                                <input required type="text" maxLength={6} value={bCompanyPincode} onChange={(e)=>handleBCompanyPincodeChange(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                                {bPincodeLoading && <p className="text-[10px] text-blue-600">Verifying...</p>}
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company State</label>
                                <input required value={bCompanyState} readOnly={!bApiFailed && bCompanyState !== ""} onChange={(e)=>setBCompanyState(e.target.value)} className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none ${!bApiFailed && bCompanyState !== "" ? "bg-gray-100 border-gray-200" : "border-gray-300"}`}/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company District / City</label>
                                <input required value={bCompanyCity} readOnly={!bApiFailed && bCompanyCity !== ""} onChange={(e)=>setBCompanyCity(e.target.value)} className={`mt-1 w-full rounded border px-3 py-2 text-sm focus:outline-none ${!bApiFailed && bCompanyCity !== "" ? "bg-gray-100 border-gray-200" : "border-gray-300"}`}/>
                              </div>
                              <div>
                                <label className="text-[13px] font-bold text-gray-900">Company Country</label>
                                <input required value={bCompanyCountry} onChange={(e)=>setBCompanyCountry(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-navy focus:outline-none"/>
                              </div>
                           </div>
                           <Button isLoading={savingBusiness} type="submit" variant="primary" className="mt-4 px-6 rounded-md">Save &amp; Continue</Button>
                        </form>
                    )}

                    {/* For store pickup: only collect name + phone; show store address read-only */}
                    {isStorePickup && shippingInfo ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setErr("");
                          if (!shipping_name.trim()) {
                            setErr("Please enter purchaser name.");
                            return;
                          }
                          const cleanPhone = shipping_phone.replace(/\D/g, "");
                          if (cleanPhone.length !== 10) {
                            setErr("Mobile number must be exactly 10 digits.");
                            return;
                          }
                          setShippingName(shipping_name.trim());
                          setShippingPhone(cleanPhone);
                          applyStorePickupFields(shippingInfo);
                          setStep(2);
                        }}
                        className="space-y-4 max-w-lg"
                      >
                        {err && <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Purchaser name</label>
                          <input
                            required
                            value={shipping_name}
                            onChange={(e) => setShippingName(e.target.value)}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Mobile number</label>
                          <input
                            required
                            type="tel"
                            maxLength={10}
                            value={shipping_phone}
                            onChange={(e) => setShippingPhone(e.target.value.replace(/\D/g, ""))}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm"
                          />
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="text-[12px] font-bold text-gray-900 mb-2 uppercase tracking-widest">Pickup address</p>
                          <p className="text-[13px] text-gray-800">{shippingInfo.store_pickup.line1}</p>
                          {shippingInfo.store_pickup.line2 ? (
                            <p className="text-[13px] text-gray-800">{shippingInfo.store_pickup.line2}</p>
                          ) : null}
                          <p className="text-[13px] text-gray-800">
                            {shippingInfo.store_pickup.city}, {shippingInfo.store_pickup.state} {shippingInfo.store_pickup.postal_code}
                          </p>
                          {shippingInfo.store_pickup_map_url ? (
                            <a
                              href={shippingInfo.store_pickup_map_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-2 text-store-link hover:underline text-sm font-semibold"
                            >
                              View on map
                            </a>
                          ) : null}
                        </div>
                        <div className="pt-2">
                          <button type="submit" className="bg-[#F0C75E] hover:bg-[#D4AF37] text-black font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm w-full md:w-auto transition-colors">
                            Continue
                          </button>
                        </div>
                      </form>
                    ) : addressOptions.length > 0 && !useNewAddress ? (
                      <div>
                        <div className="space-y-3 mb-6">
                           {addressOptions.map(addr => {
                             const key = addr.id === -1 ? "company" : String(addr.id);
                             const checked = selectedAddressKey === key;
                             return (
                             <div 
                               key={key} 
                               className={`border rounded-lg p-4 flex gap-3 cursor-pointer transition-colors ${checked ? 'border-store-navy bg-blue-50/30' : 'border-gray-300 hover:bg-gray-50 bg-white'}`}
                               onClick={() => applySelectedAddress(addr)}
                             >
                                <input type="radio" className="mt-1" name="saved_addr" checked={checked} readOnly />
                                <div className="text-[13px] text-gray-800">
                                   <p className="font-bold text-[15px] text-gray-900 mb-1">
                                     {addr.name}
                                     {addr.is_default && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1 rounded uppercase">Default</span>}
                                     {addr.id === -1 && <span className="ml-2 text-[10px] bg-store-navy text-white px-1 rounded uppercase">Business</span>}
                                   </p>
                                   <p>{addr.recipient_name}</p>
                                   <p>{addr.address_line1} {addr.address_line2}</p>
                                   <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                                   <p className="mt-1 text-gray-600">Phone: {addr.phone}</p>
                                 </div>
                             </div>
                           )})}
                        </div>
                        <div className="flex items-center gap-4">
                           <Button onClick={(e) => { e.preventDefault(); setStep(2); }} disabled={!shipping_name} className="px-8" variant="secondary">
                             Use selected address
                           </Button>
                           <button onClick={() => setUseNewAddress(true)} className="text-store-link hover:underline text-sm font-semibold">
                             + Add a new address
                           </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleAddressSubmit} className="space-y-4 max-w-lg">
                        {savedAddresses.length > 0 && (
                          <div className="mb-4">
                            <span onClick={() => setUseNewAddress(false)} className="text-store-link hover:underline text-sm font-semibold cursor-pointer mb-2 inline-block">← Back to saved addresses</span>
                          </div>
                        )}
                        {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Pincode</label>
                          <input required type="text" maxLength={6} disabled={pincodeLoading} value={shipping_postal_code} onChange={(e) => handlePincodeChange(e.target.value)} placeholder="6 digits [0-9] PIN code" className={`mt-1 w-full md:w-1/2 rounded border px-3 py-2 text-sm focus:outline-none shadow-sm transition-colors ${pincodeLoading ? 'bg-gray-100 border-gray-300' : 'border-gray-300 focus:border-store-yellow focus:ring-1 focus:ring-store-yellow'}`} />
                          {pincodeLoading && <p className="text-xs text-blue-600 mt-1">Verifying pincode...</p>}
                          {apiFailed && <p className="text-xs text-red-500 mt-1">Could not fetch automatically. Please type below.</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                           <div>
                            <label className="text-[13px] font-bold text-gray-900">State</label>
                            <input required value={shipping_state} readOnly={!apiFailed && shipping_state !== ""} onChange={(e) => setState(e.target.value)} placeholder="State" className={`mt-1 w-full rounded border px-3 py-2 text-sm shadow-sm ${!apiFailed && shipping_state !== "" ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed" : "border-gray-300 focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none"}`} />
                          </div>
                          <div>
                            <label className="text-[13px] font-bold text-gray-900">City / District</label>
                            <input required value={shipping_city} readOnly={!apiFailed && shipping_city !== ""} onChange={(e) => setCity(e.target.value)} placeholder="City" className={`mt-1 w-full rounded border px-3 py-2 text-sm shadow-sm ${!apiFailed && shipping_city !== "" ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed" : "border-gray-300 focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none"}`} />
                          </div>
                        </div>

                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Full name</label>
                          <input required value={shipping_name} onChange={(e) => setShippingName(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Mobile number</label>
                          <input required type="tel" maxLength={10} value={shipping_phone} onChange={(e) => setShippingPhone(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Flat, House no., Building, Company</label>
                          <input required value={shipping_address_line1} onChange={(e) => setLine1(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm" />
                        </div>
                        <div>
                          <label className="text-[13px] font-bold text-gray-900">Area, Street, Sector, Village (optional)</label>
                          <input value={shipping_address_line2} onChange={(e) => setLine2(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-store-yellow focus:ring-1 focus:ring-store-yellow focus:outline-none shadow-sm" />
                        </div>

                        <div className="pt-4">
                           <button type="submit" className="bg-[#F0C75E] hover:bg-[#D4AF37] text-black font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm w-full md:w-auto transition-colors">
                             Use this address
                           </button>
                        </div>
                      </form>
                    )}
                 </div>
               )}

               {step === 2 && (
                 <div className="px-5 py-3 text-sm text-gray-700 bg-white">
                    {isBusinessOrder && user?.is_business && user?.company_name && (
                      <p className="text-[12px] text-gray-600 mb-2">
                        Billing: <span className="font-semibold text-gray-900">{user.company_name}</span>
                        {user.gst_number ? <> (GST: <span className="font-semibold text-gray-900">{user.gst_number.toUpperCase()}</span>)</> : null}
                      </p>
                    )}
                    <>
                      <p className="font-bold">{shipping_name}</p>
                      <p>{shipping_address_line1} {shipping_address_line2}</p>
                      <p>{shipping_city}, {shipping_state} {shipping_postal_code}</p>
                      <p className="mt-1">Phone: {shipping_phone}</p>
                    </>
                 </div>
               )}
            </div>

            {/* Step 2: Payment Method or Bespoke Review */}
            <div className={`bg-white rounded overflow-hidden shadow-sm border ${step === 2 ? 'border-store-navy' : 'border-gray-200 opacity-60'}`}>
               <div className="p-5 bg-gray-50 border-b border-gray-200">
                  <h2 className={`text-[19px] font-bold ${step === 2 ? 'text-store-navy' : 'text-gray-900'}`}>
                    2 &nbsp; {isBespoke ? 'Review your bespoke design' : 'Select a payment method'}
                  </h2>
               </div>
               
               {step === 2 && (
                 <div className="p-6">
                    {isBespoke ? (
                      <div className="border border-store-navy bg-blue-50/30 rounded p-6 mb-6">
                         <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <span className="text-xl">✨</span> Bespoke Design Review
                         </h3>
                         <p className="text-sm text-gray-700 leading-relaxed italic">
                           You have uploaded a custom design. Our elite design team will review your artwork for print quality and color accuracy. 
                           <b> No payment is required right now.</b> Once approved, we will notify you and provide a payment link.
                         </p>
                      </div>
                    ) : (
                      <div className="border border-store-yellow bg-yellow-50 rounded p-4 mb-6">
                         <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <span className="text-xl">💳</span> Secure Payment Gateway (Razorpay)
                         </h3>
                         <p className="text-sm text-gray-700 ml-7">
                           We securely process payments via Razorpay. Clicking the button below will open a secure window where you can effortlessly pay using <b>UPI, Credit/Debit Cards, or Netbanking</b>.
                         </p>
                      </div>
                    )}

                    {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded animate-pulse">{err}</div>}

                    <Button 
                      onClick={handlePaymentRequest}
                      isLoading={busy}
                      variant={isBespoke ? "primary" : "secondary"}
                      className="w-full md:w-auto px-10 py-4 lg:text-lg"
                    >
                      {busy ? "Processing..." : isBespoke ? "Submit Design for Elite Review" : "Pay securely with Razorpay"}
                    </Button>
                 </div>
               )}
            </div>

            {/* ── Cart Items Review ─────────────────────────────────────── */}
            <div className="bg-white rounded overflow-hidden shadow-sm border border-gray-200">
              <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-[19px] font-bold text-gray-900">
                  3 &nbsp; Review your items ({cart.items.reduce((s, i) => s + i.quantity, 0)})
                </h2>
                <Link href="/cart" className="text-store-link hover:underline text-sm font-semibold">Edit in cart</Link>
              </div>

              <div className="divide-y divide-gray-100">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-5 flex gap-4 transition-opacity duration-200 ${cartBusy === item.id ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    {/* Thumbnail */}
                    <Link href={`/products/${item.product_slug}`} className="relative shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-neutral-50 border border-gray-100">
                      {item.product_image ? (
                        <Image src={item.product_image} alt={item.product_name} fill className="object-cover" sizes="72px" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[8px] text-neutral-400 font-bold uppercase">No image</span>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 items-start">
                        <div className="min-w-0">
                          <Link href={`/products/${item.product_slug}`} className="text-[13px] font-semibold text-gray-900 hover:text-store-link leading-snug line-clamp-2">
                            {item.product_name}
                          </Link>
                          {item.variant_label && (
                            <span className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-widest text-store-button bg-store-button/10 border border-store-button/20 px-2 py-0.5 rounded-full">
                              {item.variant_label}
                            </span>
                          )}
                          {item.stock_warning && (
                            <p className="mt-0.5 text-[10px] font-bold text-red-600">⚠️ Only {item.available_stock} in stock</p>
                          )}
                        </div>
                        <p className="text-[14px] font-bold text-gray-900 shrink-0 whitespace-nowrap">₹ {item.line_total}</p>
                      </div>

                      {/* Qty controls + Remove */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded overflow-hidden text-[13px]">
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity - 1, item.product_slug)}
                            disabled={item.quantity <= 1 || cartBusy === item.id}
                            className="px-2.5 py-1 hover:bg-gray-100 font-bold text-gray-700 disabled:opacity-30 transition-colors"
                          >−</button>
                          <span className="px-3 py-1 font-semibold text-gray-900 min-w-[2rem] text-center border-x border-gray-300 bg-gray-50">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item.id, item.quantity + 1, item.product_slug)}
                            disabled={item.quantity >= item.available_stock || cartBusy === item.id}
                            className="px-2.5 py-1 hover:bg-gray-100 font-bold text-gray-700 disabled:opacity-30 transition-colors"
                          >+</button>
                        </div>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleRemove(item.id, item.product_slug)}
                          disabled={cartBusy === item.id}
                          className="text-[12px] text-store-link hover:text-red-700 font-semibold hover:underline transition-colors disabled:opacity-40"
                        >
                          Remove
                        </button>
                        {item.custom_design_file && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-store-button bg-store-button/10 px-2 py-0.5 rounded-full">✨ Custom</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 pt-2 px-2">
              Need help? Check our <Link href="#" className="text-store-link hover:underline">Return &amp; Replacement Policy</Link>.
            </p>
          </div>

          {/* Sidebar Summary Column */}
          <div className="lg:w-[35%]">
            <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-24 shadow-sm">
               
               {step === 2 ? (
                 <div className="mb-4 pb-4 border-b border-gray-200 text-center">
                   <Button 
                     onClick={handlePaymentRequest}
                     isLoading={busy}
                     variant={isBespoke ? "primary" : "secondary"}
                     className="w-full py-3"
                   >
                     {busy ? "Processing..." : isBespoke ? "Submit for Review" : "Place Your Order and Pay"}
                   </Button>
                   <p className="text-[11px] text-gray-600 px-2 leading-tight mt-2 italic">
                     {isBespoke ? "Order will be reviewed by our team before payment." : "By placing your order, you agree to JaiFancyPacks privacy notice."}
                   </p>
                 </div>
               ) : (
                 <div className="mb-4 pb-4 border-b border-gray-200 flex flex-col items-center">
                   <p className="font-bold text-gray-900 mb-2">Order Summary</p>
                   <p className="text-xs text-center text-gray-600">Choose a shipping address to continue checking out.</p>
                 </div>
               )}

               <h3 className="font-bold text-gray-900 text-lg mb-3">Order Summary</h3>
                
                <div className="space-y-2 text-[13px] text-gray-800 border-b border-gray-200 pb-4 mb-2">
                  <div className="flex justify-between">
                     <span>Items (Subtotal):</span>
                     <span>₹ {cart.subtotal}</span>
                  </div>
                  {cart.tax_data && (
                    <div className="flex justify-between">
                       <span>GST:</span>
                       <span>₹ {cart.tax_data.gst_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                     <span className="text-gray-500">Delivery / shipping:</span>
                     <span className="text-gray-800 text-right max-w-[55%]">
                       {shippingMethod === "store_pickup" && (
                         <span className="text-green-700 font-semibold">Free (store pickup)</span>
                       )}
                       {shippingMethod === "doorstep" && (
                         <span>
                           {shippingChargeNum > 0 ? (
                             <>₹ {shippingChargeNum.toFixed(2)}</>
                           ) : (
                             <span className="italic text-gray-500">₹0</span>
                           )}
                         </span>
                       )}
                       {shippingMethod === "custom_courier" && (
                         <span className="italic text-gray-600 text-[12px]">Quoted &amp; paid separately</span>
                       )}
                     </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-2">
                   <span className="font-bold text-lg text-[#B12704]">Order Total:</span>
                   <span className="font-bold text-lg text-[#B12704]">₹ {estimatedOrderTotal}</span>
                </div>
                {shippingMethod === "custom_courier" && (
                  <p className="text-[11px] text-gray-500 -mt-1 mb-1">
                    Total shown is for products and tax only. Courier charges are not included.
                  </p>
                )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
