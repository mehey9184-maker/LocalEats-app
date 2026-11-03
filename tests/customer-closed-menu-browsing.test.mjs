import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPickupApi} from "../src/pickup/client.ts";

test("closed My-Kota real menu is read from a public API GET with no authentication or mutation",async()=>{
 const calls=[];
 const transport=async(url,opts)=>{
  calls.push({url,method:opts.method,authorization:opts.headers?.Authorization});
  return new Response(JSON.stringify({success:true,menu_items:[
   {id:"item-01",name:"cheeze, palone and meat",price:25,is_available:true,image_url:"https://example.test/item.jpg"}
  ]}),{status:200,headers:{"Content-Type":"application/json"}});
 };
 const api=createPickupApi("https://api.example.test",async()=>{throw Error("Public menu must not read user token");},transport);
 const response=await api.menu("shop-my-kota-ivory-park");
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,"https://api.example.test/api/v1/catalog/shops/shop-my-kota-ivory-park/menu");
 assert.equal(calls[0].method,"GET");
 assert.equal(calls[0].authorization,undefined);
 assert.equal(response.menu_items?.length,1);
 assert.equal(response.menu_items[0].price,25);
});

test("closed shop card opens original detail screen but never becomes an orderable catalog entry",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const card=readFileSync(new URL("../src/components/ShopCard.tsx",import.meta.url),"utf8");
 assert.match(card,/onClick=\{\(\) => \{/);
 assert.match(card,/onStoreInfo\(shop.id\)/);
 assert.match(app,/closedPickupShops\.some\(s=>String\(s.id\)===String\(selectedStoreId\)\)/);
 assert.match(app,/shop=\{(?:visibleShops|displayShops)\.find\([\s\S]*?\?\? closedPickupCardData\(/);
 assert.match(app,/readOnlyClosed=\{!(?:visibleShops|displayShops)\.some\(/);
 assert.match(app,/const response = await customerPickupApi\.menu\(shop.id\)/);
 assert.match(app,/is_available:false, \/\/ Read only/);
 assert.match(app,/if \(readOnlyClosed\) return apiMenu \?\? \[\];/);
 assert.match(app,/onSelect=\{readOnlyClosed \? undefined :/);
 assert.match(app,/isOpen=\{!readOnlyClosed && !!selectedItemForQuantity\}/);
 assert.match(app,/if \(readOnlyClosed\) return;/);
 assert.match(app,/Closed right now · You can browse the real menu, but ordering is unavailable/);
 assert.doesNotMatch(app,/setShops\(.*closedPickupCardData/);
});

test("closed-shop menu is not replaced by synthetic fallback dishes or checkout prices",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const section=app.slice(app.indexOf("function StoreInfoScreen("),app.indexOf("function StoreInfoScreen(")+14000);
 assert.match(section,/if \(readOnlyClosed\) return apiMenu \?\? \[\];/);
 assert.match(section,/setClosedMenuError\("The shop's menu couldn't load/);
 assert.match(section,/Number\.isFinite\(price\) \|\| price < 0/);
 assert.match(section,/is_available:false/);
});
