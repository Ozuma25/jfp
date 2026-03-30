import { getApiBase } from "@/lib/api";

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
  const base = getApiBase();
  const q = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v != null && v !== "") q.set(k, v);
  });
  const res = await fetch(`${base}/api/products/?${q.toString()}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/categories/`, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(await res.text());
  const data: Paginated<Category> | Category[] = await res.json();
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function fetchProductDetail(slug: string): Promise<ProductDetail> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/products/${encodeURIComponent(slug)}/`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
