import { resolveApiFetchUrl } from "@/lib/api";

const ACCESS = "jfp_access_token";
const REFRESH = "jfp_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

async function refreshAccessToken(): Promise<string | null> {
  const r = getRefreshToken();
  if (!r) return null;
  let res: Response;
  try {
    const url = await resolveApiFetchUrl("/api/auth/token/refresh/");
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: r }),
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string };
  localStorage.setItem(ACCESS, data.access);
  return data.access;
}

export async function authFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const headers = new Headers(init.headers);
  if (
    !headers.has("Content-Type") &&
    init.body &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }
  let token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    const url = await resolveApiFetchUrl(path.startsWith("/") ? path : `/${path}`);
    res = await fetch(url, { ...init, headers });
  } catch {
    return {
      ok: false,
      status: 0,
      text: "Unable to reach the server. Please check that the API is running and accessible.",
    };
  }
  if (res.status === 401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      let retry: Response;
      try {
        const retryUrl = await resolveApiFetchUrl(path.startsWith("/") ? path : `/${path}`);
        retry = await fetch(retryUrl, { ...init, headers });
      } catch {
        return {
          ok: false,
          status: 0,
          text: "Unable to reach the server. Please check that the API is running and accessible.",
        };
      }
      if (!retry.ok) {
        return { ok: false, status: retry.status, text: await retry.text() };
      }
      return { ok: true, data: (await parseBody(retry)) as T };
    }
  }
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: true, data: (await parseBody(res)) as T };
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export type UserMe = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_email_verified: boolean;
  is_business?: boolean;
  company_name?: string;
  gst_number?: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;
  company_pincode?: string;
};

function formatAuthError(text: string): string {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (typeof j.detail === "string") return j.detail;
    const nfe = j.non_field_errors;
    if (Array.isArray(nfe) && nfe[0]) return String(nfe[0]);
    const first = Object.entries(j).find(
      ([, v]) => Array.isArray(v) && v[0]
    );
    if (first) return String((first[1] as unknown[])[0]);
  } catch {
    /* ignore */
  }
  return text || "Something went wrong.";
}

export async function loginWithEmail(email: string, password: string) {
  const url = await resolveApiFetchUrl("/api/auth/token/");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(formatAuthError(raw));
  const data = JSON.parse(raw) as { access: string; refresh: string };
  setTokens(data.access, data.refresh);
  return data;
}

export async function registerAccount(body: {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  is_business?: boolean;
  company_name?: string;
  gst_number?: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_country?: string;
  company_pincode?: string;
}) {
  const url = await resolveApiFetchUrl("/api/auth/register/");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: number; email: string }>;
}

export async function verifyEmail(uid: string, token: string) {
  const url = await resolveApiFetchUrl("/api/auth/verify-email/");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, token }),
  });
  if (!res.ok) {
     const data = await res.json().catch(() => ({}));
     throw new Error(data.error || "Email verification failed.");
  }
  return res.json();
}

export async function resendVerification(): Promise<{ message: string }> {
  const r = await authFetch<{ message: string }>("/api/auth/verify-email/resend/", {
    method: "POST",
  });
  if (!r.ok) {
    try {
      const parsed = JSON.parse(r.text);
      throw new Error(parsed.error || "Failed to resend verification email.");
    } catch {
      throw new Error(r.text || "Failed to resend verification email.");
    }
  }
  return r.data;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const r = await authFetch<{ message: string }>("/api/auth/password-reset/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!r.ok) {
    try {
      const parsed = JSON.parse(r.text);
      throw new Error(parsed.error || "Failed to request password reset.");
    } catch {
      throw new Error(r.text || "Failed to request password reset.");
    }
  }
  return r.data;
}

export async function confirmPasswordReset(uid: string, token: string, new_password: string): Promise<{ message: string }> {
  const r = await authFetch<{ message: string }>("/api/auth/password-reset-confirm/", {
    method: "POST",
    body: JSON.stringify({ uid, token, new_password }),
  });
  if (!r.ok) {
    try {
      const parsed = JSON.parse(r.text);
      throw new Error(parsed.error || "Failed to reset password.");
    } catch {
      throw new Error(r.text || "Failed to reset password.");
    }
  }
  return r.data;
}

export async function fetchMe(): Promise<UserMe | null> {
  const r = await authFetch<UserMe>("/api/auth/me/");
  if (!r.ok) return null;
  return r.data;
}

export async function updateMe(body: Partial<UserMe>): Promise<UserMe> {
  const r = await authFetch<UserMe>("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export type SavedAddress = {
  id: number;
  name: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

export async function fetchAddresses(): Promise<SavedAddress[]> {
  const r = await authFetch<SavedAddress[]>("/api/addresses/");
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function createAddress(body: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  const r = await authFetch<SavedAddress>("/api/addresses/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function updateAddress(
  id: number,
  body: Partial<SavedAddress>
): Promise<SavedAddress> {
  const r = await authFetch<SavedAddress>(`/api/addresses/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.text);
  return r.data;
}

export async function deleteAddress(id: number): Promise<void> {
  const r = await authFetch<void>(`/api/addresses/${id}/`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error(r.text);
}

