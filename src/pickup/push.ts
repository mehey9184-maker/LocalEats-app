import {deleteToken,getMessaging,getToken,isSupported,onMessage} from "firebase/messaging";
import {localPickupFixture,pickupFirebaseApp} from "./auth";
import type {createPickupApi} from "./client";
type Api=ReturnType<typeof createPickupApi>;
const installation=()=>{
 const key="pickup-installation-v1";
 let id=localStorage.getItem(key);
 if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}return id;
};
let foreground:(()=>void)|undefined;
export async function enablePickupPush(api:Api):Promise<string> {
 if(localPickupFixture)return "Push is unavailable in isolated fixture tests. Ready notifications remain in-app.";
 if(!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported()))
  return "Push is unavailable on this browser. Ready notifications remain in-app.";
 const vapid=import.meta.env.VITE_FIREBASE_VAPID_KEY;
 if(!vapid)return "Push is not configured here. Ready notifications remain in-app.";
 const permission=await Notification.requestPermission();
 if(permission!=="granted")return "Push permission was not granted. Ready notifications remain in-app.";
 const registration=await navigator.serviceWorker.getRegistration("/");
 if(!registration?.active)return "Push needs an installed app worker. Ready notifications remain in-app.";
 const messaging=getMessaging(pickupFirebaseApp);
 const token=await getToken(messaging,{vapidKey:vapid,serviceWorkerRegistration:registration});
 if(!token)return "No push token was available. Ready notifications remain in-app.";
 await api.subscribe(installation(),token);
 foreground?.();
 foreground=onMessage(messaging,payload=>{
  if(payload.data?.type==="pickup_ready")window.dispatchEvent(new Event("pickup-ready"));
 });
 return "Best-effort push enabled on this device. In-app Ready notifications remain authoritative.";
}
export async function revokePickupPush(api:Api):Promise<void> {
 foreground?.();foreground=undefined;
 if(localPickupFixture)return;
 const id=localStorage.getItem("pickup-installation-v1");
 try {if(id)await api.revoke(id);} finally {
  if(await isSupported())await deleteToken(getMessaging(pickupFirebaseApp));
 }
}
