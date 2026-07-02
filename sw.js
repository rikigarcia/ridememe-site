// RideMeme service worker.
//
// Its only job is to make the site installable: Chrome/Android fires the PWA
// install prompt (beforeinstallprompt, which reveals our install bar) only for
// pages backed by a service worker with a fetch handler. It is network-first so
// the hourly-updated news is never served stale — the cache is just an offline
// fallback for the homepage shell.
const CACHE = 'ridememe-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add('/'); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then(function (res) {
        // keep the homepage fresh in cache for offline use
        if (req.mode === 'navigate') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('/', copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('/'); });
      })
  );
});
