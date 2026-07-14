import { precacheAndRoute } from 'workbox-precaching';

// Cast self to any to safely bypass TypeScript DOM/WebWorker library declaration conflicts
const sw = self as any;

// Must literally contain "self.__WB_MANIFEST" for workbox's injectManifest plugin to successfully find and inject the assets
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// ----------------------------------------------------------------------------
// PWA Caching Strategy Definitions
// ----------------------------------------------------------------------------
const CACHE_NAME_APP_SHELL = 'localeats-app-shell-v1';
const CACHE_NAME_API = 'localeats-api-v1';

// Handle install and skipWaiting
sw.addEventListener('install', () => {
  sw.skipWaiting();
});

// Handle activate to gain control over clients immediately
sw.addEventListener('activate', (event: any) => {
  event.waitUntil(sw.clients.claim());
});

// Intercept fetch requests and apply strategic routing policies
sw.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // 1. API Caching Strategy: Network-First with Graceful Offline Fallback
  const isApiRequest = 
    url.pathname.includes('/rest/v1') || 
    url.pathname.includes('/auth/v1') || 
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/');

  if (isApiRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If response is valid, write it to the API Cache clone-wise
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME_API).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network is unavailable or timed out. Attempt to read from DB cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a structured, standard offline fallback JSON
            return new Response(
              JSON.stringify({
                error: 'Offline mode active',
                message: 'LocalEats is currently running offline. Showing cached local transactions.',
                offline: true,
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // 2. App Shell Cache-First Strategy with Stale-While-Revalidate background updates
  const isStaticAsset =
    url.origin === sw.location.origin &&
    (url.pathname.endsWith('.js') ||
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
          // Return the cached asset instantly for high performance, but update cache in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              /* Ignore background refresh failures in offline environments */
            });

          return cachedResponse;
        }

        // Fallback: Fetch from network and write to App Shell Cache on first access
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
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

// Handle Push notifications
sw.addEventListener('push', (event: any) => {
  console.log('[Service Worker] Push Received.');
  let data: any = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback for plain text
      data = { title: 'LocalEats', body: event.data.text() };
    }
  }

  const title = data.title || 'LocalEats Update';
  const options: any = {
    body: data.body || 'You have a new update from LocalEats!',
    icon: data.icon || '/logo.png?v=2',
    badge: data.badge || '/logo.png?v=2',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: data.actions || []
  };

  event.waitUntil(
    sw.registration.showNotification(title, options)
  );
});

// Handle click on Push notifications
sw.addEventListener('notificationclick', (event: any) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url 
    ? new URL(event.notification.data.url, sw.location.origin).href 
    : sw.location.origin;

  event.waitUntil(
    sw.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients: any[]) => {
      // Check if there is already a window/tab open under the same origin and focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(urlToOpen);
      }
    })
  );
});
