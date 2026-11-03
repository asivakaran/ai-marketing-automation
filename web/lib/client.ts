/**
 * Client-side helpers.
 *
 * apiUrl(path) — builds a same-origin URL. When served behind a port-mapping
 * gateway (some hosting/demo environments) it preserves the ?XTransformPort=
 * <port> parameter so navigation + fetches keep working. In a normal
 * deployment (localhost / Vercel / any host) it is a no-op passthrough.
 */
export function apiUrl(path: string): string {
  const hasProto = /^https?:\/\//i.test(path);
  if (hasProto) return path;
  if (typeof window === "undefined") return path;
  const url = new URL(path, window.location.origin);
  const port = new URLSearchParams(window.location.search).get("XTransformPort");
  if (port) url.searchParams.set("XTransformPort", port);
  return url.pathname + url.search;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json()) as ApiEnvelope<T>;
}
