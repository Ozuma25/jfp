const KEY = "jfp_cart_session";

export function getOrCreateCartSession(): string {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem(KEY);
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem(KEY, s);
  }
  return s;
}
