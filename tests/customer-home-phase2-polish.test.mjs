import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeSearchMatches,homeSearchSuggestions,homePrepMinutes,homeFastestShopIds,homeHasHalalOptions } from "../src/services/homeDiscoveryPolicy.ts";

const makeShop=(id,name,extra={})=>({
 id,name,description:"Local food",category:"Kota",cuisine_type:"South African",
 rating:0,reviewCount:0,address:"Ivory Park",logo:"",menu:[],is_active:true,isOpen:true,...extra,
});
const closed={id:"closed-kota",name:"My-Kota",description:"Local kota",category:"Kota",
 address:"Ivory Park",logo:"",distanceKm:1.5,rating:null,openingTime:null,closingTime:null};

test("Search suggestions include approved closed menus, with stable shop IDs and no duplicate card",()=>{
 const open=makeShop("open-kota","Kota & More");
 const result=homeSearchSuggestions([open],[closed],"KOTA");
 assert.deepEqual(result,[
  {id:"open-kota",name:"Kota & More",closed:false},
  {id:"closed-kota",name:"My-Kota",closed:true},
 ]);
 assert.deepEqual(homeSearchSuggestions([open],[{...closed,id:"open-kota"}],"kota"),
  [{id:"open-kota",name:"Kota & More",closed:false}]);
 assert.deepEqual(homeSearchSuggestions([open],[closed],"K"),[]);
 assert.deepEqual(homeSearchSuggestions([open],[closed],"kota",1),
  [{id:"open-kota",name:"Kota & More",closed:false}]);
});
test("Search and catalog filters match categories and multiword queries consistently",()=>{
 const shop=makeShop("s1","My Kota", {description:"Fresh charcoal braai"});
 assert.equal(homeSearchMatches(shop,"KOTA charcoal"),true);
 assert.equal(homeSearchMatches(shop,"BRAAI"),true);
 assert.equal(homeSearchMatches(shop,"Kota sushi"),false);
 assert.equal(homeSearchMatches(shop,"  "),true);
});
test("Fastest uses only real parseable preparation times, not hard-coded ranges",()=>{
 assert.equal(homePrepMinutes(makeShop("a","A",{prepTime:"8-12 min"})),8);
 assert.equal(homePrepMinutes(makeShop("a","A",{prepTime:"30 minutes"})),30);
 assert.equal(homePrepMinutes(makeShop("a","A",{prepTime:"20–35 mins"})),20);
 for(const bad of [undefined,"", "fast", "up to 10 minutes", "0-10 min","40-20 min","10-999 min","12 km"]){
  assert.equal(homePrepMinutes(makeShop("s","S",{prepTime:bad})),null);
 }
 const ids=homeFastestShopIds([
  makeShop("s1","First",{prepTime:"20-30 min"}),
  makeShop("s2","Second",{prepTime:"8-12 min"}),
  makeShop("s3","Third",{prepTime:"8 min"}),
  makeShop("s4","Fourth",{prepTime:"tomorrow"}),
 ]);
 assert.deepEqual([...ids],["s2","s3"]);
 assert.equal(homeFastestShopIds([makeShop("none","None")]).size,0);
});
test("Halal options require explicit item tags, not keywords in descriptions",()=>{
 assert.equal(homeHasHalalOptions(makeShop("s","Halal shop",
  {description:"100% halal",menu:[]})),false);
 assert.equal(homeHasHalalOptions(makeShop("s","S",
  {menu:[{id:"i",name:"Food",price:20,is_available:true,dietary_tags:["Halal"]}]})),true);
 assert.equal(homeHasHalalOptions(makeShop("s","S",
  {menu:[{id:"i",name:"Food",price:20,is_available:true,dietary_tags:["Halaal"]}]})),true);
 assert.equal(homeHasHalalOptions(makeShop("s","S",
  {menu:[{id:"i",name:"Food",price:20,is_available:false,dietary_tags:["Halal"]}]})),false);
});
test("Only the existing Home is changed: no fake speed match or keyword halal status",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const home=app.slice(app.indexOf("function HomeScreen("),app.indexOf("const parseCardDetailsFromInstructions"));
 assert.match(home,/homeSearchSuggestions\(shops, closedPickupShops, debouncedSearchQuery\)/);
 assert.match(home,/onStoreInfo\(suggestion.id\)/);
 assert.match(home,/suggestion.closed/);
 assert.match(home,/homeFastestShopIds\(shops.filter/);
 assert.match(home,/homeHasHalalOptions\(shop\)/);
 assert.doesNotMatch(home,/shop.prepTime === "15-20 min"/);
 assert.doesNotMatch(home,/shopText.includes\("halal"\)/);
 assert.match(home,/aria-pressed=\{isSelected\}/);
 assert.match(home,/aria-controls="home-search-suggestions"/);
 assert.match(home,/e\.key === "Escape"/);
 const card=readFileSync(new URL("../src/components/ShopCard.tsx",import.meta.url),"utf8");
 assert.match(card,/role="button"/);
 assert.match(card,/tabIndex=\{0\}/);
 assert.match(card,/event.key === "Enter" \|\| event.key === " "/);
});
