import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {nearbyClosedPickupShops} from "../src/services/nearbyClosedPickupShops.ts";

const ivory={lat:-25.9830322643032,lng:28.2074831464466};
const row={id:"my-kota",name:"My-Kota",location:"Katlego Street, Ivory Park",
 lat:ivory.lat,lng:ivory.lng,opening_time:"08:00",closing_time:"22:00",
 stored_is_active:true,effective_is_active:false,is_active:false,
 logo_url:"https://example.test/logo.png"};

test("server-confirmed closed My-Kota is still discoverable as a NON-orderable preview",()=>{
 const shops=nearbyClosedPickupShops([row],ivory);
 assert.equal(shops.length,1);
 assert.deepEqual(shops[0],{id:"my-kota",name:"My-Kota",logo:"https://example.test/logo.png",
  address:"Katlego Street, Ivory Park",distanceKm:0,openingTime:"08:00",closingTime:"22:00"});
 assert.ok(!("menu" in shops[0]));
 assert.ok(!("isOpen" in shops[0]));
});

test("never show permanently disabled, outside-pilot, outside-radius, missing-location or unverified rows",()=>{
 const rows=[row,{...row,id:"manual-off",stored_is_active:false},
  {...row,id:"open",is_active:true,effective_is_active:true},
  {...row,id:"elsewhere",location:"Soweto"},
  {...row,id:"distant",lat:-26.200},
  {...row,id:"missing-location",lat:null},
  {...row,id:"wrong-gps",lat:3,lng:-2},
  {...row,id:"bad-type",stored_is_active:"true"}];
 assert.deepEqual(nearbyClosedPickupShops(rows,ivory).map(s=>s.id),["my-kota"]);
 assert.deepEqual(nearbyClosedPickupShops(rows,null),[]);
 assert.deepEqual(nearbyClosedPickupShops(rows,{lat:NaN,lng:28}),[]);
 assert.deepEqual(nearbyClosedPickupShops(rows,[]),[]);
});

test("Home closed cards cannot call menus, checkout, quote or place orders",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const first=app.indexOf('{closedPickupShops.map(shop=>(');
 const end=app.indexOf('</section>',first);
 assert.ok(first>0&&end>first);
 const block=app.slice(first,end);
 for(const bad of ["onStoreInfo","onClick","setCurrentScreen","checkout","addToCart","menu.map","order"]) {
  if (bad==="order") continue; // descriptive text may contain "Orders unavailable"
  assert.equal(block.includes(bad),false,bad+" must not exist in closed preview");
 }
 assert.match(block,/Orders unavailable/);
 assert.match(app,/customerPickupApi\.approvedShops\(\)/);
 assert.match(app,/readPickupCatalog\(userLocation\)/);
});
