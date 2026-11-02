import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {discoverShopCoordinates,discoverShopDistance,discoverCategoryMatches,discoverSortShops} from "../src/services/discoverTrustPolicy.ts";
import {homeRating} from "../src/services/homeTrustPolicy.ts";

const base={id:"a",name:"Kota place",category:"Street Food",description:"Local meals",latitude:-25.983,longitude:28.207, rating:4.2,prepTime:"15-25 mins",distance:1,menu:[{id:"a1",name:"Kota Special",price:25,is_available:true}]};
const location={lat:-25.983,lng:28.207};
const shop=(extra={})=>({...base,...extra});
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const discover=app.slice(app.indexOf("function DiscoverScreen("),app.indexOf("function AddressPicker("));

test("Discover pins only authenticated catalog coordinates, never approximates a restaurant location",()=>{
 assert.deepEqual(discoverShopCoordinates(shop()),location);
 assert.equal(discoverShopCoordinates(shop({latitude:null})),null);
 assert.equal(discoverShopCoordinates(shop({latitude:NaN})),null);
 assert.equal(discoverShopCoordinates(shop({latitude:0,longitude:0})),null);
 assert.equal(discoverShopCoordinates(shop({longitude:180.5})),null);
 assert.doesNotMatch(discover,/hashString\(|picsum\.photos\/seed\/.*latitude/);
 assert.match(discover,/filter\(shop=>discoverShopCoordinates\(shop\)!==null\)/);
 assert.match(discover,/position=\{coordinates\}/);
});

test("Nearby and distance filters do not invent coordinates or distances",()=>{
 const distant=shop({latitude:-26.14,longitude:28.207,distance:0.5});
 assert.equal(discoverShopDistance(distant,location),Infinity);
 assert.equal(discoverShopDistance(shop({latitude:null,longitude:null,distance:1.6}),location),1.6);
 assert.equal(discoverShopDistance(shop({latitude:null,longitude:null,distance:8}),location),Infinity);
 assert.equal(discoverShopDistance(shop(),null),Infinity);
 assert.ok(discoverShopDistance(shop(),location)<=0.01);
 assert.match(discover,/selectedCategory==="Nearby" \|\| maxDistance!==null/);
 assert.match(discover,/Number\.isFinite\(distance\)/);
 assert.match(discover,/maxDistance===null \|\| distance<=maxDistance/);
});

test("Categories match actual category or existing available food menu, not promotional description",()=>{
 assert.equal(discoverCategoryMatches(shop(),"Kotas"),true);
 assert.equal(discoverCategoryMatches(shop({menu:[]}),"Kotas"),false);
 assert.equal(discoverCategoryMatches(shop({category:"Kota",menu:[]}),"Kotas"),true);
 assert.equal(discoverCategoryMatches(shop({category:"Burgers",menu:[]}),"Burger"),true);
 assert.equal(discoverCategoryMatches(shop({menu:[{name:"Kota",is_available:false}]}),"Kotas"),false);
 assert.equal(discoverCategoryMatches(shop({description:"Burgers are coming",menu:[]}),"Burgers"),false);
 assert.equal(discoverCategoryMatches(shop({menu:[{name:"Juice Drink",is_available:true}]}),"Drinks"),true);
});

test("Sort puts open eligible restaurants first, then actual distance/rating/preparation facts",()=>{
 const nearest=shop({id:"near",name:"Near",rating:3,latitude:-25.983,longitude:28.207,prepTime:"24 mins"});
 const far=shop({id:"far",name:"Far",rating:5,latitude:-25.99,longitude:28.207,prepTime:"8 mins"});
 const unknown=shop({id:"unknown",name:"Unknown",latitude:null,longitude:null,distance:null,rating:0,prepTime:"Fast"});
 const closed=shop({id:"closed",name:"Closed",rating:5,prepTime:"2 mins"});
 const all=[closed,unknown,far,nearest];
 const status=s=>s.id!=="closed";
 assert.deepEqual(discoverSortShops(all,"smart",location,status).map(x=>x.id),["near","far","unknown","closed"]);
 assert.deepEqual(discoverSortShops(all,"distance",location,status).map(x=>x.id),["near","far","unknown","closed"]);
 assert.deepEqual(discoverSortShops(all,"rating",location,status).map(x=>x.id),["far","near","unknown","closed"]);
 assert.deepEqual(discoverSortShops(all,"speed",location,status).map(x=>x.id),["far","near","unknown","closed"]);
 assert.deepEqual(all.map(x=>x.id),["closed","unknown","far","near"]); // input unchanged
 assert.equal(homeRating(unknown),null);
});

test("Discover preserves design, navigation and current pickup API source without fabricated promotions",()=>{
 assert.match(discover,/DISCOVER/);
 assert.match(discover,/Local Flavor/);
 assert.match(discover,/onSelectShop\(shop\.id\)/);
 assert.match(discover,/discoverSortShops\(/);
 assert.match(discover,/homePrepMinutes\(shop\)/);
 assert.match(discover,/homeRating\(shop\)/);
 assert.doesNotMatch(discover,/TrustBadge\s+shop=\{shop\}/);
 assert.doesNotMatch(discover,/Speed:\s*\{shop\.delivery_eta\s*\|\|/);
 assert.doesNotMatch(discover,/\bMost Popular\b|Fastest Delivery|Handpicked local favorites|top-rated Spaza|OTA menus/);
 assert.doesNotMatch(discover,/Math\.random\(\)|20-35 min|4\.8.*Verified|Connected to <strong>LocalEats Cloud Service/);
 assert.match(discover,/onClick=\{\(\)=>onSelectShop\(shop\.id\)\}/);
 assert.match(discover,/status\.nextOpeningTime \?/);
 assert.match(discover,/shop\.menu\.forEach/);
});
