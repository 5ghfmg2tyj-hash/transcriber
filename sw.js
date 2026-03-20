// Bump this version string with every deploy to force cache refresh
const CACHE_VERSION = 'transcriber-v3';
const STATIC = ['./manifest.json', './sw.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) { return cache.addAll(STATIC); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always fetch Transcriber.html fresh from network so updates are instant.
  // Fall back to cache only when offline.
  if (url.includes('Transcriber.html')) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_VERSION).then(function(cache) { cache.put(e.request, clone); });
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for everything else (manifest, sw, icons)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          var clone = res.clone();
          caches.open(CACHE_VERSION).then(function(cache) { cache.put(e.request, clone); });
        }
        return res;
      }).catch(function() { return cached; });
    })
  );
});
