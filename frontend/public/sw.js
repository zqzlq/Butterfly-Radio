// Butterfly Radio Service Worker
// Bypass cache for audio streaming (range requests / 206 responses are not cacheable)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache audio/media requests — they use HTTP range requests
  if (url.pathname.startsWith("/api/media/")) {
    return; // Let the browser handle directly
  }

  // For everything else, use network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
