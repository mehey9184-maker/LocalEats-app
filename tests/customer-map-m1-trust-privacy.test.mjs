import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mapShopCoordinates,mapShopDistance,mapVisibleShops,mapInitialCenter} from "../src/services/customerMapTrust.ts";

const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const screen=source.slice(source.indexOf("function ExploreScreen("));
const marker=readFileSync(new URL("../src/components/MapComponents.tsx",import.meta.url),"utf8");
const legend=readFileSync(new URL("../src/components/MapLegend.tsx",import.meta.url),"utf8");
const reorder=readFileSync(new URL("../src/components/QuickReorderWidget.tsx",import.meta.url),"utf8");
const point={lat:-25.983,lng:28.207};
const shop=(extra={})=>({id:"shopA",name:"Real shop",description:"Local meals",
 address:"Tembisa",category:"Kotas",rating:4.5,reviewCount:undefined,latitude:-25.983,
 longitude:28.207,isOpen:true,menu:[],...extra});
const nearby=shop({id:"near",name:"Near",latitude:-25.983});
const far=shop({id:"far",name:"Far",latitude:-25.992,rating:5});
const noGPS=shop({id:"noGPS",name:"No GPS",latitude:null,longitude:null,rating:0,distance:null});
const closed=shop({id:"closed",name:"Closed",latitude:-25.984});
const isOpen=s=>s.id!=="closed";

test("public map uses only actual restaurant coordinates, never fake pins",()=>{
 assert.deepEqual(mapShopCoordinates(nearby),point);
 assert.equal(mapShopCoordinates(noGPS),null);
 assert.equal(mapShopCoordinates(shop({latitude:0,longitude:0})),null);
 assert.equal(mapShopCoordinates(shop({latitude:NaN})),null);
 assert.equal(mapShopCoordinates(shop({longitude:200})),null);
 assert.equal(mapShopDistance(noGPS,point),Infinity);
 assert.ok(mapShopDistance(nearby,point)<0.01);
 assert.ok(mapShopDistance(far,point)>0.5);
 assert.match(screen,/mappedShops=sortedShops\.filter\(shop=>mapShopCoordinates\(shop\)!==null\)/);
 assert.match(screen,/\{mappedShops\s*\.filter/);
 assert.match(marker,/if\(typeof shop\.latitude!=="number" \|\| typeof shop\.longitude!=="number"/);
 assert.doesNotMatch(screen,/hashString\(|-25\.9964 \+ \(hashString/);
 assert.doesNotMatch(marker,/shop\.latitude \|\| -25\.9964|shop\.longitude \|\| 28\.2268/);
});

test("neutral viewport does not claim invented coordinates as a customer or restaurant",()=>{
 assert.deepEqual(mapInitialCenter(nearby,point,[far]),[-25.983,28.207]);
 assert.deepEqual(mapInitialCenter(noGPS,point,[nearby]),[-25.983,28.207]);
 assert.deepEqual(mapInitialCenter(undefined,null,[far]),[-25.992,28.207]);
 assert.deepEqual(mapInitialCenter(undefined,null,[noGPS]),[-25.9964,28.2268]);
 assert.match(screen,/No verified shop locations to display/);
 assert.match(screen,/View shops as a list/);
});

test("nearby, GPS radius and rating filters are real and tenant-neutral",()=>{
 const defaultFilter={query:"",category:"All",favorites:[],minRating:0,onlyOpen:false,
  maxDistance:null,location:point,sort:"distance",isOpen};
 const sorted=mapVisibleShops([noGPS,closed,far,nearby],defaultFilter);
 assert.deepEqual(sorted.map(s=>s.id),["near","far","noGPS","closed"]);
 const inRange=mapVisibleShops([noGPS,closed,far,nearby],{...defaultFilter,maxDistance:0.5});
 assert.deepEqual(inRange.map(s=>s.id),["near","closed"]);
 const nearbyMode=mapVisibleShops([noGPS,far,nearby],{...defaultFilter,category:"Nearby"});
 assert.deepEqual(nearbyMode.map(s=>s.id),["near","far"]);
 assert.deepEqual(mapVisibleShops([nearby],{...defaultFilter,location:null,category:"Nearby"}),[]);
 assert.deepEqual(mapVisibleShops([noGPS,nearby],{...defaultFilter,minRating:4}),[nearby]);
 assert.deepEqual(mapVisibleShops([noGPS,nearby],{...defaultFilter,query:"kotas"}),[nearby,noGPS].filter(s=>s.category==="Kotas").sort((a,b)=>a.id==="near"?-1:1));
 assert.deepEqual(mapVisibleShops([far,nearby],{...defaultFilter,sort:"name"}).map(s=>s.id),["far","near"]);
});

test("Map never reads all riders, their phone numbers or draws their live GPS publicly",()=>{
 assert.doesNotMatch(screen,/\.from\(["']rider_profiles["']\)|explore-map-riders-realtime/);
 assert.doesNotMatch(screen,/activeProximityRiders|realRiders|MemoizedRiderMarker/);
 assert.match(screen,/showRiders=\{false\}/);
 assert.match(legend,/showRiders=false/);
 assert.match(legend,/filter\(item=>showRiders \|\| item\.id!=="rider"\)/);
 assert.match(screen,/onSelectFilter=\{\(filter\)=>\{if\(filter!=="rider"\)/);
});

test("map shop/social proof and checkout safety use real facts, not historical prices",()=>{
 assert.doesNotMatch(screen,/120\+ reviews|shop\.reviewCount \|\| 0|shop\.rating\.toFixed\(1\)|activeShop\.rating/);
 assert.match(screen,/homeRating\(shop\)/);
 assert.match(screen,/homeReviewCount\(shop\)/);
 assert.match(screen,/homeRating\(activeShop\)/);
 assert.match(screen,/Number\.isFinite\(mapShopDistance\(activeShop,userLocation\)\)/);
 assert.match(screen,/showQuickReorder=\{false\}/);
 assert.match(screen,/orders=\{\[\]\}/);
 assert.doesNotMatch(screen,/addToCart\(/);
 assert.match(reorder,/showQuickReorder && topFrequentItems\.length > 0/);
 assert.match(screen,/<span>View Menu<\/span>/);
 assert.match(screen,/disabled=\{!hasMapPin\}/);
 assert.match(source,/readPickupCatalog\(userLocation\)/);
});
