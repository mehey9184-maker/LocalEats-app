/// <reference lib="webworker" />
import {precacheAndRoute} from "workbox-precaching";
import {initializeApp} from "firebase/app";
import {getMessaging,onBackgroundMessage,isSupported} from "firebase/messaging/sw";
import config from "../firebase-applet-config.json";
declare const self:ServiceWorkerGlobalScope & {__WB_MANIFEST:any[]};
precacheAndRoute(self.__WB_MANIFEST);
// Business reads/writes are network-only: no cached authority or queued order success.
self.addEventListener("install",()=>{void self.skipWaiting();});
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
void isSupported().then(supported=>{
 if(!supported)return;
 const app=initializeApp({
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId:import.meta.env.VITE_FIREBASE_APP_ID || config.appId,
 });
 onBackgroundMessage(getMessaging(app),payload=>{
  if(payload.data?.type!=="pickup_ready" || !payload.data.event_id)return;
  return self.registration.showNotification("LocalEats pickup update",{
   body:"An order was marked Ready. Open LocalEats to check its current status.",
   icon:"/logo.png",tag:payload.data.event_id,data:{url:"/"},
  });
 });
}).catch(()=>{/* Push is optional; the authorized API inbox remains available. */});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{
  const client=clients.find(c=>new URL(c.url).origin===self.location.origin);
  if(client)return client.focus();
  return self.clients.openWindow("/");
 }));
});
