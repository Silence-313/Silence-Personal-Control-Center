/* Minimal service worker — Phase 2 scope.
 *
 * No offline synchronization or caching is performed. This file only exists
 * so the PWA is installable and upgrades cleanly. Real cache/offline strategy
 * arrives in a later phase alongside the backend.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through by default — network only.
});