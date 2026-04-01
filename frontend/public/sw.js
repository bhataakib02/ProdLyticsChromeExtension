/* Minimal service worker — enables installability and future offline work without caching the app shell yet. */
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});
