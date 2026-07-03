const CACHE_NAME = "otj-shell-v1";
const scopePath = new URL(self.registration.scope).pathname;
const normalizedScope = scopePath.endsWith("/") ? scopePath : `${scopePath}/`;
const SHELL_ASSETS = [normalizedScope, `${normalizedScope}manifest.webmanifest`, `${normalizedScope}seed-n5n4.json`];

function isSeedRequest(requestUrl) {
  return requestUrl.pathname === `${normalizedScope}seed-n5n4.json`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (!isSameOrigin || request.method !== "GET") {
    return;
  }

  if (isSeedRequest(requestUrl)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(`${normalizedScope}seed-n5n4.json`, clone));
          return response;
        })
        .catch(() => caches.match(`${normalizedScope}seed-n5n4.json`))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(normalizedScope)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
