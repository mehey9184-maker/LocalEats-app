/* LocalEats customer background FCM worker.
 * Separate SW scope from the PWA's application service worker.
 * Firebase Web app identifiers below are PUBLIC config, never admin credentials.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Never navigate to a URL supplied inside an untrusted push payload.
  const destination = new URL('/', self.location.origin).href;
  event.waitUntil((async () => {
    const pages = await clients.matchAll({type:'window',includeUncontrolled:true});
    const match = pages.find(page => new URL(page.url).origin === self.location.origin);
    if (match) {
      await match.focus();
      match.postMessage({type:'localeats-pickup-ready'});
      return;
    }
    await clients.openWindow(destination);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({"apiKey":"AIzaSyB8aAWQbB1BrNI8KLmuD0pOarK3F7oKNv0","authDomain":"localeats-5e26e.firebaseapp.com","projectId":"localeats-5e26e","storageBucket":"localeats-5e26e.firebasestorage.app","messagingSenderId":"281496568360","appId":"1:281496568360:web:da3ff1fc40b9fb29e1188a"});
const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload => {
  // The SDK already displays notification payloads; only display data-only
  // messages here to avoid duplicated browser notifications.
  if (payload.notification) return;
  if (payload.data?.type !== 'pickup_ready') return;
  const eventId = String(payload.data.event_id || 'ready').slice(0,80);
  self.registration.showNotification('Your kota is ready for collection', {
    body:'Open LocalEats to check your order. Pay at the shop before collection.',
    icon:'/logo.png',badge:'/logo.png',
    tag:'localeats-pickup-'+eventId,
    data:{type:'pickup_ready'},
  });
});
