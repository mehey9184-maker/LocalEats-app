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
const checkout=read("src/screens/CheckoutScreen.tsx");
const prompt=read("src/components/CustomerPostOrderPushPrompt.tsx");

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

test("Customer Settings has a real notification preference, not a diagnostic test",()=>{
 assert.match(settings,/Pickup notifications/);
 assert.match(settings,/Enable order alerts/);
 assert.match(settings,/Reconnect order alerts/);
 assert.match(settings,/const connected = await onEnable\(\)/);
 assert.match(settings,/<CustomerNotificationSettings onEnable=\{onSubscribeToPush\} \/>/);
 assert.match(settings,/Browser alerts allowed · automatically enabled when registered/);
 assert.match(settings,/Notifications are optional/);
 assert.match(settings,/onSubscribeToPush\?: \(\) => Promise<boolean>/);
 assert.doesNotMatch(settings,/Test browser alert|testLocalAlert|showNotification|getNotifications|CustomerNotificationCheck|customer_local_test/);
 assert.doesNotMatch(settings,/Notification\.requestPermission\(\)/);
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
 assert.match(app,/toast\.error\("Registration not confirmed\. Follow your pickup in Orders\."/);
});

test("transient notifications do not cover the Settings header or repeatedly interrupt refresh",()=>{
 assert.match(app,/bottom-\[calc\(6\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
 assert.match(app,/sm:bottom-4 sm:left-auto sm:right-4 flex justify-end/);
 assert.match(app,/notification\.persistent\s*\?\s*"inset-0 flex items-center justify-center bg-black\/60/);
 assert.match(app,/aria-label="Dismiss notification"/);
 assert.match(app,/let readyInboxErrorShown = false/);
 assert.match(app,/readyInboxErrorShown = false;\s*if \(active\) setNotifications/);
 assert.match(app,/if \(active && !readyInboxErrorShown\) \{\s*readyInboxErrorShown = true;/);
 assert.match(app,/Ready notifications could not refresh\. Retry; no state was inferred\./);
 assert.match(app,/setInterval\(refreshVisible, 30000\)/);
});

test("account dropdown paints above the filter bar so Settings remains visible",()=>{
 const homeHeader=app.slice(app.indexOf('id="home-sticky-header"'),app.indexOf('</header>',app.indexOf('id="home-sticky-header"')));
 assert.match(homeHeader,/max-w-screen-xl mx-auto px-3 sm:px-4 py-2 sm:py-2\.5 flex items-center justify-between gap-2\.5 w-full relative z-20/);
 assert.match(homeHeader,/id="settings-menu-toggle-btn"/);
 assert.match(homeHeader,/<Settings className="w-5 h-5/);
 assert.match(homeHeader,/relative z-0 overflow-hidden border-t border-slate-100/);
 assert.ok(homeHeader.indexOf('id="settings-menu-toggle-btn"') < homeHeader.indexOf('home-filter-chips-bar'),"dropdown should be anchored in the top header row");
});

test("previously granted customer push is on by default without unprompted browser permission requests",()=>{
 assert.match(app,/Customer push is on by default once the browser has already granted it/);
 assert.match(app,/Notification\.permission !== "granted"/);
 assert.match(app,/registerAndSyncPushToken\(uid\)\.catch\(\(\) => null\)/);
 assert.match(app,/window\.addEventListener\("focus", revalidateAllowedPush\)/);
 assert.match(app,/window\.addEventListener\("online", revalidateAllowedPush\)/);
 assert.match(app,/document\.addEventListener\("visibilitychange", onVisible\)/);
 assert.match(app,/lastAttempt < 300000/);
 assert.match(app,/\["localeatssa\.co\.za", "www\.localeatssa\.co\.za"\]/);
 assert.match(settings,/Browser alerts allowed · automatically enabled when registered/);
 assert.match(settings,/Blocked in browser settings/);
 assert.match(settings,/Enable when you are ready/);
 assert.match(settings,/permission === "granted" \? "Reconnect order alerts"/);
 assert.doesNotMatch(app,/useEffect\(\(\) => \{\s*Notification\.requestPermission\(\)/);
});

test("Home push consent is available without turning on real pickup ordering",()=>{
 const home=app.slice(app.indexOf("const handleRequestNotifications = async () =>"),app.indexOf("const handleDismissNotificationBanner ="));
 assert.ok(home.includes("await onEnableNotifications()"));
 assert.ok(!home.includes("pickupOrderingEnabled()"),"Browser consent should not be gated by pickup ordering");
 assert.ok(!home.includes("Pickup notifications not active yet"));
 assert.match(app,/onEnableNotifications=\{\(\) => subscribeToPushNotifications\(\)\}/);
 const consent=app.slice(app.indexOf("const subscribeToPushNotifications = useCallback("),app.indexOf("// Listen for FCM foreground"));
 assert.match(consent,/Notification\.permission === "default"\s*\? await Notification\.requestPermission\(\) : Notification\.permission/);
 assert.match(consent,/if \(permission !== "granted"\)/);
 assert.match(consent,/\["localeatssa\.co\.za", "www\.localeatssa\.co\.za"\]/);
 assert.match(consent,/uid !== auth\.currentUser\?\.uid/);
 assert.match(consent,/return !!saved;/);
 assert.doesNotMatch(consent,/pickupOrderingEnabled\(\)/);
});

test("post-order consent appears ONLY after verified pickup server response",()=>{
 const submit=checkout.slice(checkout.indexOf("const submitReviewedPickup = async (retry: boolean) =>"),checkout.indexOf("const orderingEnabled = pickupOrderingEnabled();"));
 assert.match(submit,/if \(!pickupOrderingEnabled\(\) \|\| quoteLock\.current\) return/);
 assert.match(submit,/const verifiedOrder = await submitPickupQuote\(retry \? null : pickupQuote\);/);
 assert.match(submit,/onConfirm\(\);[\s\S]*onVerifiedPickupPlaced\?\.\(verifiedOrder\.id\);/);
 assert.ok(submit.indexOf("onVerifiedPickupPlaced?.(verifiedOrder.id)") > submit.indexOf("await submitPickupQuote("));
 assert.ok(submit.indexOf("onVerifiedPickupPlaced?.(verifiedOrder.id)") < submit.indexOf("} catch (error)"));
 assert.doesNotMatch(submit.slice(submit.indexOf("} catch (error)")),/onVerifiedPickupPlaced/);
 assert.match(checkout,/onVerifiedPickupPlaced\?: \(orderId: string\) => void/);
 assert.match(app,/onVerifiedPickupPlaced=\{\(orderId: string\) =>/);
 assert.match(app,/auth\.currentUser\?\.uid === uid/);
 assert.match(app,/Notification\.permission !== "granted"/);
 assert.match(app,/setPostOrderPushPrompt\(\{uid, orderId\}\)/);
 assert.match(app,/postOrderPushPrompt !== null/);
 assert.match(app,/postOrderPushPrompt\.uid === session\?\.user\?\.id/);
 assert.match(app,/setPostOrderPushPrompt\(null\)/);
});

test("post-order dialog does not silently request permissions or modify an order",()=>{
 assert.match(prompt,/role="dialog" aria-modal="true"/);
 assert.match(prompt,/Get notified when your food is ready/);
 assert.match(prompt,/Your pickup order was placed/);
 assert.match(prompt,/Enable notifications/);
 assert.match(prompt,/Maybe later/);
 assert.match(prompt,/Orders, even without notifications/);
 assert.match(prompt,/onClick=\{\(\) => \{ void enable\(\); \}\}/);
 assert.match(prompt,/const registered = await onEnable\(\)/);
 assert.doesNotMatch(prompt,/Notification\.requestPermission|submitPickupQuote|customerPickupApi|createOrder|setCurrentScreen|pickup_order_command/);
});

test("public Customer UI does not expose the removed Home address shortcut or developer test panels",()=>{
 const header=app.slice(app.indexOf('id="home-sticky-header"'),app.indexOf("</header>",app.indexOf('id="home-sticky-header"')));
 assert.match(header,/LocalEatsLogo width=\{105\}/);
 assert.doesNotMatch(header,/Set Address|Address Quick-Switcher|onOpenAddressSwitcher|Change delivery address/);
 assert.doesNotMatch(app,/AddressSwitcherModal|onOpenAddressSwitcher|isAddressModalOpen|<DiagnosticTool/);
 assert.match(app,/onRequestLocation=\{requestLocation\}/);
 assert.match(app,/navigateToProfile\("profile"\)/);
 assert.match(app,/onSubscribeToPush=\{subscribeToPushNotifications\}/);
 assert.doesNotMatch(settings,/Test browser alert/);
});
