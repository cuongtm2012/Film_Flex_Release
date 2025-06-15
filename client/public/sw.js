// Dynamic cache name with timestamp for automatic invalidation
const CACHE_VERSION = 'v2';
const BUILD_TIME = 1749965229;
const CACHE_NAME = `filmflex-${CACHE_VERSION}-${BUILD_TIME}`;

// Only cache essential static assets, not dynamic content
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/logo.png',
  '/offline.html'
];

// Assets that should never be cached (dynamic content)
const noCachePatterns = [
  '/api/',
  '/src/',
  '.tsx',
  '.ts',
  '.css'
];

// Check if URL should be cached
function shouldCache(url) {
  return !noCachePatterns.some(pattern => url.includes(pattern));
}

// Install event - cache only essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating, cleaning old caches');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete all caches except the current one
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - network first for dynamic content, cache for static assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Network first strategy for better freshness
    fetch(event.request)
      .then((response) => {
        // If network succeeds, cache static assets and return response
        if (response.ok && shouldCache(url)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If requesting a page and nothing in cache, show offline page
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            // For other assets, let them fail
            throw new Error('Network failed and not in cache');
          });
      })
  );
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});