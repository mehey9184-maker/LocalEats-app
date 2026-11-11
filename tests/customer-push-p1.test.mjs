import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read = p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sw=read("public/firebase-messaging-sw.js");
const fb=read("src/lib/firebase.ts");
const app=read("src/App.tsx");
const cfg=JSON.parse(read("firebase-applet-config.json"));

test("customer FCM worker uses complete matching PUBLIC Firebase config and data-only events",()=>{
 const seen={};
 const ctx={
   self:{location:{origin:"https://localeatssa.co.za"},registration:{showNotification:(title,options)=>{
     seen.notification={title,options};}},
     addEventListener:(name,handler)=>{seen[name]=handler;}},
   firebase:{initializeApp:(settings)=>{seen.config=settings;},messaging:()=>({
     onBackgroundMessage:callback=>{seen.background=callback;}
   })},
   importScripts:()=>{},URL,clients:{matchAll:async()=>[],openWindow:async()=>{}}
 };
 vm.runInNewContext(sw,ctx);
 for(const key of ["apiKey","appId","projectId","messagingSenderId","authDomain"]){
   assert.ok(seen.config[key],key+" is required");
   assert.equal(seen.config[key],cfg[key],key+" must equal configured customer app");
 }
 seen.background({data:{type:"pickup_ready",event_id:"event-1",order_id:"secret-order"}});
 assert.equal(seen.notification.title,"Your kota is ready for collection");
 assert.equal(seen.notification.options.tag,"localeats-pickup-event-1");
 assert.ok(!JSON.stringify(seen.notification).includes("secret-order"));
 seen.notification=null;
 seen.background({notification:{title:"SDK owned"},data:{type:"pickup_ready"}});
 assert.equal(seen.notification,null,"do not double-display SDK notifications");
 seen.background({data:{type:"marketing"}});
 assert.equal(seen.notification,null,"do not display unexpected payloads");
 assert.match(sw,/notificationclick/);
 assert.match(sw,/new URL\('\/', self\.location\.origin\)/,"push payload must not supply a navigation destination");
});
test("customer FCM worker uses a dedicated scope rather than replacing the PWA worker",()=>{
 assert.match(fb,/register\("\/firebase-messaging-sw\.js",\s*\{\s*scope:\s*"\/firebase-cloud-messaging-push-scope\/"/);
 assert.doesNotMatch(fb,/getRegistration\("\/firebase-messaging-sw\.js"\)/);
 assert.match(fb,/VITE_FIREBASE_VAPID_KEY/);
 assert.match(fb,/if \(!vapidKey\) return null/);
});
test("device token is stored only by authenticated pickup API and success requires persistence",()=>{
 assert.match(fb,/auth\.currentUser\?\.uid !== userId/);
 assert.match(fb,/customerPickupApi\.subscribe\(installationId, fcmToken\)/);
 assert.match(fb,/customerPickupApi\.revoke\(installationId\)/);
 assert.match(fb,/return result\?\.success === true/);
 const slice=fb.slice(fb.indexOf("export async function syncPushTokenToSupabase"),fb.indexOf("export async function revokePickupPushSubscription"));
 assert.doesNotMatch(slice,/FirestoreService\.savePushToken|localStorage\.setItem\([^,]*fcmToken/);
 assert.match(fb,/return await syncPushTokenToSupabase\(userId, token\) \? token : null/);
});
test("no automatic permission dialogs; pickup inbox reconciles when push is lost",()=>{
 assert.doesNotMatch(app,/requestNotificationPermission\(\);/);
 assert.match(app,/Notification\.permission === "granted"/);
 assert.match(app,/addEventListener\("localeats-pickup-ready", refreshVisible\)/);
 assert.match(app,/addEventListener\("online", refreshVisible\)/);
 assert.match(app,/addEventListener\("visibilitychange", refreshVisible\)/);
 assert.match(app,/setInterval\(refreshVisible, 30000\)/);
 assert.match(app,/await customerPickupApi\.notifications\(\)/);
 assert.doesNotMatch(app,/inboxInFlight \|\| !pickupOrderingEnabled\(\)/);
 assert.match(app,/revokePickupPushSubscription\(session\.user\.id\)/);
 assert.match(app,/toast\.error\("Push registration unavailable/);
});
