// ============================================================
//  Always On Generators – Field Hub
//  Service Worker  |  sw.js  |  Version: aog-forms-v2.0.0.29
//  Scope: root (../)
//  Strategy: Network-First for HTML, Stale-While-Revalidate
//  for assets, with full offline fallback
// ============================================================

var CACHE_NAME    = 'aog-forms-v2';
var DEV_MODE      = false; // ← SET TRUE during development/testing

// ─── Files to pre-cache on install ───────────────────────────
var PRECACHE_URLS = [
  // Root
  '../',
  '../index.html',
  '../logo.png',
  '../sw.js',

  // Forms
  '../forms/breaker-conductor.html',
  '../forms/conduit-fill.html',
  '../forms/checklist.html',
  '../forms/generator-estimate.html',

  // Offline fallback page
  '../offline.html'
];

// ─── CDN assets to cache on first use ────────────────────────
var CACHE_CDN = [
  'https://api.mapbox.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com'
];

// ============================================================
//  INSTALL — Pre-cache all core files
// ============================================================
self.addEventListener('install', function(event) {
  console.log('[SW] Installing — Cache:', CACHE_NAME);

  if (DEV_MODE) {
    console.log('[SW] ⚠ DEV MODE — Skipping pre-cache, taking control immediately');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Pre-caching core files');
        // Cache files one at a time so one failure won't block all
        return Promise.all(
          PRECACHE_URLS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Pre-cache skipped (file not found):', url, err);
            });
          })
        );
      })
      .then(function() {
        console.log('[SW] Install complete — waiting to activate');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ============================================================
//  ACTIVATE — Delete all old caches, claim clients
// ============================================================
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating — Cache:', CACHE_NAME);

  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 🗑 Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function() {
        console.log('[SW] Activated — claiming all clients');
        return self.clients.claim(); // Take control of all open tabs immediately
      })
  );
});

// ============================================================
//  FETCH — Request handling strategies
// ============================================================
self.addEventListener('fetch', function(event) {

  var request = event.request;
  var url     = new URL(request.url);

  // ── 0. DEV MODE — Always go to network, never cache ──────
  if (DEV_MODE) {
    event.respondWith(
      fetch(request).catch(function() {
        return new Response(
          '<h2 style="font-family:sans-serif;color:red;padding:20px">' +
          '⚠ Network unavailable (Dev Mode — no cache)</h2>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // ── 1. Skip non-GET requests (POST, etc.) ─────────────────
  if (request.method !== 'GET') {
    return;
  }

  // ── 2. Skip browser-extension & non-http requests ─────────
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // ── 3. Skip Mapbox API tile/data requests (always network) ─
  if (url.hostname.includes('mapbox.com') ||
      url.hostname.includes('mapbox.cn')) {
    event.respondWith(
      fetch(request).catch(function() {
        return new Response('{}', {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // ── 4. HTML Pages — Network First ─────────────────────────
  //    Try network → fall back to cache → fall back to offline.html
  if (request.headers.get('Accept') &&
      request.headers.get('Accept').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── 5. Google Fonts & CDN — Stale While Revalidate ────────
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')    ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── 6. Images — Cache First (long-lived assets) ───────────
  if (request.destination === 'image' ||
      url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── 7. JS / CSS — Stale While Revalidate ──────────────────
  if (url.pathname.match(/\.(js|css)$/i)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── 8. Everything else — Network First ────────────────────
  event.respondWith(networkFirst(request));
});

// ============================================================
//  STRATEGY: Network First
//  Try network → save to cache → on fail, serve from cache
//  → on total fail, serve offline.html for HTML requests
// ============================================================
function networkFirst(request) {
  return fetch(request)
    .then(function(networkResponse) {
      if (networkResponse && networkResponse.ok) {
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseClone);
        });
      }
      return networkResponse;
    })
    .catch(function() {
      console.log('[SW] Network failed — serving from cache:', request.url);
      return caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Last resort — serve offline fallback for HTML
          if (request.headers.get('Accept') &&
              request.headers.get('Accept').includes('text/html')) {
            return caches.match('../offline.html');
          }
          // For non-HTML, return empty 503
          return new Response('Service Unavailable', { status: 503 });
        });
    });
}

// ============================================================
//  STRATEGY: Stale While Revalidate
//  Serve from cache immediately, update cache in background
// ============================================================
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cachedResponse) {

      var networkFetch = fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(function(err) {
        console.log('[SW] Revalidate network fetch failed:', err);
      });

      return cachedResponse || networkFetch;
    });
  });
}

// ============================================================
//  STRATEGY: Cache First
//  Serve from cache → if not cached, fetch and store
// ============================================================
function cacheFirst(request) {
  return caches.match(request).then(function(cachedResponse) {
    if (cachedResponse) {
      return cachedResponse;
    }
    return fetch(request).then(function(networkResponse) {
      if (networkResponse && networkResponse.ok) {
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseClone);
        });
      }
      return networkResponse;
    }).catch(function() {
      return new Response('', { status: 404 });
    });
  });
}

// ============================================================
//  MESSAGE HANDLER
//  Listen for manual cache-clear messages from any page
// ============================================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating now');
    self.skipWaiting();
  }

  if (event.data && event.data.action === 'CLEAR_CACHE') {
    console.log('[SW] Received CLEAR_CACHE — nuking all caches');
    caches.keys().then(function(keys) {
      keys.forEach(function(key) { caches.delete(key); });
    });
    event.ports[0].postMessage({ result: 'Cache cleared' });
  }
});

// ============================================================
//  END OF SERVICE WORKER
// ============================================================
