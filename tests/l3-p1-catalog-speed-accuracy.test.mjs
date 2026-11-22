import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPublicBrowseCatalogReader,PUBLIC_BROWSE_PARALLEL_MENUS} from "../src/services/publicBrowseCatalog.ts";
import {mapPickupShop,isWithinPickupArea} from "../src/services/pickupMapping.ts";

const shop=(id)=>({id,name:"Kitchen "+id,is_active:true,lat:-26.01,lng:28.19,location:"Ivory Park"});
const item={id:"kota-25",name:"Kota",price:25,is_available:true};
const source=(ids,menu)=>({shops:async()=>({shops:ids.map(shop)}),menu});

test("GPS-free Home can show a validated public menu before slower shops finish",async()=>{
 let releaseSlow=()=>{};
 const slow=new Promise(resolve=>{releaseSlow=resolve;});
 let firstShown=()=>{};
 const first=new Promise(resolve=>{firstShown=resolve;});
 const reader=createPublicBrowseCatalogReader(source(["quick","slow"],async(id)=>{
  if(id==="slow")await slow;
  return {menu_items:[item]};
 }),mapPickupShop);
 const running=reader({onProgress:firstShown});
 const partial=await first;
 assert.equal(partial.shops.length,1);
 assert.equal(partial.shops[0].id,"quick");
 assert.equal(partial.incomplete,true);
 assert.equal(partial.shops[0].distance,undefined);
 assert.equal(isWithinPickupArea(partial.shops[0]),false);
 releaseSlow();
 const result=await running;
 assert.deepEqual(result.shops.map(s=>s.id),["quick","slow"]);
 assert.equal(result.incomplete,false);
 assert.deepEqual(result.shops[0].menu.map(m=>m.price),[25]);
});

test("network fan-out stays bounded without losing source shop order",async()=>{
 assert.equal(PUBLIC_BROWSE_PARALLEL_MENUS,6);
 let active=0,highWater=0,reads=0;
 const ids=Array.from({length:21},(_,i)=>"s"+i);
 const reader=createPublicBrowseCatalogReader(source(ids,async()=>{
  active++;highWater=Math.max(highWater,active);reads++;
  await new Promise(resolve=>setTimeout(resolve,2));
  active--;
  return {menu_items:[item]};
 }),mapPickupShop);
 const result=await reader();
 assert.equal(result.shops.length,21);
 assert.equal(reads,21);
 assert.ok(highWater<=PUBLIC_BROWSE_PARALLEL_MENUS);
 assert.ok(highWater>=2);
 assert.deepEqual(result.shops.map(s=>s.id),ids);
 assert.equal(result.incomplete,false);
});

test("a timed-out menu is omitted, never replaced by a fabricated item or cached",async()=>{
 let aborted=false;
 const reader=createPublicBrowseCatalogReader(source(["valid","stalled"],async(id,signal)=>{
  if(id==="stalled"){
   signal.addEventListener("abort",()=>{aborted=true;},{once:true});
   return new Promise(()=>{});
  }
  return {menu_items:[item]};
 }),mapPickupShop,{parallelMenus:2,menuTimeoutMs:20});
 const result=await reader();
 assert.equal(result.incomplete,true);
 assert.deepEqual(result.shops.map(s=>s.id),["valid"]);
 assert.equal(result.shops[0].menu[0].name,"Kota");
 assert.equal(aborted,true);
});

test("unknown or invalid menus never become valid cards, and an empty public catalog stays empty",async()=>{
 const empty=createPublicBrowseCatalogReader(source([],async()=>({menu_items:[]})),mapPickupShop);
 assert.deepEqual(await empty(),{shops:[],incomplete:false});
 const rejected=createPublicBrowseCatalogReader(source(["wrong"],async()=>({menu_items:[{id:"bad",name:"Bad",price:-25,is_available:true}]})),mapPickupShop);
 await assert.rejects(()=>rejected(),/could not be loaded/);
 const invalid=createPublicBrowseCatalogReader({shops:async()=>({shops:null}),menu:async()=>({menu_items:[item]})},mapPickupShop);
 await assert.rejects(()=>invalid(),/unavailable/);
});

test("image requests are sized for their display slots without changing original cards",()=>{
 const photo=readFileSync("src/components/BlurUpImage.tsx","utf8");
 const card=readFileSync("src/components/ShopCard.tsx","utf8");
 const cart=readFileSync("src/components/CartDrawer.tsx","utf8");
 const checkout=readFileSync("src/screens/CheckoutScreen.tsx","utf8");
 const app=readFileSync("src/App.tsx","utf8");
 assert.match(photo,/imageWidth\?: 160 \| 320 \| 600/);
 assert.match(photo,/imageWidth = 600/);
 assert.match(photo,/w=\$\{imageWidth\}/);
 assert.match(card,/imageWidth=\{160\}/);
 assert.match(cart,/imageWidth=\{160\}/);
 assert.match(checkout,/imageWidth=\{160\}/);
 assert.match(app,/readPublicBrowseCatalogProgressive/);
 assert.match(app,/if\(generation!==catalogGeneration\.current\)return/);
 assert.match(app,/setLoadingShops\(false\)/);
});

test("the old synthetic shop loader is not imported by the active Customer app",()=>{
 const app=readFileSync("src/App.tsx","utf8");
 const legacy=readFileSync("src/hooks/useShopsData.ts","utf8");
 assert.doesNotMatch(app,/from [\"'].*hooks\/useShopsData/);
 assert.match(legacy,/DEFAULT_FALLBACK_SHOPS/);
});
