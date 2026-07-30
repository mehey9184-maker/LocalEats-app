/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "",
  authDomain: "localeats-5e26e.firebaseapp.com",
  projectId: "localeats-5e26e",
  storageBucket: "localeats-5e26e.firebasestorage.app",
  messagingSenderId: "281496568360",
  appId: ""
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || 'LocalEats Notification';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'You have an update regarding your order.';
  const icon = payload.notification?.icon || payload.data?.icon || '/logo.png';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: '/logo.png',
    data: payload.data || {},
  };

  self.registration.showNotification(title, notificationOptions);
});
