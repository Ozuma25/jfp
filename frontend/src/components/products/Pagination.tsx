"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

type Props = {
  count: number;
  pageSize?: number;
};

export function Pagination({ count, pageSize = 48 }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const totalPages = Math.ceil(count / pageSize);
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const createPageURL = useCallback(
    (pageNumber: number | string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (pageNumber === 1) {
        params.delete("page");
      } else {
        params.set("page", pageNumber.toString());
      }
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams]
  );

  if (totalPages <= 1) return null;

  return (
    <div className="mt-20 flex items-center justify-center gap-2 border-t border-neutral-100 pt-10">
      <button
        onClick={() => router.push(createPageURL(currentPage - 1))}
        disabled={currentPage <= 1}
        className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-store-navy disabled:text-neutral-300 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, i) => {
          const page = i + 1;
          // Show limited pages if many (basic implementation)
          if (
            totalPages > 7 &&
            page !== 1 &&
            page !== totalPages &&
            Math.abs(page - currentPage) > 2
          ) {
            if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-2 text-neutral-300">...</span>;
            return null;
          }

          return (
            <button
              key={page}
              onClick={() => router.push(createPageURL(page))}
              className={`w-8 h-8 text-[10px] font-bold flex items-center justify-center transition-all ${
                currentPage === page
                  ? "bg-store-navy text-white"
                  : "text-store-navy/60 hover:bg-neutral-100"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => router.push(createPageURL(currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-store-navy disabled:text-neutral-300 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
