import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifiedMyKotaPreviewPosition} from "../src/services/previewMyKotaTestLocation.ts";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const pickup=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
const myKota={
 id:"shop-my-kota-ivory-park",name:"My-Kota",location:"Katlego Street, Ivory Park",
 latitude:-25.9830322643032,longitude:28.2074831464466,
 stored_is_active:true,effective_is_active:true,is_active:true,
};
test("P7 derives Preview-only test position from real approved My-Kota metadata",()=>{
 const point=verifiedMyKotaPreviewPosition([myKota]);
 assert.deepEqual(point,{lat:myKota.latitude,lng:myKota.longitude});
 assert.deepEqual(verifiedMyKotaPreviewPosition([{id:"other"},myKota]),point);
 assert.equal(verifiedMyKotaPreviewPosition([]),null);
});
test("P7 never uses inactive, unapproved, distant or tampered coordinates",()=>{
 const bad=[
  {...myKota,id:"another-shop"}, {...myKota,name:"Fake Shop"},
  {...myKota,stored_is_active:false},{...myKota,effective_is_active:false},
  {...myKota,is_active:false},{...myKota,location:"Johannesburg CBD"},
  {...myKota,latitude:NaN},{...myKota,longitude:null},
  {...myKota,latitude:-26.8},{...myKota,longitude:29.8},
  {...myKota,latitude:"-25.983"},{...myKota,longitude:"28.207"},
 ];
 for(const sample of bad)assert.equal(verifiedMyKotaPreviewPosition([sample]),null);
});
test("P7 keeps GPS independent and test switch session-only; original cards open original StoreInfo",()=>{
 assert.match(app,/const pickupDiscoveryLocation=previewTestLocation\?\?userLocation/);
 assert.match(app,/const \[previewTestLocation,setPreviewTestLocation\] = useState/);
 assert.match(app,/setPreviewTestLocation\(previewMyKotaPosition\)/);
 assert.match(app,/setPreviewTestLocation\(null\)/);
 assert.match(app,/const visibleShops = pickupDiscoveryLocation \? shops\.filter/);
 assert.match(app,/readPickupCatalog\(pickupDiscoveryLocation\)/);
 assert.match(app,/onStoreInfo=\{onStoreInfo\}/);
 assert.match(app,/<StoreInfoScreen/);
 assert.match(app,/shop=\{visibleShops\.find/);
 assert.match(app,/VITE_PREVIEW_MY_KOTA_TEST_LOCATION==="true"/);
 assert.match(app,/!pickupOrderingEnabled\(\)/);
 assert.doesNotMatch(app,/Pilot shops in Tembisa & Ivory Park/);
 assert.doesNotMatch(app,/verifiedPilotBrowseDirectory\(/);
 assert.match(app,/TEST LOCATION: Simulating a customer near My-Kota/);
 assert.match(app,/The shop address is unchanged, and real ordering is disabled/);
});
test("P7 no real order or price authority is added",()=>{
 assert.match(pickup,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
 assert.match(pickup,/blockPickupSubmission/);
 const helper=readFileSync(new URL("../src/services/previewMyKotaTestLocation.ts",import.meta.url),"utf8");
 assert.doesNotMatch(helper,/fetch\(|checkout\(|createOrder|upsert|insert\(/);
 assert.doesNotMatch(helper,/setItem\(|localStorage|sessionStorage/);
});
