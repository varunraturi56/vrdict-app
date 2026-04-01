// VRdict Service Worker — enables PWA install prompt and standalone mode
const CACHE_NAME = "vrdict-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first strategy — app needs fresh data
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
