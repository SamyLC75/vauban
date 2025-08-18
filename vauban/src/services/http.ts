export const API_BASE = (() => {
  // Vite (vite/env)
  try {
    const viteEnv = (import.meta as any)?.env;
    if (viteEnv?.VITE_API_URL) return viteEnv.VITE_API_URL as string;
  } catch {
    /* pas Vite */
  }

  // CRA (process.env.REACT_APP_*)
  const cra = (typeof process !== "undefined" && (process as any).env?.REACT_APP_API_URL) || undefined;
  if (cra) return cra as string;

  // Fallback meta <meta name="api-base" content="http://localhost:5000">
  const meta = typeof document !== "undefined"
    ? (document.querySelector('meta[name="api-base"]') as HTMLMetaElement | null)?.content
    : undefined;
  if (meta) return meta;

  // Défaut local
  return "http://localhost:5001";
})();

export function getToken(): string | null {
  return localStorage.getItem("vauban_token") || localStorage.getItem("token") || null;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    const message = payload?.error || payload?.message || `HTTP ${res.status} ${res.statusText || ""}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
