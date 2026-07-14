/**
 * LocalEats Progressive Web App (PWA) Service Worker
 * ----------------------------------------------------------------------------
 * Designed to serve township economies (e.g., Tembisa) with mid-to-low-tier
 * Android devices, operating on unstable 3G/LTE cellular connections.
 * 
 * Features:
 *  1. App Shell Cache-First with background Stale-While-Revalidate updates.
 *  2. API Requests Network-First with cached/offline fallback structures.
 *  3. Automated cache self-cleaning.
 */

const CACHE_NAME_APP_SHELL = 'localeats-app-shell-v2';
const CACHE_NAME_API = 'localeats-api-v2';

// Standard assets constituting the core App Shell structure
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo.png?v=2',
  '/manifest.json',
  '/manifest.json?v=2',
  '/version.json'
];

// Install Event: Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
      console.log('[Service Worker] Pre-caching Core App Shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Claim clients and clean up stale legacy caches
self.addEventListener('activate', (event) => {
  const activeCacheNames = [CACHE_NAME_APP_SHELL, CACHE_NAME_API];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!activeCacheNames.includes(name)) {
            console.log('[Service Worker] Pruning legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Implement strategic offline/online boundary routes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Exclude non-GET requests (e.g., POST transactions, database write operations)
  if (request.method !== 'GET') {
    return;
  }

  // 1. API Requests Strategy: Network-First with Graceful Offline Fallback
  const isApiRequest =
    url.pathname.includes('/rest/v1') ||
    url.pathname.includes('/auth/v1') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/');

  if (isApiRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful (status 200), clone and save response to the API cache
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME_API).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network connection failed or timed out. Attempt to return from cache.
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving API response from local cache fallback:', url.pathname);
              return cachedResponse;
            }
            
            // Standard JSON fallback structure if no cache exists for this endpoint
            return new Response(
              JSON.stringify({
                error: 'Offline mode active',
                message: 'You are currently browsing offline. Live menus or order states may be delayed.',
                offline: true,
                timestamp: Date.now()
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
                statusText: 'Service Unavailable (Offline)'
              }
            );
          });
        })
    );
    return;
  }

  // 2. App Shell Static Assets Strategy: Cache-First with background refresh (Stale-While-Revalidate)
  const isStaticAsset =
    url.origin === self.location.origin &&
    (STATIC_ASSETS.includes(url.pathname) ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.includes('/assets/'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return the cached asset instantly, then update cache in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch failures when offline
            });
          return cachedResponse;
        }

        // Cache miss: Retrieve via network and store in Cache
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }
});
