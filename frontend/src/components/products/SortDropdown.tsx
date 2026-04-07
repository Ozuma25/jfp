"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const options = [
  { label: "Recommended", value: null },
  { label: "Newest Arrivals", value: "new" },
  { label: "Price: Low to High", value: "price" },
  { label: "Price: High to Low", value: "-price" },
  { label: "Name: A to Z", value: "name" },
  { label: "Name: Z to A", value: "-name" },
];

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentSort = searchParams.get("sort") || searchParams.get("ordering") || null;

  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(name);
        // Also delete "sort" if name is "ordering" or vice versa
        if (name === "ordering") params.delete("sort");
        if (name === "sort") params.delete("ordering");
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="flex items-center gap-4">
      <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-widest text-store-navy/40">Sort by:</span>
      <select
        value={currentSort || ""}
        onChange={(e) => {
          const value = e.target.value === "" ? null : e.target.value;
          // Use "ordering" as the primary param name for the backend
          router.push(`${pathname}?${createQueryString("ordering", value)}`);
        }}
        className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-store-navy focus:ring-0 cursor-pointer pr-8 py-2 md:py-0"
      >
        {options.map((opt) => (
          <option key={opt.value || "default"} value={opt.value || ""}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
