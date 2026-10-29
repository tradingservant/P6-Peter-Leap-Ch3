const CACHE = "p6-peter-leap-ch3-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/content.js",
  "./js/game.js",
  "./manifest.webmanifest",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./assets/vocab/drought.png",
  "./assets/vocab/tornado.png",
  "./assets/vocab/typhoon.png",
  "./assets/vocab/flood.png",
  "./assets/vocab/landslide.png",
  "./assets/vocab/avalanche.png",
  "./assets/vocab/earthquake.png",
  "./assets/vocab/hill_fire.png",
  "./assets/vocab/tsunami.png",
  "./assets/vocab/volcanic_eruption.png",
  "./assets/vocab/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
