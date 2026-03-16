const CACHE_NAME = "immo2025-v5";

// Only precache truly static shell assets
const PRECACHE_URLS = ["/manifest.json", "/favicon.png"];

// Patterns that should NEVER be cached
const NO_CACHE_PATTERNS = [
  "/share",
  "/api/",
  "/_next/",        // Next.js bundles, RSC flight data, HMR — version-dependent
];

// Only cache static assets (images, fonts, icons)
const CACHEABLE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff2", ".woff"];

function isCacheableAsset(pathname) {
  return CACHEABLE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Écouter le message SKIP_WAITING pour forcer la mise à jour
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never cache API, share, _next/* (RSC, bundles, HMR)
  if (NO_CACHE_PATTERNS.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  // For navigation requests (HTML pages): always go to network, no cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline") || caches.match("/dashboard"))
    );
    return;
  }

  // Only cache static assets (images, fonts)
  if (isCacheableAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network only (no caching)
});
