import { authFetch } from "@/lib/auth";

export type OrderListItem = {
  id: number;
  order_number: string;
  status: string;
  total: string;
  currency: string;
  created_at: string;
  first_item_image: string | null;
  first_item_name: string;
  item_count: number;
};

export type OrderLine = {
  product_id: number;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  custom_design_file: string | null;
};

export type OrderHistory = {
  status: string;
  note: string;
  created_at: string;
};

export type OrderDetail = OrderListItem & {
  subtotal: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_method?: string;
  shipping_cost?: string;
  /** Present for store pickup: live store address from server settings (not the order snapshot). */
  pickup_at_store?: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    map_url: string;
  } | null;
  razorpay_order_id: string;
  admin_rejection_reason: string;
  is_bulk: boolean;
  tracking_number: string;
  tracking_provider: string;
  tracking_url: string;
  lines: OrderLine[];
  history: OrderHistory[];
};

export async function fetchOrders(): Promise<OrderListItem[]> {
  const r = await authFetch<OrderListItem[]>("/api/orders/");
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function fetchOrder(id: string | number): Promise<OrderDetail> {
  const r = await authFetch<OrderDetail>(`/api/orders/${id}/`);
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export type CheckoutResponse =
  | {
      order_id: number;
      mock_payment: true;
      detail: string;
    }
  | {
      order_id: number;
      razorpay_order_id: string;
      amount: number;
      currency: string;
      key_id: string;
    };

export type ShippingMethodId = "store_pickup" | "doorstep" | "custom_courier";

export type ShippingPayload = {
  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_method?: ShippingMethodId;
  is_business_order?: boolean;
};

export type ShippingInfo = {
  doorstep_fee_inr: string;
  store_pickup: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
  };
  store_pickup_map_url?: string;
};

export async function fetchShippingInfo(): Promise<ShippingInfo> {
  const { resolveApiFetchUrl } = await import("@/lib/api");
  const url = await resolveApiFetchUrl("/api/shipping-info/");
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ShippingInfo>;
}

export async function checkoutRequest(body: ShippingPayload) {
  const r = await authFetch<CheckoutResponse>("/api/checkout/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = r.text;
    let code: string | null = null;
    try {
      const parsed = JSON.parse(r.text) as any;
      if (parsed?.detail) msg = String(parsed.detail);
      if (parsed?.code) code = String(parsed.code);
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as any;
    if (code) err.code = code;
    err.status = r.status;
    throw err;
  }
  return r.data;
}

export async function verifyRazorpayPayment(payload: {
  order_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const r = await authFetch<OrderDetail>("/api/payments/razorpay/verify/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function cancelOrder(id: string | number) {
  const r = await authFetch<{ detail: string }>(`/api/orders/${id}/cancel/`, { method: "POST" });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function payApprovedOrder(id: string | number) {
  const r = await authFetch<CheckoutResponse>(`/api/orders/${id}/pay/`, { method: "POST" });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function reuploadDesign(id: string | number, file: File) {
  const body = new FormData();
  body.append("custom_design_file", file);
  // Do a manual fetch because authFetch assumes JSON body by default if not a string
  const { getAccessToken } = await import("@/lib/auth");
  const { resolveApiFetchUrl } = await import("@/lib/api");
  const token = getAccessToken();
  const url = await resolveApiFetchUrl(`/api/orders/${id}/reupload/`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ detail: string }>;
}

export type BulkQuote = {
  id: number;
  product_slug: string;
  product_name?: string;
  product_image?: string | null;
  quantity: number;
  name: string;
  email: string;
  phone: string;
  requirements: string;
  status: string;
  quoted_price_per_unit: string | null;
  admin_notes: string;
  order: number | null;
  order_display_number: string | null;
  created_at: string;
};

export async function fetchQuotes(): Promise<BulkQuote[]> {
  const r = await authFetch<BulkQuote[]>("/api/quotes/");
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function acceptQuote(id: number) {
  const r = await authFetch<{ order_id: number; order_number?: string; detail: string }>(`/api/quotes/${id}/accept/`, { method: "POST" });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function rejectQuote(id: number) {
  const r = await authFetch<{ detail: string }>(`/api/quotes/${id}/reject/`, { method: "POST" });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}
