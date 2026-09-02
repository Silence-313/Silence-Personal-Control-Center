"use client";

import { useEffect } from "react";

/**
 * Registers the minimal service worker (production only — avoids stale-cache
 * interference during `next dev`). Offline sync is out of scope for Phase 2.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // SW failure is non-fatal for the prototype.
      });
  }, []);

  return null;
}