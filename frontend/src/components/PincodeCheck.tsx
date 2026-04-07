"use client";

import { useState } from "react";

export function PincodeCheck() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length !== 6 || isNaN(Number(pincode))) {
      setStatus("err");
      setMessage("Please enter a valid 6-digit pincode.");
      return;
    }

    setStatus("loading");
    
    // Simulate API call to check serviceability
    setTimeout(() => {
        // Mock logic: Some pincodes are "unserviceable" for demo purposes
        if (pincode.startsWith("0")) {
            setStatus("err");
            setMessage("We currently do not ship to this region.");
        } else {
            setStatus("ok");
            setMessage("Handcrafted delivery available (3-5 days).");
        }
    }, 800);
  };

  return (
    <div className="bg-neutral-50/50 border border-gray-100 transition-all duration-500 overflow-hidden">
      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 flex items-center justify-between group hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-3">
             <span className="text-[10px] grayscale opacity-40 group-hover:opacity-80 transition-opacity">📫</span>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-store-navy/60">Check Delivery Selection Availability</p>
          </div>
          <span className="text-[8px] font-bold text-store-navy/40 uppercase tracking-widest">+ Expand</span>
        </button>
      ) : (
        <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy">Enter Delivery Pincode</p>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-[8px] font-bold text-store-navy/40 uppercase hover:text-red-400 transition-colors"
              >– Minimize</button>
          </div>

          <form onSubmit={handleCheck} className="flex gap-2">
            <input 
              type="text" 
              maxLength={6}
              placeholder="e.g. 110001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              className="flex-1 bg-white border border-gray-200 px-3 py-2 text-xs font-bold tracking-widest text-store-navy outline-none focus:ring-1 focus:ring-store-button shadow-inner"
            />
            <button 
              type="submit" 
              disabled={status === "loading"}
              className="bg-store-navy text-white px-5 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-store-button hover:text-black transition-all disabled:opacity-50 shadow-md"
            >
              {status === "loading" ? "..." : "Check"}
            </button>
          </form>

          {status !== "idle" && (
              <div className={`text-[10px] font-bold uppercase tracking-widest transition-all ${status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                 {status === 'ok' ? '✓ ' : '× '} {message}
              </div>
          )}
        </div>
      )}
    </div>
  );
}
