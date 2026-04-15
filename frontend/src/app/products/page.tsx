import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchProductList, fetchCategories } from "@/lib/catalog";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import { SortDropdown } from "@/components/products/SortDropdown";
import { Pagination } from "@/components/products/Pagination";

export const metadata: Metadata = {
  title: "Shop All Products — Jai Fancy Packs",
  description:
    "Browse our full collection of wholesale return gifts, fancy packs, and bulk packaging options. Customizable designs available.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const categories = await fetchCategories();

  const cat = typeof sp.cat === "string" ? sp.cat : undefined;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const ordering = typeof sp.ordering === "string" ? sp.ordering : undefined;
  const min_price = typeof sp.min_price === "string" ? sp.min_price : undefined;
  const max_price = typeof sp.max_price === "string" ? sp.max_price : undefined;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  
  const bestseller =
    sp.is_bestseller === "true" || sp.sort === "bestsellers" ? "true" : undefined;
  const customizable =
    sp.custom === "true" || sp.custom === "1" ? "true" : undefined;

  let data;
  let error: string | null = null;
  try {
    data = await fetchProductList({
      cat,
      search,
      ordering,
      min_price,
      max_price,
      page,
      is_bestseller: bestseller,
      is_customizable: customizable,
      page_size: "48",
    });
  } catch (e) {
    console.error(e);
    error = e instanceof Error ? e.message : "Failed to load products";
    data = { count: 0, next: null, previous: null, results: [] };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-100">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-store-navy leading-tight">
            Our <span className="text-store-button">Collection</span>
          </h1>
          <p className="mt-4 text-sm font-medium text-neutral-500 leading-relaxed uppercase tracking-widest italic">
            {data.count} result{data.count === 1 ? "" : "s"}
            {cat ? ` in “${cat.replace('-', ' ')}”` : ""}
            {search ? ` matching “${search}”` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Suspense fallback={<div className="h-10 w-32 animate-pulse bg-neutral-100" />}>
              <SortDropdown />
           </Suspense>
        </div>
      </div>

      <div className="mt-12 flex flex-col lg:flex-row gap-x-12">
        {/* Filter Sidebar (Desktop + Mobile) */}
        <aside className="w-full lg:w-64 shrink-0 mb-8 lg:mb-0">
           <div className="lg:sticky lg:top-40 lg:scroll-mt-40">
              <Suspense>
                 <FilterSidebar categories={categories} />
              </Suspense>
           </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          {error && (
            <div className="bg-amber-50 border border-amber-100 p-6 rounded mb-8">
              <p className="text-sm font-bold text-amber-900 uppercase tracking-widest">
                System Status
              </p>
              <p className="mt-2 text-sm text-amber-800 font-medium">
                Our product API is currently unavailable ({error}). Please ensure the background services are running.
              </p>
            </div>
          )}

          {data.results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
                {data.results.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
              <div className="mt-20">
                 <Pagination count={data.count} pageSize={48} />
              </div>
            </>
          ) : (
            !error && (
              <div className="py-24 text-center bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200">
                <p className="text-lg font-bold text-store-navy uppercase tracking-[0.2em]">No products found</p>
                <p className="mt-2 text-sm text-neutral-500 font-medium">Try adjusting your filters or refining your search term.</p>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}

