import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const worker=readFileSync(new URL("../src/sw.ts",import.meta.url),"utf8");
test("Customer Ready retains durable server inbox; lifecycle push only wakes confirmed API order refresh",()=>{
 assert.match(app,/payload\.data\?\.event_id/);
 assert.match(app,/type==="pickup_status"/);
 assert.match(app,/window\.dispatchEvent\(new Event\("localeats-pickup-ready"\)\)/);
 assert.match(app,/const data=await customerPickupApi\.orders\(\)/);
 assert.match(app,/const inbox=await customerPickupApi\.notifications\(\)/);
 assert.match(app,/customerOrderStatusNotices\(previousConfirmedOrders,confirmed,uid\)/);
});
test("Background service worker shows generic pickup status notice, no FCM amount or personal details",()=>{
 assert.match(worker,/payload\.data\?\.type==="pickup_ready"/);
 assert.match(worker,/payload\.data\?\.type==="pickup_status"/);
 assert.match(worker,/showNotification\("LocalEats order update"/);
 assert.match(worker,/order may have a new status/);
 assert.doesNotMatch(worker,/customer_name|customer_phone|total_price/);
});
