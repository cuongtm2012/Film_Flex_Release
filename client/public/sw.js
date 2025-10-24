// Enhanced Service Worker with debugging and aggressive cache management
// Version: 2.0 - Blank Page Fix Edition
const CACHE_VERSION = 'v3';
const BUILD_TIME = Date.now(); // This will be updated during build
const CACHE_NAME = `filmflex-${CACHE_VERSION}-${BUILD_TIME}`;
const DEBUG_MODE = true; // Enable detailed logging

// Enhanced logging
const swLog = (message, data = '') => {
  console.log(`🔧 SW [${CACHE_NAME}]: ${message}`, data);
};

const swError = (message, error = '') => {
  console.error(`🚨 SW [${CACHE_NAME}]: ${message}`, error);
};

// Critical assets that must always work
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/offline.html'
];

// Assets that should NEVER be cached (always fetch fresh)
const NO_CACHE_PATTERNS = [
  '/api/',
  '/auth/',
  '.tsx',
  '.ts',
  '.map',
  'hot-update',
  '@vite/client',
  'node_modules'
];

// Check if URL should bypass cache entirely
function shouldBypassCache(url) {
  const urlPath = new URL(url).pathname;
  return NO_CACHE_PATTERNS.some(pattern => urlPath.includes(pattern));
}

// Enhanced error handling for fetch requests
async function safeFetch(request, options = {}) {
  const { timeout = 10000 } = options;
  
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ]);
}

// Install event with enhanced error handling
self.addEventListener('install', (event) => {
  swLog('Installing service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Force immediate activation to replace old SW
        await self.skipWaiting();
        
        // Only pre-cache critical assets
        const cache = await caches.open(CACHE_NAME);
        
        // Cache critical assets one by one with error handling
        const cachePromises = CRITICAL_ASSETS.map(async (asset) => {
          try {
            const response = await safeFetch(asset, { timeout: 5000 });
            if (response.ok) {
              await cache.put(asset, response);
              swLog(`Cached critical asset: ${asset}`);
            } else {
              swError(`Failed to cache ${asset}: ${response.status}`);
            }
          } catch (error) {
            swError(`Error caching ${asset}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        swLog('Service Worker installed successfully');
        
      } catch (error) {
        swError('Installation failed:', error);
        throw error;
      }
    })()
  );
});

// Activate event with aggressive cleanup
self.addEventListener('activate', (event) => {
  swLog('Activating service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Delete ALL old caches (aggressive cleanup)
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(async (cacheName) => {
          if (cacheName !== CACHE_NAME) {
            swLog(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        // Notify all clients about the update
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            cacheName: CACHE_NAME,
            message: 'New version activated - cache cleared'
          });
        });
        
        swLog('Service Worker activated and claimed all clients');
        
      } catch (error) {
        swError('Activation failed:', error);
        throw error;
      }
    })()
  );
});

// Enhanced fetch handler with debugging
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }
  
  // Always bypass cache for certain URLs
  if (shouldBypassCache(url)) {
    swLog(`Bypassing cache for: ${url}`);
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Network-first strategy for better freshness
        swLog(`Fetching: ${url}`);
        
        try {
          const networkResponse = await safeFetch(request, { timeout: 8000 });
          
          if (networkResponse.ok) {
            // Clone response before any potential consumption
            let responseToCache = null;
            try {
              responseToCache = networkResponse.clone();
            } catch (cloneError) {
              swError(`Failed to clone response for ${url}:`, cloneError);
            }
            
            // Cache successful responses (but don't wait for it)
            if (request.destination !== 'document' && responseToCache) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache).catch(err => {
                  swError(`Failed to cache ${url}:`, err);
                });
              }).catch(err => {
                swError(`Failed to open cache for ${url}:`, err);
              });
            }
            
            swLog(`Network success: ${url}`);
            return networkResponse;
          } else {
            swError(`Network failed with status ${networkResponse.status}: ${url}`);
            throw new Error(`HTTP ${networkResponse.status}`);
          }
          
        } catch (networkError) {
          swError(`Network error for ${url}:`, networkError);
          
          // Try cache as fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            swLog(`Serving from cache: ${url}`);
            return cachedResponse;
          }
          
          // Special handling for document requests (HTML pages)
          if (request.destination === 'document') {
            // Try to serve the main page from cache
            const mainPage = await caches.match('/');
            if (mainPage) {
              swLog('Serving main page from cache for failed document request');
              return mainPage;
            }
            
            // Last resort: offline page
            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) {
              swLog('Serving offline page');
              return offlinePage;
            }
          }
          
          // If all else fails, throw the network error
          throw networkError;
        }
        
      } catch (error) {
        swError(`Fetch handler failed for ${url}:`, error);
        
        // Create a basic error response for debugging
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Loading Error</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .error { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .error h1 { color: #d32f2f; margin-top: 0; }
                .retry-btn { background: #1976d2; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>Failed to Load</h1>
                <p>URL: ${url}</p>
                <p>Error: ${error.message}</p>
                <button class="retry-btn" onclick="location.reload()">Retry</button>
                <button class="retry-btn" onclick="clearAppCache()">Clear Cache & Retry</button>
              </div>
              <script>
                function clearAppCache() {
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      return Promise.all(names.map(name => caches.delete(name)));
                    }).then(() => location.reload());
                  } else {
                    location.reload();
                  }
                }
              </script>
            </body>
          </html>
        `, {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    })()
  );
});

// Enhanced message handling
self.addEventListener('message', (event) => {
  const { data } = event;
  swLog('Received message:', data);
  
  if (data && data.type === 'SKIP_WAITING') {
    swLog('Skipping waiting due to message');
    self.skipWaiting();
  }
  
  if (data && data.type === 'CLEAR_CACHE') {
    swLog('Clearing all caches due to message');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          swLog(`Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true, message: 'All caches cleared' });
      }
      swLog('All caches cleared successfully');
    }).catch(error => {
      swError('Failed to clear caches:', error);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
    });
  }
  
  if (data && data.type === 'GET_CACHE_INFO') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(async (cacheName) => {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          return {
            name: cacheName,
            size: keys.length,
            urls: keys.map(req => req.url)
          };
        })
      );
    }).then(cacheInfo => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          caches: cacheInfo,
          currentCache: CACHE_NAME
        });
      }
    });
  }
});

// Error event handler
self.addEventListener('error', (event) => {
  swError('Service Worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', (event) => {
  swError('Service Worker unhandled rejection:', event.reason);
  // Prevent default logging to avoid duplicate console errors
  event.preventDefault();
});

swLog(`Service Worker loaded - ${CACHE_NAME}`);