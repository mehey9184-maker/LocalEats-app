import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifiedPilotBrowseDirectory} from "../src/services/verifiedPilotBrowseDirectory.ts";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const app=read("../src/App.tsx");
const history=read("../src/screens/OrderHistoryScreen.tsx");
const pickup=read("../src/services/customerPickup.ts");
const myKota={
  id:"shop-my-kota-ivory-park",name:"My-Kota",
  location:"Katlego Street, Ivory Park",latitude:-25.9830322643,longitude:28.2074831464,
  stored_is_active:true,effective_is_active:true,is_active:true,
  role:"forged",menu:[{name:"Untrusted",price:0}],
};
const inactive={
  id:"shop-inactive",name:"meat guy",location:"ivory 2",
  latitude:-26.009457,longitude:28.185125,
  stored_is_active:false,effective_is_active:false,is_active:false,
};

test("P6 read-only pilot directory exposes genuine approved shop metadata outside radius",()=>{
 const rows=verifiedPilotBrowseDirectory([myKota,inactive],{lat:-26.10,lng:28.10});
 assert.deepEqual(rows.map(x=>x.name).sort(),["My-Kota","meat guy"]);
 const kota=rows.find(x=>x.name==="My-Kota");
 assert.equal(kota.reason,"outside_radius");
 assert.ok(kota.distanceKm>4);
 assert.equal(rows.find(x=>x.name==="meat guy").reason,"not_accepting");
 assert.equal("menu" in kota,false,"Directory cannot expose unverified menu or prices");
 assert.equal("role" in kota,false);
});

test("P6 pilot directory never duplicates orderable shops and cannot infer GPS",()=>{
 const gpsMissing=verifiedPilotBrowseDirectory([myKota],null);
 assert.equal(gpsMissing.length,1);
 assert.equal(gpsMissing[0].distanceKm,null);
 assert.equal(gpsMissing[0].reason,"unconfirmed");
 const nearby=verifiedPilotBrowseDirectory([myKota],{lat:-25.9830,lng:28.2074});
 assert.equal(nearby[0].reason,"unconfirmed","Only pickup API can confirm orderability");
 const alreadyOrderable=verifiedPilotBrowseDirectory([myKota],{lat:-25.9830,lng:28.2074},
   new Set(["shop-my-kota-ivory-park"]));
 assert.deepEqual(alreadyOrderable,[]);
});

test("P6 rejects malformed/unapproved-looking location and invalid geographic metadata",()=>{
 const rows=[
   myKota,{...myKota,id:"duplicate-2"},myKota,
   {...myKota,id:"invalid-location",latitude:3,longitude:-2},
   {...myKota,id:"invalid-nan",latitude:NaN},
   {...myKota,id:"no-location",location:null},
   {...myKota,id:"not-pilot",location:"Somewhere in Soweto"},
   {...myKota,id:"missing-name",name:""},
   {...myKota,id:"no-uid",id:null},
   {...myKota,id:"coords-string",latitude:"-26.0"},
 ];
 const result=verifiedPilotBrowseDirectory(rows,null);
 assert.deepEqual(result.map(x=>x.id),["shop-my-kota-ivory-park","duplicate-2"]);
});

test("P6 Home lists public approved shops separately without creating a cart/checkout authority",()=>{
 assert.match(app,/customerPickupApi\.approvedShops\(\)/);
 assert.match(app,/setPilotDirectoryRows\(result\.shops\)/);
 assert.match(app,/verifiedPilotBrowseDirectory\(/);
 assert.match(app,/aria-label="Approved pilot shops browse only"/);
 assert.match(app,/Pilot shops · browse only/);
 assert.match(app,/Outside 4 km pickup area/);
 assert.match(app,/No verified Tembisa or Ivory Park shop records/);
 assert.match(app,/PROFILE_P5_ENABLE_STAGING_WRITES|pilotDirectoryStatus/);
 assert.doesNotMatch(read("../src/services/verifiedPilotBrowseDirectory.ts"),/createPickup\(|addToCart\(|\bfetch\(/);
});

test("P6 handles unknown-history and signed-out account states without endless skeletons",()=>{
 assert.match(app,/ordersLoadState\.uid===\(session\?\.user\?\.id\?\?null\)/);
 assert.match(history,/!ownerUid \? \(/);
 assert.match(history,/Sign in to view pickup history/);
 assert.match(history,/Older orders from previous LocalEats systems are not imported or deleted/);
 assert.match(history,/disabled=\{!ownerUid\}/);
 assert.match(app,/const pickupOrders=data\.orders\.filter\(o=>o\.delivery_type==="collection"\)/);
 assert.match(app,/data\.orders\.some\(o=>/);
 assert.match(app,/o\.user_id!==uid/);
 assert.match(app,/firebaseAuth\.currentUser\?\.uid!==uid/);
});

test("P6 one bad menu cannot blank independently confirmed nearby shops",()=>{
 assert.match(pickup,/Promise\.allSettled\(result\.shops\.map/);
 assert.match(pickup,/check\.status==="fulfilled"/);
 assert.match(pickup,/verified\.length===0/);
 assert.doesNotMatch(pickup,/DEFAULT_FALLBACK_SHOPS|MY_KOTA_TEST_STORE|mockCatalog/);
});
