import { resolveApiFetchUrl } from "@/lib/api";

export type ProductCard = {
  id: number;
  slug: string;
  sku: string;
  title: string;
  price: string;
  image: string | null;
  images: string[];
  badge: "New" | "Sale" | null;
  rating: number;
  review_count: number;
  bulk_threshold: number | null;
  min_qty: number;
  is_customizable: boolean;
  category_slug: string;
  stock: number;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
};

export type ProductDetail = ProductCard & {
  description: string;
  compare_at_price_display: string | null;
  images: string[];
  stock: number;
  is_bestseller: boolean;
  created_at: string;
  recent_sales_count: number;
};

export async function fetchProductList(
  searchParams: Record<string, string | undefined>
): Promise<Paginated<ProductCard>> {
  const q = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v != null && v !== "") q.set(k, v);
  });
  let res: Response;
  try {
    const url = await resolveApiFetchUrl(`/api/products/?${q.toString()}`);
    res = await fetch(url, {
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Please check that the API is running and accessible."
    );
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  let res: Response;
  try {
    const url = await resolveApiFetchUrl("/api/categories/");
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(
      "Unable to reach the server. Please check that the API is running and accessible."
    );
  }
  if (!res.ok) throw new Error(await res.text());
  const data: Paginated<Category> | Category[] = await res.json();
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function fetchProductDetail(slug: string): Promise<ProductDetail> {
  let res: Response;
  try {
    const url = await resolveApiFetchUrl(`/api/products/${encodeURIComponent(slug)}/`);
    res = await fetch(url, {
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Unable to reach the server. Please check that the API is running and accessible."
    );
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
