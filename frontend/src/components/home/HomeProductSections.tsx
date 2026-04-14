"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ProductCarousel,
  type CarouselProduct,
} from "@/components/home/ProductCarousel";
import { resolveApiFetchUrl } from "@/lib/api";
import { fetchCategories, type ProductCard, type Paginated } from "@/lib/catalog";

async function fetchProducts(query: string): Promise<ProductCard[]> {
  const url = await resolveApiFetchUrl(`/api/products/?${query}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: Paginated<ProductCard> = await res.json();
  return data.results ?? [];
}

function Section({
  title,
  viewAllHref,
  queryKey,
  queryString,
}: {
  title: string;
  viewAllHref: string;
  queryKey: string[];
  queryString: string;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchProducts(queryString),
  });

  const products: CarouselProduct[] = (data ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    price: p.price,
    image: p.image,
    images: p.images,
    badge: p.badge ?? undefined,
    rating: p.rating,
    reviewCount: p.review_count,
    bulkThreshold: p.bulk_threshold ?? undefined,
    minQty: p.min_qty,
    stock: p.stock,
  }));

  if (isLoading) {
    return (
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
          <div className="mt-6 flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 w-[200px] shrink-0 animate-pulse rounded-xl bg-neutral-100"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-xl font-bold text-store-link md:text-2xl">{title}</h2>
          <p className="mt-2 text-sm text-red-600">
            Could not load products. Is the API running?{" "}
            {error instanceof Error ? error.message : ""}
          </p>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <ProductCarousel title={title} viewAllHref={viewAllHref} products={products} />
  );
}

export function HomeProductSections() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <>
      <Section
        title="New arrivals"
        viewAllHref="/products?ordering=-created_at"
        queryKey={["products", "new"]}
        queryString="ordering=-created_at&page_size=8"
      />
      <Section
        title="Best sellers"
        viewAllHref="/products?is_bestseller=true"
        queryKey={["products", "bestsellers"]}
        queryString="is_bestseller=true&page_size=8"
      />
      {categories?.slice(0, 3).map((cat) => (
        <Section
          key={cat.id}
          title={cat.name}
          viewAllHref={`/products?cat=${cat.slug}`}
          queryKey={["products", cat.slug]}
          queryString={`category_slug=${cat.slug}&page_size=8`}
        />
      ))}
    </>
  );
}
