import { getApiBase } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { getOrCreateCartSession } from "@/lib/cartSession";
import {
  getGuestCart,
  addGuestCartItem,
  fetchGuestCartData,
  updateGuestCartItemQty,
  removeGuestCartItem,
  clearGuestCart,
} from "@/lib/guestCart";

export type CartItem = {
  id: number;
  product_slug: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  bulk_threshold: number;
  custom_design_file: string | null;
};

export type CartData = {
  items: CartItem[];
  subtotal: string;
  discount: string;
  total: string;
  coupon: {
    code: string;
    discount_type: string;
    discount_value: string;
  } | null;
  tax_data: {
    gst_amount: string;
    cgst_amount: string;
    sgst_amount: string;
  };
};

import { getRefreshToken, setTokens, clearTokens } from "@/lib/auth";

async function refreshIfNeeded(): Promise<string | null> {
  const r = getRefreshToken();
  if (!r) return null;
  const res = await fetch(`${getApiBase()}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: r }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string };
  setTokens(data.access, r);
  return data.access;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw || res.statusText;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.detail) msg = parsed.detail;
      else if (parsed.message) msg = parsed.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function cartHeaders(options: { isMultipart?: boolean; token?: string | null } = {}): Headers {
  const h = new Headers();
  if (!options.isMultipart) {
    h.set("Content-Type", "application/json");
  }
  const t = options.token !== undefined ? options.token : getAccessToken();
  if (t) {
    h.set("Authorization", `Bearer ${t}`);
  } else {
    h.set("X-Cart-Session", getOrCreateCartSession());
  }
  return h;
}

export async function fetchCart(): Promise<CartData> {
  const token = getAccessToken();
  if (!token) {
    return fetchGuestCartData();
  }
  
  const res = await fetch(`${getApiBase()}/api/cart/`, { headers: cartHeaders({ token }) });
  
  if (res.status === 401) {
    const newAccess = await refreshIfNeeded();
    if (newAccess) {
      const retry = await fetch(`${getApiBase()}/api/cart/`, { headers: cartHeaders({ token: newAccess }) });
      return handleResponse<CartData>(retry);
    }
    clearTokens();
    return fetchGuestCartData();
  }

  return handleResponse<CartData>(res);
}

export async function addToCart(productSlug: string, quantity = 1, designFile?: File | null): Promise<CartData> {
  if (!getAccessToken()) {
    addGuestCartItem(productSlug, quantity);
    return fetchGuestCartData();
  }

  let body: any;
  let headers: Headers;

  if (designFile) {
    body = new FormData();
    body.append("product_slug", productSlug);
    body.append("quantity", quantity.toString());
    body.append("custom_design_file", designFile);
    headers = cartHeaders({ isMultipart: true });
  } else {
    body = JSON.stringify({ product_slug: productSlug, quantity });
    headers = cartHeaders({ isMultipart: false });
  }

  const res = await fetch(`${getApiBase()}/api/cart/items/`, {
    method: "POST",
    headers,
    body,
  });
  return handleResponse<CartData>(res);
}

export async function updateCartItem(
  itemId: number,
  quantity: number,
  productSlug?: string
): Promise<CartData> {
  if (!getAccessToken()) {
    if (!productSlug) throw new Error("productSlug required for guest cart update");
    updateGuestCartItemQty(productSlug, quantity);
    return fetchGuestCartData();
  }
  const res = await fetch(`${getApiBase()}/api/cart/items/${itemId}/`, {
    method: "PATCH",
    headers: cartHeaders(),
    body: JSON.stringify({ quantity }),
  });
  return handleResponse<CartData>(res);
}

export async function removeCartItem(itemId: number, productSlug?: string): Promise<CartData> {
  if (!getAccessToken()) {
    if (!productSlug) throw new Error("productSlug required for guest cart remove");
    removeGuestCartItem(productSlug);
    return fetchGuestCartData();
  }
  const res = await fetch(`${getApiBase()}/api/cart/items/${itemId}/`, {
    method: "DELETE",
    headers: cartHeaders(),
  });
  return handleResponse<CartData>(res);
}

export async function syncGuestCartWithBackend(): Promise<void> {
  const guestItems = getGuestCart();
  if (guestItems.length === 0) return;

  const token = getAccessToken();
  if (!token) return;

  for (const item of guestItems) {
    try {
      await fetch(`${getApiBase()}/api/cart/items/`, {
        method: "POST",
        headers: cartHeaders({ token }),
        body: JSON.stringify({ product_slug: item.productSlug, quantity: item.quantity }),
      });
    } catch (e) {
      console.error(`Failed to sync guest cart item ${item.productSlug}:`, e);
    }
  }

  clearGuestCart();
}

export async function applyCoupon(code: string): Promise<CartData> {
  const t = getAccessToken();
  const res = await fetch(`${getApiBase()}/api/coupons/apply/`, {
    method: "POST",
    headers: cartHeaders({ token: t }),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Invalid coupon code.");
  }
  return fetchCart();
}

export async function removeCoupon(): Promise<CartData> {
  const t = getAccessToken();
  const res = await fetch(`${getApiBase()}/api/coupons/remove/`, {
    method: "POST",
    headers: cartHeaders({ token: t }),
  });
  if (!res.ok) throw new Error("Failed to remove coupon.");
  return fetchCart();
}
