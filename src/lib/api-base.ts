/**
 * Resolve the backend API base URL at runtime.
 *
 * Priority:
 *   1. Explicit `NEXT_PUBLIC_API_BASE_URL` override (rare split deployments).
 *   2. Same host as the page, on port 8000 — so a device that loads the app
 *      over the LAN (e.g. http://10.101.187.180:3000) reaches the backend on
 *      the same Mac (http://10.101.187.180:8000) without hardcoding a
 *      DHCP-churned IP.
 *   3. http://localhost:8000 (browsing the app locally on the Mac itself).
 */
export function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.protocol}//${host}:8000`;
    }
  }

  return "http://localhost:8000";
}

export const API_BASE = resolveApiBase();