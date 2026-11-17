import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isOutsidePickupArea,isWithinPickupArea,pickupDistanceKm,mapPickupShop,requireRealLocation} from "../src/services/pickupMapping.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const base={lat:-25.98,lng:28.2};
const approved={id:"approved-shop",name:"Kota",is_active:true,lat:base.lat,lng:base.lng,location:"Ivory Park",distance_km:0};
const menu=[{id:"real-kota",name:"Kota",price:25,is_available:true}];

test("4 km boundary: 3.9 and exactly 4.0 are eligible; 4.1 is browse only",()=>{
 for(const [distance,inside] of [[3.9,true],[4.0,true],[4.1,false]]){
   const shop=mapPickupShop({...approved,distance_km:distance},menu);
   assert.equal(isWithinPickupArea(shop),inside);
   assert.equal(isOutsidePickupArea(shop),!inside);
   assert.deepEqual(shop.menu.map(item=>[item.name,item.price]),[["Kota",25]]);
 }
 for(const distance of [-0.1,NaN,Infinity]) assert.throws(()=>mapPickupShop({...approved,distance_km:distance},menu),/ineligible pickup shop/);
 assert.equal(isWithinPickupArea({}),false);
 assert.equal(isOutsidePickupArea({}),false,"unknown location must not be falsely labelled distant");
});

test("distance comes from real validated coordinates without fallback estimates",()=>{
 assert.ok(Math.abs(pickupDistanceKm(base,{lat:base.lat,lng:base.lng}))<0.00001);
 const close=pickupDistanceKm(base,{lat:base.lat+0.035,lng:base.lng});
 const far=pickupDistanceKm(base,{lat:base.lat+0.037,lng:base.lng});
 assert.ok(close<4 && far>4,`expected distances around boundary: ${close} ${far}`);
 for(const invalid of [{lat:NaN,lng:base.lng},{lat:91,lng:base.lng},{lat:null,lng:base.lng},{lng:base.lng}]){
   assert.throws(()=>pickupDistanceKm(base,invalid),/real location/);
 }
 assert.throws(()=>pickupDistanceKm({lat:NaN,lng:base.lng},approved),/real location/);
});

test("approved public catalog includes distant shops but cannot activate pickup ordering",()=>{
 const client=read("src/pickup/client.ts");
 const service=read("src/services/customerPickup.ts");
 const mapping=read("src/services/pickupMapping.ts");
 assert.match(client,/approvedShops:\(\)=>request\("\/api\/v1\/catalog\/shops","GET",undefined,true\)/);
 assert.match(client,/shops:\(location:Location\)=>request\("\/api\/v1\/catalog\/pickup-shops\?/);
 assert.match(service,/const listing=await customerPickupApi\.approvedShops\(\)/);
 assert.match(service,/typeof raw\.is_active!=="boolean"/);
 assert.match(service,/pickupDistanceKm\(location,raw\)/);
 assert.match(service,/menu: async id =>/);
 assert.match(mapping,/PICKUP_ORDER_RADIUS_KM=4/);
 assert.match(service,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
 assert.match(service,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
 assert.match(client,/quote:\(intent:unknown/);
 assert.match(client,/create:async\(intent:unknown\)/);
});

test("original ShopCard stays navigable while distant cards are visibly distinct and cannot add menu items",()=>{
 const card=read("src/components/ShopCard.tsx");
 const app=read("src/App.tsx");
 assert.match(card,/onStoreInfo\(shop.id\)/);
 assert.match(card,/outsidePickupArea \? "opacity-75 bg-slate-50/);
 assert.match(card,/Outside pickup area/);
 assert.match(card,/Browse menu · Ordering unavailable beyond 4 km/);
 assert.match(card,/const isUnavailable = outsidePickupArea \|\| !status\.isOpen/);
 assert.match(card,/if \(outsidePickupArea\) \{\s*showAlert\("Outside your pickup area"/);
 assert.match(app,/More shops outside your pickup area/);
 assert.match(app,/const within=sortedShops\.filter/);
 assert.match(app,/const outside=sortedShops\.filter\(isOutsidePickupArea\)/);
 assert.match(app,/if \(outsideA!==outsideB\) return outsideA \? 1 : -1/);
 assert.match(app,/const targetShop=visibleShops\.find\(s=>s\.id===shopId\)/);
 assert.match(app,/!isWithinPickupArea\(targetShop\)/);
 assert.match(app,/const outsidePickupArea = isOutsidePickupArea\(shop\)/);
 assert.match(app,/role="status" className="mx-4 mt-4/);
 assert.match(app,/if \(outsidePickupArea\) \{\s*showAlert\("Outside your pickup area"/);
 assert.match(app,/<MenuItemCard\b/);
 assert.match(app,/const visibleShops=userLocation && nearbyCatalogKey/);
 assert.doesNotMatch(app,/setShops\(DEFAULT_FALLBACK_SHOPS\)/);
});
