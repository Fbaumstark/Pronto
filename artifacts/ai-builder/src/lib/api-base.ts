export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function api(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("/api") ? API_BASE + path : path;
  return fetch(url, { credentials: "include", ...init });
}
