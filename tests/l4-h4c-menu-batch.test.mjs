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
