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
      if (event.notification.data?.type === 'pickup_ready') {
        match.postMessage({type:'localeats-pickup-ready'});
      }
      const updateType=event.notification.data?.type || event.notification.data?.FCM_MSG?.data?.type;
      if(updateType==='pickup_acceptance')match.postMessage({type:'localeats-pickup-update'});
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
  // Data-only, private L3-N1 test. Never attach customer/order information or
  // confuse a test with a genuine Ready event. Only the isolated API can send it.
  if (payload.data?.type === 'customer_push_test') {
    const testId = String(payload.data.test_id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testId)) return;
    return self.registration.showNotification('LocalEats notification test', {
      body:'This is a test of pickup alerts. No order was created.',
      icon:'/logo.png',badge:'/logo.png',
      tag:'localeats-customer-test-'+testId,
      data:{type:'customer_push_test'},
    });
  }
  if (payload.data?.type !== 'pickup_ready') return;
  const eventId = String(payload.data.event_id || 'ready').slice(0,80);
  return self.registration.showNotification('Your kota is ready for collection', {
    body:'Open LocalEats to check your order. Pay at the shop before collection.',
    icon:'/logo.png',badge:'/logo.png',
    tag:'localeats-pickup-'+eventId,
    data:{type:'pickup_ready'},
  });
});
