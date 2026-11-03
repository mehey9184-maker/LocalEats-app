import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {archiveLegacyOrderDrafts,LEGACY_ORDER_QUEUE_KEY} from "../src/services/legacyOfflineDrafts.ts";

const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const app=src("../src/App.tsx");
const profile=src("../src/lib/profileService.ts");
const history=src("../src/screens/OrderHistoryScreen.tsx");
const pickup=src("../src/services/customerPickup.ts");

test("P0 reconnect and manual refresh cannot acknowledge or erase unsent queued requests",()=>{
  assert.doesNotMatch(app,/processNetworkQueue\s*\(/,
    "No request queue processor may acknowledge requests with a no-op callback");
  assert.doesNotMatch(app,/safeLocalStorageSet\("offline_orders_queue",\s*"(?:\[\]|)"/,
    "Manual sync must not delete an unconfirmed order queue");
  assert.doesNotMatch(app,/localStorage\.removeItem\("offline_orders_queue"\)/,
    "Manual sync must not remove queued orders");
  assert.match(app,/Saved offline requests were NOT submitted/);
  assert.match(app,/saved offline requests have NOT been submitted/);
  assert.match(app,/Old offline order drafts are still on this device/);
  assert.doesNotMatch(app,/const syncOfflineOrders/,"Legacy order replay has been removed");
  assert.match(app,/archiveLegacyOrderDrafts\(userProfile\.id,localStorage\)/);
});

test("P0 profile save requires the active verified account and won't impersonate previous user",()=>{
  assert.match(profile,/auth\.currentUser\.uid !== profileData\.user_id/g);
  assert.match(profile,/const existing = parsed && \(parsed\.user_id === profileData\.user_id \|\| parsed\.id === profileData\.user_id\) \? parsed : \{\}/);
  assert.match(profile,/if \(!auth\.currentUser \|\| auth\.currentUser\.uid !== userId\) continue;/);
  assert.match(profile,/Profile account mismatch/);
  assert.match(profile,/if \(!auth\.currentUser \|\| auth\.currentUser\.uid !== userId\) return;/);
});

test("P0 local profile draft isn't falsely reported as saved to the server",()=>{
  assert.match(profile,/Profile saved on this device only\. Online account storage is not confirmed\./);
  assert.match(profile,/Profile saved locally; server save is not confirmed\./);
  assert.doesNotMatch(profile,/return \{ data: \{ cached: true, offline: true(?:, retryScheduled: true)? \}, error: null \}/);
  assert.doesNotMatch(profile,/role: profileData\.role \|\| "user"/,
    "Client must not write authorization roles through public profile/mirror fields");
});

test("P0 order history cannot show mock database empty results as confirmed history",()=>{
  assert.doesNotMatch(history,/supabase\.from\(["']orders["']\)/);
  assert.match(history,/customerPickupApi\.orders\(\)/);
  assert.match(history,/auth\.currentUser\?\.uid!==ownerUid/);
  assert.match(history,/o\.user_id!==ownerUid/);
  assert.match(history,/o\.delivery_type==="collection"/);
  assert.match(history,/historyError \?/);
  assert.match(history,/No confirmed pickup orders returned/);
  assert.match(history,/Older orders from previous LocalEats systems/);
});

test("P0 old order prices cannot be copied into a new cart or presented as a new order",()=>{
  assert.doesNotMatch(history,/addToCart\(/);
  assert.doesNotMatch(history,/Order Again/);
  assert.match(history,/Current Menu/);
  assert.match(history,/Number\(order\.total_price\)\.toFixed\(2\)/);
  assert.doesNotMatch(history,/Track Live/);
  assert.match(pickup,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
});

test("P0 account switch archives unsent drafts under prior account, without data loss",()=>{
  const values=new Map([[LEGACY_ORDER_QUEUE_KEY,JSON.stringify([{id:"old-intent",amount:25}])]]);
  const storage={
    getItem:k=>values.get(k)??null,
    setItem:(k,v)=>values.set(k,v),
    removeItem:k=>values.delete(k),
  };
  assert.equal(archiveLegacyOrderDrafts("firebase-user-A",storage),true);
  assert.equal(storage.getItem(LEGACY_ORDER_QUEUE_KEY),null);
  const archived=JSON.parse(storage.getItem("localeats_unsent_order_drafts_firebase-user-A"));
  assert.deepEqual(archived,[{id:"old-intent",amount:25}]);
  assert.equal(storage.getItem("localeats_unsent_order_drafts_firebase-user-B"),null);
});

test("P0 failed archive storage never deletes original order drafts",()=>{
  const values=new Map([[LEGACY_ORDER_QUEUE_KEY,JSON.stringify([{id:"old-intent"}])]]);
  const storage={
    getItem:k=>values.get(k)??null,
    setItem:()=>{throw new Error("quota exceeded");},
    removeItem:k=>values.delete(k),
  };
  assert.equal(archiveLegacyOrderDrafts("firebase-user-A",storage),false);
  assert.ok(storage.getItem(LEGACY_ORDER_QUEUE_KEY));
  assert.equal(archiveLegacyOrderDrafts("../other",storage),false);
  assert.ok(storage.getItem(LEGACY_ORDER_QUEUE_KEY));
});
