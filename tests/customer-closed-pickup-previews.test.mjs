import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {nearbyClosedPickupShops,closedPickupCardData} from "../src/services/nearbyClosedPickupShops.ts";

const ivory={lat:-25.9830322643032,lng:28.2074831464466};
const row={id:"my-kota",name:"My-Kota",location:"Katlego Street, Ivory Park",
 lat:ivory.lat,lng:ivory.lng,opening_time:"08:00",closing_time:"22:00",
 stored_is_active:true,effective_is_active:false,is_active:false,
 logo_url:"https://example.test/logo.png"};

test("server-confirmed closed My-Kota is still discoverable as a NON-orderable preview",()=>{
 const shops=nearbyClosedPickupShops([row],ivory);
 assert.equal(shops.length,1);
 assert.deepEqual(shops[0],{id:"my-kota",name:"My-Kota",logo:"https://example.test/logo.png",
  address:"Katlego Street, Ivory Park",distanceKm:0,description:"",category:"",rating:null,openingTime:"08:00",closingTime:"22:00"});
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

test("Closed previews render the ORIGINAL ShopCard in the normal grid with no ordering",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const card=readFileSync(new URL("../src/components/ShopCard.tsx",import.meta.url),"utf8");
 const grid=app.slice(app.indexOf("const renderedShopList = useMemo"),app.indexOf("}, [sortedShops, matchingClosedShops"));
 assert.match(grid,/className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3/);
 assert.match(grid,/<ShopCard[\s\S]*shop=\{shop\}/);
 assert.match(grid,/matchingClosedShops\.map\(preview=>\(/);
 assert.match(grid,/<ShopCard[\s\S]*shop=\{closedPickupCardData\(preview\)\}[\s\S]*readOnlyClosed/);
 assert.doesNotMatch(app,/Nearby shops are closed right now/);
 assert.match(card,/onClick=\{readOnlyClosed \? undefined :/);
 assert.match(card,/aria-label=\{readOnlyClosed \?/);
 assert.match(card,/status\.isOpen \? "Open Now" : "Closed"/);
 assert.match(card,/readOnlyClosed \? "Closed right now · Orders unavailable"/);
 assert.match(app,/customerPickupApi\.approvedShops\(\)/);
 assert.match(app,/readPickupCatalog\(userLocation\)/);
});

test("Read-only shop adaptation never creates a cart, a checkout price or an orderable shop",()=>{
 const preview=nearbyClosedPickupShops([row],ivory)[0];
 const shop=closedPickupCardData(preview);
 assert.equal(shop.id,"my-kota");
 assert.equal(shop.isOpen,false);
 assert.equal(shop.is_active,false);
 assert.deepEqual(shop.menu,[]);
 assert.deepEqual(shop.images,["https://example.test/logo.png"]);
 assert.equal(shop.distance,0);
 assert.equal(shop.opening_time,"08:00");
 assert.equal(shop.rating,0); // no invented rating or review counts
});

test("Closed previews obey Home category/search and Open Now filters",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.match(app,/selectedQuickFilter === "Open Now"/);
 assert.match(app,/closedPickupShops\.filter\(shop=>/);
 assert.match(app,/activeIds\.has\(shop\.id\)/);
 assert.match(app,/matchingClosedShops\.length === 0/);
});
