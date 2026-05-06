/* ================================================================
   AOG FIELD HUB — SERVICE WORKER
   Single repo, single SW, all 9 forms cached offline
   
   ⚠ BUMP THIS VERSION whenever you update ANY file
================================================================ */

const CACHE_NAME = 'aog-forms-v1';
const OFFLINE_URL = './index.html';

/* ── Everything to pre-cache on first install ── */
const PRECACHE_URLS = [

  /* ── Hub ── */
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',

  /* ── Install Form ── */
  './install/',
  './install/index.html',

  /* ── Gas Install Form ── */
  './gas-install/',
  './gas-install/index.html',

  /* ── Estimate Form ── */
  './estimate/',
  './estimate/index.html',

  /* ── Maintenance Form ── */
  './maintenance/',
  './maintenance/index.html',

  /* ── Site Visit Form ── */
  './site-visit/',
  './site-visit/index.html',

  /* ── Sketch Pad ── */
  './sketch-pad/',
  './sketch-pad/index.html',

  /* ── Conduit Fill ── */
  './conduit-fill/',
  './conduit-fill/index.html',

  /* ── Load Calc ── */
  './load-calc/',
  './load-calc/index.html',

  /* ── Breaker & Conductor ── */
  './breaker-sizing/',
  './breaker-sizing/index.html',

  /* ── External CDN assets used by forms ── */
  /* html2canvas — used by gas-install and maintenance forms */
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',

  /* Google Fonts */
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;500;600;700&display=swap',
];

/* ================================================================
   INSTALL EVENT
   Pre-cache everything. allSettled = one failure won't break it all.
================================================================ */
self.addEventListener('install', function(event) {
  console.log('[SW] Installing AOG Forms', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Pre-caching all forms…');
        return Promise.allSettled(
          PRECACHE_URLS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Could not cache:', url, err);
            });
          })
        );
      })
      .then(function() {
        console.log('[SW] Pre-cache complete — skipping waiting');
        return self.skipWaiting();
      })
  );
});

/* ================================================================
   ACTIVATE EVENT
   Clean up any old caches from previous versions.
================================================================ */
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating', CACHE_NAME);

  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) { return name !== CACHE_NAME; })
            .map(function(name) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        console.log('[SW] Now controlling all tabs');
        return self.clients.claim();
      })
  );
});

/* ================================================================
   FETCH EVENT
   
   Strategy breakdown:
   ┌─────────────────────────────────┬──────────────────────┐
   │ Request Type                    │ Strategy             │
   ├─────────────────────────────────┼──────────────────────┤
   │ HTML page navigation            │ Network-first        │
   │ Same-origin assets (css/js/img) │ Cache-first          │
   │ Google Fonts CSS                │ Cache-first          │
   │ Google Fonts files (gstatic)    │ Cache-first          │
   │ CDN scripts (html2canvas etc.)  │ Cache-first          │
   │ Everything else                 │ Network-only         │
   └─────────────────────────────────┴──────────────────────┘
================================================================ */
self.addEventListener('fetch', function(event) {
  const req  = event.request;
  const url  = new URL(req.url);

  /* ── Ignore non-GET and browser internals ── */
  if (req.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.protocol === 'blob:') return;

  /* ── 1. HTML Navigation → Network-First ──────────────────
     Always try to get a fresh page.
     If offline, serve the cached version.
     If no cached version, serve the hub offline page.        */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function(networkRes) {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(req, clone);
            });
          }
          return networkRes;
        })
        .catch(function() {
          return caches.match(req)
            .then(function(cached) {
              if (cached) return cached;
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  /* ── 2. Same-origin assets → Cache-First ─────────────────
     JS, CSS, images from this repo.
     Serve from cache instantly, update cache in background.  */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req)
        .then(function(cached) {
          /* Serve from cache immediately */
          if (cached) {
            /* Background refresh — keep cache fresh */
            fetch(req).then(function(networkRes) {
              if (networkRes && networkRes.status === 200) {
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put(req, networkRes);
                });
              }
            }).catch(function() {});
            return cached;
          }
          /* Not cached yet — fetch, cache, return */
          return fetch(req).then(function(networkRes) {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(req, clone);
              });
            }
            return networkRes;
          }).catch(function() {
            console.warn('[SW] Asset unavailable offline:', req.url);
          });
        })
    );
    return;
  }

  /* ── 3. Google Fonts & CDN → Cache-First ─────────────────
     These rarely change. Serve from cache, no background refresh. */
  const isFonts = (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  );
  const isCDN = (
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'unpkg.com'
  );

  if (isFonts || isCDN) {
    event.respondWith(
      caches.match(req)
        .then(function(cached) {
          if (cached) return cached;
          return fetch(req).then(function(networkRes) {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(req, clone);
              });
            }
            return networkRes;
          });
        })
    );
    return;
  }

  /* ── 4. Everything else → default browser behavior ── */
});

/* ================================================================
   MESSAGE EVENT
   Lets any page trigger a SW update programmatically.
   Usage: navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
================================================================ */
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting triggered by page');
    self.skipWaiting();
  }
});
