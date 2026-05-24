// Service Worker – Mein Garten
// Cache-First fuer App-Shell, Network-Only fuer APIs (§12.2)

var CACHE_NAME = "gartenapp-cache-v1";

// Dateien die gecacht werden (App-Shell)
var APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json"
];

// URLs die NICHT gecacht werden (immer Network)
var NETWORK_ONLY = [
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "api.anthropic.com",
  "firestore.googleapis.com",
  "firebase.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com"
];

// Install: App-Shell cachen
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: alte Caches loeschen
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-First fuer App-Shell, Network-Only fuer APIs
self.addEventListener("fetch", function(event) {
  var url = event.request.url;

  // Network-Only fuer externe APIs
  for (var i = 0; i < NETWORK_ONLY.length; i++) {
    if (url.indexOf(NETWORK_ONLY[i]) >= 0) return;
  }

  // Nur GET-Requests cachen
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      // Nicht im Cache: vom Netz holen und cachen
      return fetch(event.request).then(function(response) {
        // Nur erfolgreiche Responses cachen
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(function() {
        // Offline und nicht im Cache: fuer HTML Fallback zur index.html
        if (event.request.headers.get("accept") &&
            event.request.headers.get("accept").indexOf("text/html") >= 0) {
          return caches.match("/index.html");
        }
      });
    })
  );
});
