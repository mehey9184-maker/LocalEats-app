import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read = p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sw=read("public/firebase-messaging-sw.js");
const fb=read("src/lib/firebase.ts");
const app=read("src/App.tsx");
const cfg=JSON.parse(read("firebase-applet-config.json"));
const settings=read("src/screens/SettingsScreen.tsx");

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
test("fresh Customer FCM registration awaits the exact custom worker becoming active",()=>{
 assert.match(fb,/export async function ensureCustomerPushWorkerActive\(\): Promise<ServiceWorkerRegistration>/);
 assert.match(fb,/register\("\/firebase-messaging-sw\.js", \{/);
 assert.match(fb,/scope: "\/firebase-cloud-messaging-push-scope\/",/);
 assert.match(fb,/registration\.active\?\.state === "activated"/);
 assert.match(fb,/worker\.addEventListener\("statechange", check\)/);
 assert.match(fb,/setTimeout\(\(\) => finish\(new Error\("Firebase notification worker did not activate\."\)\), 10000\)/);
 assert.match(fb,/const registration = await ensureCustomerPushWorkerActive\(\)/);
 assert.doesNotMatch(fb,/await navigator\.serviceWorker\.ready/);
});

test("Customer Settings permits browser-only testing without Firebase send or pickup writes",()=>{
 assert.match(settings,/Pickup notifications/);
 assert.match(settings,/Enable order alerts/);
 assert.match(settings,/Test browser alert/);
 assert.match(settings,/const testLocalAlert = async \(\) =>/);
 assert.match(settings,/Notification\.permission !== "granted"/);
 assert.match(settings,/ensureCustomerPushWorkerActive\(\)/);
 assert.match(settings,/registration\.showNotification\("LocalEats browser notification check"/);
 assert.match(settings,/registration\.getNotifications\(\{tag\}\)/);
 assert.match(settings,/No order, payment or Firebase send was created/);
 const local=settings.slice(settings.indexOf("const testLocalAlert = async () =>"),settings.indexOf("return (",settings.indexOf("const testLocalAlert = async () =>")));
 assert.doesNotMatch(local,/customerPickupApi|fetch\(|getIdToken|sendTestPush|pickup_create_order/);
 assert.match(settings,/Notification\.requestPermission\(\)/);
 assert.match(settings,/\["localeatssa\.co\.za", "www\.localeatssa\.co\.za"\]/);
 assert.match(settings,/Preview does not register a device with the Production API/);
 assert.match(settings,/<CustomerNotificationCheck \/>/);
});

test("background Ready notification returns a display promise and browser-only click is not an order hint",()=>{
 assert.match(sw,/return self\.registration\.showNotification\('Your kota is ready for collection'/);
 assert.match(sw,/event\.notification\.data\?\.type === 'pickup_ready'/);
 assert.match(sw,/if \(payload\.notification\) return;/);
 assert.match(sw,/if \(payload\.data\?\.type !== 'pickup_ready'\) return;/);
 assert.doesNotMatch(sw,/order_id.*body:/);
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
