/* Minimal offline support — downloaded articles + offline library only. */
const IMAGE_CACHE = "jd-offline-images-v1";
const SHELL_CACHE = "jd-offline-shell-v1";
const SHELL_URLS = [
  "/archive/offline",
  "/archive/offline/storage",
  "/offline-unavailable",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Serve cached article images
  if (req.destination === "image" || /\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          return await fetch(req);
        } catch {
          return new Response("", { status: 504, statusText: "Offline image unavailable" });
        }
      })
    );
    return;
  }

  // Offline library / reader navigations
  if (req.mode === "navigate") {
    const path = url.pathname;
    const isOfflineApp =
      path.startsWith("/archive/offline") || path === "/offline-unavailable";

    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          if (isOfflineApp && network.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, network.clone()).catch(() => undefined);
          }
          return network;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached =
            (await cache.match(req)) ||
            (await cache.match("/archive/offline")) ||
            (await cache.match("/offline-unavailable"));
          if (cached) return cached;
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Offline</title><body style='font-family:system-ui;padding:24px'><h1>Offline</h1><p>Downloaded articles: <a href='/archive/offline'>/archive/offline</a></p></body>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
  }
});
