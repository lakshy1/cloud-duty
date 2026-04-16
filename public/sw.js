const CACHE = "cloudduty-shell-v1";

// Pages to pre-cache on install
const SHELL_URLS = ["/", "/queue", "/saved", "/login", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle http/https — skip chrome-extension://, data:, etc.
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Never intercept Supabase, API routes, or non-GET
  if (
    request.method !== "GET" ||
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Helper: only cache complete (non-partial) responses
  const safePut = (cache, req, res) => {
    // status 206 = partial content (video/audio range request) — not cacheable
    if (res.status === 206) return;
    cache.put(req, res);
  };

  // Next.js immutable static assets — cache first forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => safePut(c, request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Navigation (HTML pages) — network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => safePut(c, request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match("/")
          )
        )
    );
    return;
  }

  // Everything else (images, fonts) — network first, cache on success
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => safePut(c, request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
