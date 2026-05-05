import { fetchProductDetail } from "@/lib/catalog";
import type { CartData, CartItem } from "@/lib/cartApi";

const GUEST_CART_KEY = "jfp_guest_cart";
const PRODUCT_CACHE_KEY = "jfp_product_cache";

type GuestCartItem = {
  productSlug: string;
  quantity: number;
  priceAtAdd?: string | null; // Captured at the moment of adding to cart
};

// ... cached snapshots (no longer used for final data, but kept briefly for fallback if needed)
type ProductSnapshot = {
  slug: string;
  title: string;
  price: string;
  image: string | null;
  bulk_threshold: number | null;
  stock: number;
};
// keep cache functions for retro-compatibility but we will mostly rely on fresh fetches now.

export function cacheProductSnapshot(snapshot: ProductSnapshot) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    const cache: Record<string, ProductSnapshot> = raw ? JSON.parse(raw) : {};
    cache[snapshot.slug.toLowerCase()] = snapshot;
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort cache; do not block cart flow on storage issues.
  }
}

// ... localStorage utilities
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

function parsePrice(priceStr: string | null | undefined): number {
  if (!priceStr) return 0;
  // Keep digits and decimal only — do not strip "." (an older regex treated "." as
  // part of "rs." and removed every decimal point, turning 337.50 into 33750).
  const clean = priceStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ─── Build CartData from local storage — RE-FETCHING ALL TO ENSURE ACCURACY ─────

export async function fetchGuestCartData(): Promise<CartData> {
  const rawItems = getGuestCart();
  
  // Consolidation: Merge raw guest items by slug
  const consolidatedMap = new Map<string, { qty: number; priceAtAdd: string | null }>();
  for (const item of rawItems) {
    const slug = item.productSlug.toLowerCase();
    const existing = consolidatedMap.get(slug);
    if (existing) {
      existing.qty += item.quantity;
      // Keep the oldest priceAtAdd if multiple exist
      if (!existing.priceAtAdd && item.priceAtAdd) existing.priceAtAdd = item.priceAtAdd;
    } else {
      consolidatedMap.set(slug, { qty: item.quantity, priceAtAdd: item.priceAtAdd || null });
    }
  }
  
  const guestItems = Array.from(consolidatedMap.entries()).map(([slug, data]) => ({
    productSlug: slug,
    quantity: data.qty,
    priceAtAdd: data.priceAtAdd
  }));
  
  // Auto-correct local storage if needed
  if (guestItems.length !== rawItems.length) {
    setGuestCart(guestItems);
  }

  const items: CartItem[] = [];
  let subtotal = 0;

  for (const guestItem of guestItems) {
    try {
      // ── LIVE FETCH for precise stock/price checking ────────────────────────
      const product = await fetchProductDetail(guestItem.productSlug);
      
      const liveUnitPrice = parsePrice(product.price);
      const originalPrice = guestItem.priceAtAdd ? parsePrice(guestItem.priceAtAdd) : liveUnitPrice;
      
      const priceChanged = originalPrice !== 0 && liveUnitPrice !== originalPrice;
      const stockWarning = guestItem.quantity > product.stock;
      
      const lineTotal = liveUnitPrice * guestItem.quantity;
      subtotal += lineTotal;

      items.push({
        id: Math.random(),
        product_slug: product.slug,
        product_name: product.title,
        product_sku: product.sku,
        effective_sku: product.sku,   // guest cart doesn't track variants
        product_image: product.image,
        quantity: guestItem.quantity,
        unit_price: product.price,
        price_at_add: guestItem.priceAtAdd || product.price,
        price_changed: priceChanged,
        line_total: `₹ ${lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
        bulk_threshold: product.bulk_threshold ?? 100,
        stock_warning: stockWarning,
        available_stock: product.stock,
        custom_design_file: null,
        variant_id: null,
        variant_label: null,
      });

      // Update stored price if it was missing (self-healing for old guest carts)
      if (!guestItem.priceAtAdd) {
         guestItem.priceAtAdd = product.price;
         setGuestCart(guestItems);
      }
    } catch (e) {
      console.error(`Failed to fetch latest data for guest item: ${guestItem.productSlug}`, e);
    }
  }

  const GST_RATE = 0.18;
  const gstAmount = parseFloat((subtotal * GST_RATE).toFixed(2));
  const cgstAmount = parseFloat((gstAmount / 2).toFixed(2));
  const sgstAmount = parseFloat((gstAmount - cgstAmount).toFixed(2));
  const total = subtotal + gstAmount;

  const fmt = (n: number) => n.toFixed(2);

  return {
    items,
    subtotal: fmt(subtotal),
    discount: "0.00",
    total: fmt(total),
    coupon: null,
    tax_data: {
      gst_amount: fmt(gstAmount),
      cgst_amount: fmt(cgstAmount),
      sgst_amount: fmt(sgstAmount),
    },
  };
}

export async function addGuestCartItem(productSlug: string, quantity: number): Promise<GuestCartItem[]> {
  const slug = productSlug.toLowerCase();
  const cart = getGuestCart();
  
  // We need current price to store as priceAtAdd
  let currentPrice: string | null = null;
  try {
    const p = await fetchProductDetail(slug);
    currentPrice = p.price;
  } catch(e) {
    console.error("Could not fetch product for guest add price snapshot", e);
  }

  const existing = cart.find((i) => i.productSlug.toLowerCase() === slug);
  if (existing) {
    existing.quantity += quantity;
    // Don't update priceAtAdd, we want to know it changed since original add
  } else {
    cart.push({ productSlug: slug, quantity, priceAtAdd: currentPrice || undefined });
  }
  setGuestCart(cart);
  return cart;
}

export function updateGuestCartItemQty(productSlug: string, quantity: number): GuestCartItem[] {
  const slug = productSlug.toLowerCase();
  let cart = getGuestCart();
  if (quantity < 1) {
    cart = cart.filter((i) => i.productSlug.toLowerCase() !== slug);
  } else {
    const item = cart.find((i) => i.productSlug.toLowerCase() === slug);
    if (item) item.quantity = quantity;
  }
  setGuestCart(cart);
  return cart;
}

export function removeGuestCartItem(productSlug: string): GuestCartItem[] {
  const slug = productSlug.toLowerCase();
  const cart = getGuestCart().filter((i) => i.productSlug.toLowerCase() !== slug);
  setGuestCart(cart);
  return cart;
}
