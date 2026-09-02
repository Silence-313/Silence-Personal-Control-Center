/**
 * Per-device identity + access token, persisted in localStorage.
 *
 * The "machine code" (`device_code`) is a client-generated random id so the Mac
 * can tell one browser/PWA from another. A paired device's `access_token` is
 * what actually authorizes API calls.
 */

const DEVICE_CODE_KEY = "silence.device_code";
const ACCESS_TOKEN_KEY = "silence.access_token";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

let cachedDeviceCode: string | null = null;

export function getDeviceCode(): string {
  if (cachedDeviceCode) return cachedDeviceCode;
  try {
    const existing = window.localStorage.getItem(DEVICE_CODE_KEY);
    if (existing) {
      cachedDeviceCode = existing;
      return existing;
    }
  } catch {
    /* storage unavailable */
  }
  const code = `dev-${randomHex(8)}`;
  try {
    window.localStorage.setItem(DEVICE_CODE_KEY, code);
  } catch {
    /* storage unavailable */
  }
  cachedDeviceCode = code;
  return code;
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearAccessToken(): void {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Device";
}