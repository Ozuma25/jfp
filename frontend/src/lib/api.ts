/**
 * Django API base (`frontend/.env.local`).
 * - Local: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
 * - Proxied (no CORS): NEXT_PUBLIC_API_URL=/api-backend + BACKEND_PROXY_TARGET
 */

function normalizedEnvBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (!raw || raw === "/") {
    return "http://127.0.0.1:8000";
  }
  return raw.replace(/\/$/, "");
}

/**
 * Prefix for same-origin URLs (img src, manual joins). Never use for fetch() on the server —
 * use resolveApiFetchUrl() so the request URL is absolute.
 */
export function getApiBase(): string {
  const base = normalizedEnvBase();
  if (base.startsWith("http")) return base;
  return base.startsWith("/") ? base : `/${base}`;
}

/** Server-side origin for same-origin API proxy (no next/headers — safe for client-imported modules). */
function serverAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Absolute URL for fetch() in Server and Client Components.
 * Relative /api-backend must not be passed raw to fetch on the server — it can resolve to /api/... and hit Next.js (HTML 404).
 */
export async function resolveApiFetchUrl(path: string): Promise<string> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = normalizedEnvBase();
  if (base.startsWith("http")) {
    return `${base}${p}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${base}${p}`;
  }
  return `${serverAppOrigin()}${base.startsWith("/") ? base : `/${base}`}${p}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<T> {
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);
  if (!headers.has("Content-Type") && rest.body && typeof rest.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = await resolveApiFetchUrl(path.startsWith("/") ? path : `/${path}`);
  const res = await fetch(url, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
