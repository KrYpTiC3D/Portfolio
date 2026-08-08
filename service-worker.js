const CACHE_NAME = 'portfolio-v1';
const RUNTIME_CACHE = 'portfolio-runtime-v1';

// Critical shell assets that must be available offline.
// Uses relative paths so they resolve correctly on GitHub Pages (subpath hosting).
const CRITICAL_ASSETS = [
  './',
  'index.html',
  'style.css',
  'script.js'
];

// Image assets referenced in HTML — these are .png, not .webp.
// Cached lazily at runtime; pre-caching here only as a best-effort hint.
const IMAGE_ASSETS = [
  'assets/images/logo.png',
  'assets/images/profilepic.png',
  'assets/images/hemas-hospital.png',
  'assets/images/roof-terrace.png',
  'assets/images/holiday-house.png',
  'assets/images/hillside-resort.png',
  'assets/images/carepoint-hospital.png',
  'assets/images/selected-renders.png'
];

// ── Install: cache critical shell; best-effort for images ──────────────

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Critical assets — these must all succeed for the shell to work offline.
      try {
        await cache.addAll(CRITICAL_ASSETS);
        console.log('Critical shell cached:', CRITICAL_ASSETS.length, 'assets');
      } catch (error) {
        console.error('Failed to cache critical shell:', error);
        throw error; // Re-throw: without the shell, offline mode is useless.
      }

      // Image assets — cache what we can; missing files don't kill installation.
      for (const asset of IMAGE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (error) {
          console.warn('Skipped caching', asset, '— not found:', error.message);
        }
      }

      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches and claim clients ────────────────────

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: strategy per resource type ──────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests entirely (including Google Fonts).
  // Let the browser handle its own caching for external resources.
  if (url.origin !== location.origin) {
    return;
  }

  // Images & static assets — cache-first with runtime filling gaps.
  if (url.pathname.match(/\.(webp|png|jpg|jpeg|svg|css|js|woff|woff2)$/i)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (runtimeCache) => {
        // Check runtime cache first (contains lazily-cached images)
        let response = await caches.match(request, { cacheName: RUNTIME_CACHE });
        if (response) return response;

        // Fall back to install-time cache
        response = await caches.match(request, { cacheName: CACHE_NAME });
        if (response) return response;

        // Network fetch — cache for next time
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            runtimeCache.put(request, res.clone());
          }
          return res;
        } catch {
          // Offline and nothing in cache — return a generic placeholder for images
          if (url.pathname.match(/\.(png|jpg|jpeg|webp)$/i)) {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
              '<rect width="100%" height="100%" fill="#333"/>' +
              '<text x="50%" y="50%" text-anchor="middle" fill="#888"' +
              'font-family="sans-serif" font-size="16">Image unavailable offline</text>' +
              '</svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          // For CSS/JS with no cache, return nothing — page won't render perfectly.
          return new Response(null, { status: 503, statusText: 'Offline' });
        }
      })
    );
  }

  // HTML pages & API — network-first, fallback to cached shell.
  else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline — serve the cached app shell so the page still loads.
          return caches.match('index.html');
        })
    );
  }
});

// ── Background sync (placeholder for future form submissions) ──────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contact-form') {
    event.waitUntil(syncContactForm());
  }
});

async function syncContactForm() {
  console.log('Syncing contact form...');
}