import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {discoverMatchesShopOrFood,discoverFoodSuggestions,discoverFoodPreviews,discoverAvailableMenuItems} from "../src/services/discoverFoodSearch.ts";
const point={lat:-25.983,lng:28.207};
const item=(id,name,extra={})=>({id,name,price:25,displayPrice:"R25",image:"https://example.org/food.jpg",is_available:true,...extra});
const shop=(id,name,lat,extra={})=>({
 id,name,description:"Local food",category:"Takeaways",latitude:lat,longitude:28.207,
 menu:[item(id+"i",id+" Kota Special",{description:"With chips"})],rating:0,prepTime:"",
 ...extra,
});
const near=shop("near","Near shop",-25.983);
const far=shop("far","Far shop",-25.993);
const closed=shop("closed","Closed shop",-25.9835);
const status=s=>s.id!=="closed";
const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const discover=source.slice(source.indexOf("function DiscoverScreen("),source.indexOf("function AddressPicker("));

test("food-name and description searches find real, available menu items",()=>{
 assert.equal(discoverMatchesShopOrFood(near,"kota"),true);
 assert.equal(discoverMatchesShopOrFood(near,"KOTA special"),true);
 assert.equal(discoverMatchesShopOrFood(near,"chips"),true);
 assert.equal(discoverMatchesShopOrFood(near,"near shop"),true);
 assert.equal(discoverMatchesShopOrFood(near,"pizza"),false);
 assert.equal(discoverMatchesShopOrFood(shop("s","Store",-25.983,{menu:[item("a","Kota",{is_available:false})]}),"kota"),false);
 assert.equal(discoverMatchesShopOrFood(shop("s","Store",-25.983,{menu:[item("a","Kota",{price:NaN})]}),"kota"),false);
 assert.equal(discoverMatchesShopOrFood(shop("s","Store",-25.983,{menu:[item("a","Kota",{price:-1})]}),"kota"),false);
 assert.equal(discoverMatchesShopOrFood(shop("s","Store",-25.983,{menu:[item("a","Kota",{id:""})]}),"kota"),false);
 assert.equal(discoverMatchesShopOrFood(shop("s","Store",-25.983,{menu:[]}),""),true);
});

test("suggestions contain real available food, preserve source shop names and never fabricate prices",()=>{
 const data=[near,shop("bad","Bad",-25.983,{menu:[item("a","Unavailable Kota",{is_available:false})]}),far];
 const hints=discoverFoodSuggestions(data,"kota",6);
 assert.ok(hints.length>0);
 assert.equal(hints[0].kind,"food");
 assert.equal(hints[0].shopName,"Near shop");
 assert.equal(hints[0].query,"near Kota Special");
 assert.equal(hints.some(s=>s.label==="Unavailable Kota"),false);
 assert.deepEqual(discoverFoodSuggestions(data,"k",6),[]);
 assert.deepEqual(discoverFoodSuggestions(data,"kota",0),[]);
 assert.equal(discoverFoodSuggestions([near],"near",6).some(s=>s.kind==="shop"),true);
});

test("nearby menu carousel uses only actual catalog images, diverse shops and verified distances",()=>{
 const many=shop("many","Many",-25.983,{menu:[item("i1","First"),item("i2","Second"),item("i3","Third")]});
 const p=discoverFoodPreviews([far,many,closed],"",point,status,5);
 assert.deepEqual(p.map(x=>x.shopId),["many","far","closed","many","many"]);
 assert.equal(p[0].price,25);
 assert.ok(p[0].distance<0.1);
 assert.equal(p[2].open,false);
 assert.deepEqual(discoverFoodPreviews([shop("x","X",-25.983,{menu:[item("a","Broken",{image:"javascript:alert(1)"})]})],"",point,status,8),[]);
 assert.equal(many.menu.length,3); // no source mutation
});

test("search previews include real items with no photos and exclude missing/invalid prices",()=>{
 const q=shop("k","Kota kitchen",-25.983,{
  menu:[item("good","Kota with chips",{price:35,image:""}),
        item("bad","Kota Deluxe",{price:Infinity}),
        item("gone","Kota old",{is_available:false})]
 });
 const previews=discoverFoodPreviews([q],"kota",point,()=>true,8);
 assert.deepEqual(previews.map(x=>x.itemName),["Kota with chips"]);
 assert.equal(previews[0].image,null);
 assert.equal(previews[0].price,35);
 assert.equal(discoverAvailableMenuItems(q).length,1);
 assert.deepEqual(discoverFoodPreviews([q],"sushi",point,()=>true,8),[]);
});

test("D3 adds food results without bypassing menu/cart, and preserves D1-D2 UI",()=>{
 assert.match(discover,/discoverMatchesShopOrFood\(shop,debouncedSearchQuery\)/);
 assert.match(discover,/discoverFoodSuggestions\(shops,debouncedSearchQuery,6\)/);
 assert.match(discover,/discoverFoodPreviews\(sortedShops,debouncedSearchQuery,userLocation/);
 assert.match(discover,/Food matching your search/);
 assert.match(discover,/onClick=\{\(\)=>onSelectShop\(feed\.shopId\)\}/);
 assert.match(discover,/R\{feed\.price\.toFixed\(2\)\}/);
 assert.match(discover,/feed\.image \?/);
 assert.match(discover,/nearbyShops\.map\(/);
 assert.match(discover,/Number\.isFinite\(discoverShopDistance\(shop,userLocation\)\)/);
 assert.match(discover,/!loadingShops && filteredShops\.length === 0/);
 assert.match(discover,/No matching shops or food/);
 assert.match(discover,/No verified shop map pins yet/);
 assert.match(discover,/id="discover-extra-filters"/);
 assert.match(discover,/id="discover-search-input"/);
 assert.doesNotMatch(discover,/setCart\(|createOrder\(|orderCheckout\(|Math\.random\(\)/);
 assert.match(source,/readPickupCatalog\(userLocation\)/);
});
