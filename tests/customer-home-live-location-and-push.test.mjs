import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {nearestHomeDistance,shouldUpdateHomeLocation} from "../src/services/homeProximity.ts";
import {pickupInstallationId,existingPickupInstallationId} from "../src/services/customerPushSubscription.ts";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=read("../src/App.tsx");
const home=app.slice(app.indexOf("function HomeScreen("),app.indexOf("const parseCardDetailsFromInstructions"));
const settings=read("../src/screens/SettingsScreen.tsx");
const firebase=read("../src/lib/firebase.ts");

const ivory={lat:-25.9830,lng:28.2075};
const shop={id:"s1",latitude:-25.9832,longitude:28.2075,distance:3.5};
test("nearest location prefers real GPS, rejects fabricated/out-of-range distance",()=>{
 const real=nearestHomeDistance(shop,ivory);
 assert.ok(real>0 && real<0.05);
 assert.equal(nearestHomeDistance({...shop,latitude:NaN,longitude:NaN},ivory),3.5);
 assert.equal(nearestHomeDistance({...shop,latitude:NaN,longitude:NaN,distance:9},ivory),Infinity);
 assert.equal(nearestHomeDistance({...shop,latitude:-26.3,longitude:28.20},ivory),Infinity);
 assert.equal(nearestHomeDistance(shop,null),Infinity);
 assert.equal(nearestHomeDistance(shop,{lat:NaN,lng:28.2}),Infinity);
});
test("moving GPS ignores jitter, fake coordinates and rapid location changes",()=>{
 assert.equal(shouldUpdateHomeLocation(null,ivory,0,100),true);
 assert.equal(shouldUpdateHomeLocation(ivory,{lat:NaN,lng:28},0,60_000),false);
 assert.equal(shouldUpdateHomeLocation(ivory,{lat:-25.9831,lng:28.2075},0,60_000),false);
 assert.equal(shouldUpdateHomeLocation(ivory,{lat:-25.9815,lng:28.2075},58_000,60_000),false);
 assert.equal(shouldUpdateHomeLocation(ivory,{lat:-25.9815,lng:28.2075},0,60_000),true);
});
test("Home hides only circled Set Address; pickup area and real GPS protections remain",()=>{
 assert.doesNotMatch(home,/onOpenAddressSwitcher|Set Address/);
 assert.match(home,/Shops near/);
 assert.match(home,/nearestHomeDistance\(shop,userLocation\)/);
 assert.match(home,/Math\.abs\(distA-distB\)>0\.01/);
 assert.match(app,/navigator\.geolocation\.getCurrentPosition/);
 assert.match(app,/navigator\.geolocation\.watchPosition/);
 assert.match(app,/navigator\.geolocation\.clearWatch/);
 assert.match(app,/currentScreen!=="home"/);
 assert.match(app,/document\.addEventListener\("visibilitychange",updateWatch\)/);
 assert.match(app,/readPickupCatalog\(userLocation\)/);
 assert.match(app,/distanceKm\(loadedCatalogLocation\.current,userLocation\)>0\.15/);
 assert.match(app,/\)\s*<=4/);
});
test("Push subscriptions are tied to an authenticated account and stable installation UUID",()=>{
 const map=new Map();
 const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const id=pickupInstallationId("customerA",store);
 assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
 assert.equal(existingPickupInstallationId("customerA",store),id);
 assert.equal(pickupInstallationId("customerA",store),id);
 assert.equal(existingPickupInstallationId("customerB",store),null);
 assert.throws(()=>pickupInstallationId("",store));
});
test("Pickup push requires a manual permission action and a confirmed API subscription",()=>{
 assert.match(app,/onSubscribeToPush=\{pickupOrderingEnabled\(\) \? subscribeToPushNotifications : undefined\}/);
 assert.match(settings,/onClick=\{async\(\)=>\{/);
 assert.match(settings,/Pickup order alerts/);
 assert.match(app,/customerPickupApi\.subscribe\(pickupInstallationId\(targetUserId\),token\)/);
 assert.match(app,/return result\.success===true/);
 assert.match(app,/Notification\.permission==="granted" \? "granted" : await Notification\.requestPermission\(\)/);
 assert.match(app,/const requestNotificationPermission = useCallback\(\(\) => \{/);
 assert.match(app,/Notification\.permission!=="granted"/);
 assert.doesNotMatch(app,/registerAndSyncPushToken\(/);
 assert.match(firebase,/navigator\.serviceWorker\.register\("\/sw\.js", \{type:"module"\}\)/);
});
test("FCM is a wake-up signal: confirmed API events and order history refresh on foreground and resume",()=>{
 assert.match(app,/type==="pickup_ready"/);
 assert.match(app,/type==="pickup_status"/);
 assert.match(app,/window\.dispatchEvent\(new Event\("localeats-pickup-ready"\)\)/);
 assert.match(app,/window\.addEventListener\("localeats-pickup-ready",onRealtimeWake\)/);
 assert.match(app,/window\.addEventListener\("focus",onRealtimeWake\)/);
 assert.match(app,/const inbox=await customerPickupApi\.notifications\(\)/);
 assert.match(app,/const newlyConfirmed=hasServerInbox/);
 assert.match(app,/if\(newlyConfirmed\)toast\.success\("Pickup ready"/);
 assert.match(app,/customerPickupApi\.revoke\(installation\)/);
 assert.equal((app.match(/onLogout=\{logoutCustomer\}/g)||[]).length,2);
 assert.match(app,/await supabase\.auth\.signOut\(\)/);
});
