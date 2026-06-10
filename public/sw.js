// VRdict Service Worker — PWA installability + cache-first TMDB posters.
// TMDB image URLs are content-addressed (the path changes when the image
// changes), so cache-first is safe. All other requests fall through to the
// network with no respondWith() — the SW adds zero latency to app/API traffic.
const CACHE_NAME = "vrdict-v4";
const TMDB_IMAGES = "https://image.tmdb.org/t/p/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(TMDB_IMAGES)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
  );
});
