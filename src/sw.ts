import { precacheAndRoute } from 'workbox-precaching';

// Cast self to any to safely bypass TypeScript DOM/WebWorker library declaration conflicts
const sw = self as any;

// Must literally contain "self.__WB_MANIFEST" for workbox's injectManifest plugin to successfully find and inject the assets
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// Handle install and skipWaiting
sw.addEventListener('install', () => {
  sw.skipWaiting();
});

// Handle activate to gain control over clients immediately
sw.addEventListener('activate', (event: any) => {
  event.waitUntil(sw.clients.claim());
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
