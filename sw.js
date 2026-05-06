/* ================================================================
   AOG HUB — SERVICE WORKER
   Strategy: Cache-First for assets, Network-First for pages
   Version: bump CACHE_NAME to force update on all devices
================================================================ */

const CACHE_NAME = 'aog-hub-v1';
const OFFLINE_URL = './index.html';

/* ── Files to pre-cache on install ── */
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  /* Google Fonts — cache the CSS (fonts themselves cache automatically) */
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;500;600;700&display=swap',
];

/* ================================================================
   INSTALL — pre-cache critical assets
================================================================ */
self.addEventListener('install', function(event) {
  console.log('[SW] Installing AOG Hub v1…');

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pre-caching assets');
      /* Use individual adds so one failure doesn't break everything */
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Failed to cache:', url, err)
          )
        )
      );
    }).then(function() {
      /* Take over immediately — don't wait for old SW to die */
      return self.skipWaiting();
    })
  );
});

/* ================================================================
   ACTIVATE — delete old caches
================================================================ */
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating…');

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      /* Claim all open tabs immediately */
      return self.clients.claim();
    })
  );
});

/* ================================================================
   FETCH — smart caching strategy
================================================================ */
self.addEventListener('fetch', function(event) {
  const req = event.request;
  const url = new URL(req.url);

  /* ── 1. Skip non-GET and chrome-extension requests ── */
  if (req.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* ── 2. Navigation requests (HTML pages) → Network-First ──
     Try network, fall back to cache, fall back to offline page */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function(networkResponse) {
          /* Cache a fresh copy */
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(function() {
          /* Network failed — try cache */
          return caches.match(req).then(function(cached) {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  /* ── 3. Same-origin assets → Cache-First ──
     Images, CSS, JS from this repo load instantly offline */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        /* Not in cache yet — fetch and store */
        return fetch(req).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResponse;
        }).catch(function() {
          console.warn('[SW] Asset unavailable offline:', req.url);
        });
      })
    );
    return;
  }

  /* ── 4. Google Fonts → Cache-First (long TTL) ── */
  if (url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  /* ── 5. Cross-origin requests (the 9 form repos) → Network-Only ──
     The individual form repos each have their OWN service workers.
     The hub SW should NOT try to cache them — let them handle themselves. */
  /* Default browser behavior — do nothing, let it pass through */
});

/* ================================================================
   MESSAGE — allow pages to trigger SW updates
================================================================ */
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
