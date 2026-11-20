import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mapPickupShop,requireRealLocation} from "../src/services/pickupMapping.ts";

const point={lat:-25.98,lng:28.2};
const safeShop={
 id:"approved-public-1",name:"Kota Shop",is_active:false,
 lat:point.lat,lng:point.lng,distance_km:0.8,
 logo_url:"https://example.invalid/kota.png",description:"Public story",
 location:"Ivory Park",category:"Kota",rating:4.5,
 opening_time:"08:00",closing_time:"18:00",
};
const privateKeys=["owner_id","owner_email","phone","approval_status","bank_account",
 "availability_revision","availability_override_until","firebase_uid",
 "service_role_key","token","private_notes","customer_contact"];

test("N8L Customer ShopCard maps only trusted public display keys and preserves closed browsing",()=>{
 const input={...safeShop,
  owner_id:"owner-private",phone:"+27 111 222 333",owner_email:"owner@example.invalid",
  approval_status:"approved",bank_account:"012345",availability_revision:900,
  service_role_key:"synthetic-no-real-secret",private_notes:"internal",
 };
 const mapped=mapPickupShop(input,[]);
 assert.equal(mapped.id,input.id);
 assert.equal(mapped.isOpen,false);
 assert.equal(mapped.is_active,false);
 assert.equal(mapped.name,"Kota Shop");
 assert.equal(mapped.logo,input.logo_url);
 assert.equal(mapped.rating,4.5);
 assert.equal(mapped.distance,0.8);
 assert.equal(mapped.opening_time,"08:00");
 assert.equal(mapped.closing_time,"18:00");
 for(const key of privateKeys)assert.equal(Object.hasOwn(mapped,key),false,key);
});

test("N8L Customer menu cards never spread server-owned pricing or private nested fields",()=>{
 const item={id:"menu-1",shop_id:"approved-public-1",name:"Kota",
   price:25,is_available:true,image_url:"https://example.invalid/kota.png",
   description:"Kota",category:"Food",owner_id:"hidden",supplier_cost:12,
   private_notes:"secret",customizations:[{name:"secret",price:100}]};
 const result=mapPickupShop({...safeShop,is_active:true},[item]);
 assert.equal(result.menu.length,1);
 const out=result.menu[0];
 assert.deepEqual(out.customizations,[]);
 assert.equal(out.price,25);
 assert.equal(out.name,"Kota");
 assert.equal(out.displayPrice,"R 25.00");
 for(const key of ["owner_id","supplier_cost","private_notes","shop_id"])
   assert.equal(Object.hasOwn(out,key),false,key);
});

test("N8L server validation still requires real GPS, finite prices and 4km eligibility",()=>{
 assert.throws(()=>mapPickupShop({...safeShop,distance_km:4.01},[]),/ineligible pickup shop/);
 assert.throws(()=>mapPickupShop({...safeShop,lat:NaN},[]));
 assert.throws(()=>requireRealLocation(null));
 assert.throws(()=>mapPickupShop(safeShop,[{id:"item",name:"Kota",price:NaN,is_available:true}]),/invalid menu price/);
});

test("N8L safe Customer primary discovery remains API-only with no Firestore fallback",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const pickup=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
 const mapper=readFileSync(new URL("../src/services/pickupMapping.ts",import.meta.url),"utf8");
 assert.match(app,/readPickupCatalog\(userLocation/);
 assert.match(pickup,/shops: customerPickupApi\.shops/);
 assert.match(pickup,/menu: async id/);
 assert.match(mapper,/return \{id:String\(shop\.id\),name:shop\.name/);
 assert.ok(!mapper.includes("return {...shop"));
 assert.ok(!mapper.includes("return {...item"));
});

test("N8L legacy Customer mutations remain a separate blocker, not falsely marked migrated",()=>{
 const firebase=readFileSync(new URL("../src/lib/firebase.ts",import.meta.url),"utf8");
 for(const action of ["addReview","followShop","unfollowShop",
  "sendMessage","savePushToken","submitContactMessage"]){
  assert.ok(firebase.includes("async "+action+"("),action);
 }
 // The API catalog replacement is read-only; do not claim review/chat writes
 // persisted merely because a public catalog response was available.
 const pickup=readFileSync(new URL("../src/pickup/client.ts",import.meta.url),"utf8");
 assert.match(pickup,/"\/api\/v1\/catalog\/pickup-shops\?lat="/);
 assert.ok(!pickup.includes('addReview:'));
 assert.ok(!pickup.includes('sendMessage:'));
});
