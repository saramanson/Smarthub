const CACHE_NAME = "smart-home-app-shell-v2";
const OFFLINE_PAGE = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_PAGE, copy));
      }
      return response;
    }).catch(() => caches.match(OFFLINE_PAGE).then((cached) => cached ?? Response.error())));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
    if (!response.ok) return response;
    const copy = response.clone();
    void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
