import test from "node:test";
import assert from "node:assert/strict";
import {createPickupApi} from "../src/pickup/client.ts";

const ids=["a","b","c","d"];
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const fixture=(mode="valid")=>{
 const paths=[];let tokens=0;
 const transport=async(url,options)=>{
  const u=new URL(url);paths.push(u.pathname);
  assert.equal(options.method,"GET");assert.equal(options.cache,"no-store");
  assert.equal(options.headers.Authorization,undefined);
  if(u.pathname.endsWith("/shops"))return response({success:true,shops:ids.map(id=>({id}))});
  if(u.pathname.endsWith("/menus")){
   if(mode==="old")return response({success:false},404);
   if(mode==="rate")return response({success:false,code:"RATE_LIMITED"},429);
   if(mode==="oversized")return response({success:false,code:"MENU_BATCH_TOO_LARGE"},413);
   const requested=u.searchParams.get("ids").split(",");
   assert.ok(requested.length<=6);
   return response({success:true,menus:requested.filter(id=>mode!=="missing"||id!=="d").map(id=>({shop_id:id,menu_items:[{id:"m-"+id,shop_id:mode==="bad"?"foreign":id,price:25}]}))});
  }
  const id=u.pathname.split("/").at(-2);
  return response({success:true,menu_items:[{id:"m-"+id,shop_id:id,price:25}]});
 };
 return {api:createPickupApi("https://fixture.invalid",async()=>{tokens++;throw Error("public read used token");},transport,{batchCatalogMenus:true}),paths,tokens:()=>tokens};
};

test("H4C four-shop listing + concurrent menus uses two GETs instead of five",async()=>{
 const f=fixture();const listing=await f.api.approvedShops();
 const menus=await Promise.all(listing.shops.map(s=>f.api.menu(s.id)));
 assert.deepEqual(menus.map(m=>m.menu_items[0].shop_id),ids);
 assert.equal(f.paths.length,2);assert.equal(f.tokens(),0);
 console.log("H4C_HTTP_MEASURE baseline=5 candidate="+f.paths.length+" shops=4");
});
test("H4C batch sizes are bounded to six",async()=>{
 const f=fixture();await Promise.all(Array.from({length:12},(_,i)=>f.api.menu("shop-"+i)));
 assert.equal(f.paths.length,2);
});
test("H4C compatibility fallback is restricted to older or oversized APIs",async()=>{
 for(const mode of ["old","oversized"]){const f=fixture(mode);await Promise.all(ids.map(id=>f.api.menu(id)));assert.equal(f.paths.length,5);}
 for(const mode of ["rate","bad"]){const f=fixture(mode);const result=await Promise.allSettled(ids.map(id=>f.api.menu(id)));assert.ok(result.every(r=>r.status==="rejected"));assert.equal(f.paths.length,1);}
});
test("H4C missing shop fails only its own menu and does not invent empty menu",async()=>{
 const f=fixture("missing");const result=await Promise.allSettled(ids.map(id=>f.api.menu(id)));
 assert.deepEqual(result.map(r=>r.status),["fulfilled","fulfilled","fulfilled","rejected"]);assert.equal(f.paths.length,1);
});
test("H4C aborting one caller does not abort another consumer's verified menu",async()=>{
 const f=fixture();const controller=new AbortController();
 const first=f.api.menu("a",controller.signal);const second=f.api.menu("b");controller.abort();
 const result=await Promise.allSettled([first,second]);
 assert.equal(result[0].status,"rejected");assert.equal(result[1].status,"fulfilled");
 assert.equal(result[1].value.menu_items[0].shop_id,"b");
});

import {createPublicBrowseCatalogReader} from "../src/services/publicBrowseCatalog.ts";
import {createNearbyCatalogReader} from "../src/services/nearbyCatalogCache.ts";
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test("H4C active readers retain first-card progress and satisfy three-request pilot target",async()=>{
 for(const mode of ["public","gps"]){
  for(const variant of ["baseline","all-batch","priority-batch"]){
   const paths=[];let firstMs,completeMs,firstId;const start=performance.now();
   const transport=async(url,options)=>{
    const u=new URL(url);paths.push(u.pathname);
    assert.equal(options.headers.Authorization,undefined);
    if(u.pathname.endsWith("/shops"))return response({success:true,shops:ids.map(id=>({id,is_active:true,distance_km:0}))});
    if(u.pathname.endsWith("/menus")){
     await delay(250);
     return response({success:true,menus:u.searchParams.get("ids").split(",").map(id=>({shop_id:id,menu_items:[{id:"m-"+id,shop_id:id,price:25}]}))});
    }
    const id=u.pathname.split("/").at(-2);
    await delay(id==="a"?15:250);
    return response({success:true,menu_items:[{id:"m-"+id,shop_id:id,price:25}]});
   };
   const api=createPickupApi("https://fixture.invalid",async()=>{throw Error("public token");},transport,{batchCatalogMenus:variant!=="baseline"});
   const source={shops:()=>api.approvedShops(),menu:api.menu,...(variant==="priority-batch"?{priorityMenu:api.priorityMenu}:{})};
   const map=(shop,menu)=>({...shop,menu});
   const onProgress=partial=>{if(firstMs===undefined){firstMs=performance.now()-start;firstId=partial.shops[0].id;}};
   const read=mode==="public"?createPublicBrowseCatalogReader(source,map):createNearbyCatalogReader(source,map);
   const result=mode==="public"?await read({onProgress}):await read({lat:-25.98,lng:28.2},{onProgress});
   completeMs=performance.now()-start;
   assert.equal(result.incomplete,false);assert.deepEqual(result.shops.map(s=>s.id),ids);
   assert.equal(paths.length,variant==="baseline"?5:variant==="all-batch"?2:3);
   assert.ok(Number.isFinite(firstMs));assert.equal(firstId,"a");
   if(variant==="priority-batch")assert.ok(completeMs-firstMs>=150,"first verified shop must not wait for deliberately slower batch");
   if(variant==="all-batch")assert.ok(completeMs-firstMs<100,"all-batch first card waits for grouped response");
   console.log("H4C_FIRST_CARD "+JSON.stringify({mode,variant,requests:paths.length,first_ms:Math.round(firstMs),complete_ms:Math.round(completeMs)}));
  }
 }
});
