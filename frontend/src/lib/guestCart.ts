import { fetchProductDetail } from "@/lib/catalog";
import type { CartData, CartItem } from "@/lib/cartApi";

const GUEST_CART_KEY = "jfp_guest_cart";
const PRODUCT_CACHE_KEY = "jfp_product_cache";

type GuestCartItem = {
  productSlug: string;
  quantity: number;
};

// ─── Product snapshot cache (keyed by slug) ─────────────────────────────────
// We store lean product snapshots so fetchGuestCartData never needs
// to hit the API for products that are already known.

type ProductSnapshot = {
  slug: string;
  title: string;
  price: string;
  image: string | null;
  bulk_threshold: number | null;
};

function getProductCache(): Record<string, ProductSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function cacheProductSnapshot(snapshot: ProductSnapshot) {
  if (typeof window === "undefined") return;
  const cache = getProductCache();
  cache[snapshot.slug] = snapshot;
  localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
}

// ─── Guest cart storage ──────────────────────────────────────────────────────

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  const s = localStorage.getItem(GUEST_CART_KEY);
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export function setGuestCart(cart: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CART_KEY);
}

function parsePrice(priceStr: string): number {
  const clean = priceStr.replace(/[₹, \s]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ─── Build CartData from local storage — API only called if cache misses ─────

export async function fetchGuestCartData(): Promise<CartData> {
  const guestItems = getGuestCart();
  const cache = getProductCache();
  const items: CartItem[] = [];
  let subtotal = 0;

  for (const guestItem of guestItems) {
    try {
      // Use cached snapshot first; only fetch if missing
      let snapshot = cache[guestItem.productSlug];
      if (!snapshot) {
        const product = await fetchProductDetail(guestItem.productSlug);
        snapshot = {
          slug: product.slug,
          title: product.title,
          price: product.price,
          image: product.image,
          bulk_threshold: product.bulk_threshold ?? null,
        };
        cacheProductSnapshot(snapshot);
      }

      const unitPrice = parsePrice(snapshot.price);
      const lineTotal = unitPrice * guestItem.quantity;
      subtotal += lineTotal;

      items.push({
        id: Math.random(),
        product_slug: snapshot.slug,
        product_name: snapshot.title,
        product_image: snapshot.image,
        quantity: guestItem.quantity,
        unit_price: snapshot.price,
        line_total: `₹ ${lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        bulk_threshold: snapshot.bulk_threshold ?? 100,
        custom_design_file: null,
      });
    } catch (e) {
      console.error(`Failed to fetch product detail for guest cart: ${guestItem.productSlug}`, e);
    }
  }

  return {
    items,
    subtotal: `₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    discount: "₹ 0.00",
    total: `₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    coupon: null,
    tax_data: {
      gst_amount: "0.00",
      cgst_amount: "0.00",
      sgst_amount: "0.00",
    }
  };
}

export function addGuestCartItem(productSlug: string, quantity: number): GuestCartItem[] {
  const cart = getGuestCart();
  const existing = cart.find((i) => i.productSlug === productSlug);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productSlug, quantity });
  }
  setGuestCart(cart);
  return cart;
}

export function updateGuestCartItemQty(productSlug: string, quantity: number): GuestCartItem[] {
  let cart = getGuestCart();
  if (quantity < 1) {
    cart = cart.filter((i) => i.productSlug !== productSlug);
  } else {
    const item = cart.find((i) => i.productSlug === productSlug);
    if (item) item.quantity = quantity;
  }
  setGuestCart(cart);
  return cart;
}

export function removeGuestCartItem(productSlug: string): GuestCartItem[] {
  const cart = getGuestCart().filter((i) => i.productSlug !== productSlug);
  setGuestCart(cart);
  return cart;
}
