import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mapPickupShop,isWithinPickupArea,isOutsidePickupArea,requireRealLocation} from "../src/services/pickupMapping.ts";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const item={id:"menu-1",name:"Real Kota",price:25,is_available:true};
const raw={id:"shop-1",name:"My Kota",is_active:true,lat:-26.01,lng:28.19,location:"Ivory Park"};

test("public shop with unknown customer GPS is real browsable menu but cannot order",()=>{
 const browse=mapPickupShop({...raw,distance_km:undefined},[item]);
 assert.equal(browse.name,"My Kota");
 assert.equal(browse.distance,undefined);
 assert.equal(browse.menu[0].name,"Real Kota");
 assert.equal(browse.menu[0].price,25);
 assert.equal(isWithinPickupArea(browse),false);
 assert.equal(isOutsidePickupArea(browse),false,"Never fabricate a distant label");
 assert.throws(()=>requireRealLocation(null),/real location/);
 for(const bad of [{lat:Infinity,lng:28},{lat:100,lng:28},{lat:NaN,lng:28}])
  assert.throws(()=>requireRealLocation(bad),/real location/);
});

test("no GPS discovery requests public approved shops and their true menus without pseudo coordinates",()=>{
 const service=source("src/services/customerPickup.ts");
 assert.match(service,/export async function readPublicBrowseCatalog\(\)/);
 assert.match(service,/customerPickupApi\.approvedShops\(\)/);
 assert.match(service,/customerPickupApi\.menu\(raw\.id\)/);
 assert.match(service,/distance_km:undefined/);
 assert.match(service,/mapPickupShop\(\{\.\.\.raw,distance_km:undefined\}/);
 assert.match(service,/const intent=pickupCartIntent\(cart,requireRealLocation\(location\)/);
 assert.match(service,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
});

test("real device catalog and GPS-less catalog cannot reuse each other's distance cache",()=>{
 const app=source("src/App.tsx");
 assert.match(app,/currentCatalogKey=userLocation \? nearbyCatalogKey\(userLocation\) : "browse-only:no-gps"/);
 assert.match(app,/currentCatalogKey===displayedCatalogKeyRef\.current/);
 assert.match(app,/const result=!userLocation\s*\? await readPublicBrowseCatalog\(\)/);
 assert.match(app,/if\(userLocation && key && !result\.incomplete/);
 assert.match(app,/const noGps=sortedShops\.filter\(shop=>!isWithinPickupArea\(shop\) && !isOutsidePickupArea\(shop\)\)/);
 assert.match(app,/Browse shops — location needed to order/);
 assert.match(app,/No ordering without a verified location\.|No order can be placed until then/);
 assert.match(app,/setUserLocation\(null\);\s*setLoadingShops\(false\);\s*setFetchError\(error\.code/);
 assert.match(app,/const targetShop=visibleShops\.find\(s=>s\.id===shopId\)/);
 assert.match(app,/!isWithinPickupArea\(targetShop\)/);
 assert.doesNotMatch(app,/setUserLocation\(\{lat:-26\.009012/);
});

test("all browse-only cards honestly distinguish unknown GPS from proven outside 4 km",()=>{
 const card=source("src/components/ShopCard.tsx"), app=source("src/App.tsx");
 assert.match(card,/const locationUnknown = shop\.distance === undefined/);
 assert.match(card,/const browseOnly = outsidePickupArea \|\| locationUnknown/);
 assert.match(card,/locationUnknown \? "Location needed" : status\.isOpen/);
 assert.match(card,/locationUnknown \|\| !status\.isOpen/);
 assert.match(card,/if \(locationUnknown\) \{\s*showAlert\("Location needed"/);
 assert.match(card,/Location needed to order/);
 assert.match(app,/const browseOnly=outsidePickupArea \|\| locationUnknown/);
 assert.match(app,/\{locationUnknown \? "Location needed to order" : "Outside your pickup area"\}/);
 assert.match(app,/if \(!isWithinPickupArea\(shop\)\) \{\s*showAlert\(/);
});

test("unlocated shops are not mistaken for broken menu requests or active merchants",()=>{
 const service=source("src/services/customerPickup.ts");
 const app=source("src/App.tsx");
 assert.match(service,/const locatedShops=listing\.shops\.filter\(raw=>/);
 assert.match(service,/const lat=raw\.lat \?\? raw\.latitude,lng=raw\.lng \?\? raw\.longitude/);
 assert.match(service,/typeof lat==="number" && Number\.isFinite\(lat\)/);
 assert.match(service,/typeof lng==="number" && Number\.isFinite\(lng\)/);
 assert.match(service,/const menus=await Promise\.all\(locatedShops\.map\(async raw=>/);
 assert.match(app,/\{sortedShops\.length\} \{sortedShops\.length === 1 \? "shop" : "shops"\} listed/);
 assert.doesNotMatch(app,/\{sortedShops\.length\} Online/);
 // A shop with no real GPS remains unmappable, even when its menu endpoint returns 200.
 assert.throws(()=>mapPickupShop({...raw,lat:null,lng:null,latitude:null,longitude:null,distance_km:undefined},[]),/real location/);
});
