// RideMeme service worker.
//
// Purpose: make the site installable (Chromium requires a fetch handler for the
// PWA install prompt). Strategy — network-only, no HTML cache:
//
//   Caching `/` as an "offline shell" froze sidebar chrome into installed PWAs
//   (users kept seeing Social wire after Road pulse shipped). A news river is
//   useless offline anyway, so we never write to Cache Storage.
//
// Updates are zero-friction: skipWaiting + claim + postMessage, and site.js
// reloads the page once when a new worker takes control. No clear-site-data /
// reinstall steps for end users.
const CACHE = 'ridememe-v3'; // name kept so activate can delete legacy v1/v2 caches

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        // Drop every Cache Storage entry — including older ridememe-v* shells.
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(function (clients) {
            clients.forEach(function (c) {
              c.postMessage({ type: 'RM_SW_UPDATED', cache: CACHE });
            });
          });
      })
  );
});

self.addEventListener('fetch', function (e) {
  // Network-only pass-through. respondWith keeps this a real fetch handler
  // (installability) without ever serving a stale cached shell.
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request));
});
