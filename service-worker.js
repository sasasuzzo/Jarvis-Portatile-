/* J.A.R.V.I.S Portable — Service Worker
   Cache minimale "app shell": rende l'app installabile e apribile anche
   offline (le chiamate AI/meteo/ecc. restano ovviamente online-only). */

const CACHE_NAME = "jarvis-portable-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./jarvis.css",
  "./memory.js",
  "./hud.js",
  "./voice.js",
  "./files.js",
  "./commands.js",
  "./ai.js",
  "./app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Non intercettare chiamate API esterne (AI, meteo, mappe, ecc.):
  // solo l'app shell passa dalla cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
