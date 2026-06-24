const CACHE_NAME = 'portfolio-v1';
const RUNTIME_CACHE = 'portfolio-runtime-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/images/logo.webp',
  '/assets/images/profilepic.webp',
  '/assets/images/hemas-hospital.webp',
  '/assets/images/roof-terrace.webp',
  '/assets/images/holiday-house.webp',
  '/assets/images/hillside-resort.webp',
  '/assets/images/carepoint-hospital.webp',
  '/assets/images/selected-renders.webp',
  '/assets/images/hero-background.webp',
  '/assets/icons/favicon.svg',
  '/assets/icons/apple-touch-icon.webp',
  '/assets/icons/web-app-manifest-192x192.webp',
  '/assets/icons/web-app-manifest-512x512.webp',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700&family=Playfair+Display:wght@700&display=swap'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((error) => console.error('Cache error:', error))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for assets, network-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except Google Fonts)
  if (url.origin !== location.origin && !url.origin.includes('fonts.googleapis.com')) {
    return;
  }

  // Static assets - cache first strategy
  if (
    url.pathname.match(/\.(webp|png|jpg|jpeg|svg|css|js|woff|woff2)$/i) ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
        .catch(() => caches.match('/index.html'))
    );
  }
  // HTML and API - network first strategy
  else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network error
          return caches.match(request)
            .then((response) => response || caches.match('/index.html'));
        })
    );
  }
});

// Background sync (optional - for future form submissions if needed)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contact-form') {
    event.waitUntil(syncContactForm());
  }
});

async function syncContactForm() {
  console.log('Syncing contact form...');
  // Implement form sync logic here if needed
}
