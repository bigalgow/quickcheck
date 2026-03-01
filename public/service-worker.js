// service-worker.js
// Service Worker for RetirePlan PWA

const CACHE_NAME = 'retireplan-v8-pwa-nav';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add your key JS/CSS files here
  // '/static/js/main.js',
  // '/static/css/main.css',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential files');
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension:// and other non-HTTP(S) schemes
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Skip localhost/dev mode - let requests pass through normally
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // For navigation requests (HTML pages), always try network first
  // Only show offline page if truly offline - don't cache HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For other resources (JS, CSS, images), use cache-then-network
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses (but not HTML)
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If fetch fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});