import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createNearbyCatalogReader,nearbyCatalogKey,NEARBY_CATALOG_TTL_MS} from "../src/services/nearbyCatalogCache.ts";

const point={lat:-25.98,lng:28.2};
const shop={id:"shop-1",name:"My Kota",is_active:true,distance_km:2,lat:-25.98,lng:28.2};
const item={id:"item-1",name:"Kota",price:25,is_available:true};

function fixture(clock={now:1000}) {
  let catalogs=0,menus=0;
  const source={
    shops:async p=>{catalogs++;return {shops:[{...shop,point:p}]};},
    menu:async id=>{menus++;assert.equal(id,shop.id);return {menu_items:[item]};},
  };
  const map=(s,items)=>{
    if(s.is_active!==true || s.distance_km>4 || s.distance_km<0 || !Number.isFinite(s.distance_km))
      throw Error("Not a valid shop in 4 km");
    return {...s,isOpen:true,menu:items.filter(m=>m.is_available)};
  };
  return {reader:createNearbyCatalogReader(source,map,()=>clock.now),
    counts:()=>({catalogs,menus}),source,map,clock};
}

test("reuse verified nearby shop and menu data for at most 15 seconds",async()=>{
  const f=fixture();
  const original=await f.reader(point);
  assert.equal(original.shops[0].menu[0].price,25);
  const hit=await f.reader(point);
  assert.strictEqual(hit,original);
  assert.deepEqual(f.counts(),{catalogs:1,menus:1});
  f.clock.now+=NEARBY_CATALOG_TTL_MS-1;
  assert.strictEqual(await f.reader(point),original);
  f.clock.now++;
  const refreshed=await f.reader(point);
  assert.notStrictEqual(refreshed,original);
  assert.deepEqual(f.counts(),{catalogs:2,menus:2});
});

test("location changes never inherit previous 4 km or menu results",async()=>{
  const f=fixture();
  assert.equal(nearbyCatalogKey(point),"-25.98:28.2");
  await f.reader(point);
  await f.reader({lat:point.lat+0.00001,lng:point.lng});
  assert.deepEqual(f.counts(),{catalogs:2,menus:2});
  for(const invalid of [null,{lat:NaN,lng:28.2},{lat:100,lng:28.2},{lat:point.lat,lng:Infinity}]) {
    assert.equal(nearbyCatalogKey(invalid),null);
    await assert.rejects(()=>f.reader(invalid),/real location/);
  }
  assert.deepEqual(f.counts(),{catalogs:2,menus:2});
});

test("explicit refresh bypasses fresh TTL and rejects obsolete availability",async()=>{
  const f=fixture();
  await f.reader(point);
  await f.reader(point,{force:true});
  assert.deepEqual(f.counts(),{catalogs:2,menus:2});
  const reader=createNearbyCatalogReader({
    shops:async()=>({shops:[{...shop,distance_km:4.1}]}),
    menu:async()=>({menu_items:[item]}),
  },f.map);
  await assert.rejects(()=>reader(point),/4 km/);
});

test("same-location concurrent refreshes share one request",async()=>{
  let calls=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  const reader=createNearbyCatalogReader({
    shops:async()=>{calls++;await gate;return {shops:[shop]};},
    menu:async()=>({menu_items:[]}),
  },(s,menu)=>({...s,menu}));
  const first=reader(point),second=reader(point);
  release();
  const [a,b]=await Promise.all([first,second]);
  assert.strictEqual(a,b);
  assert.equal(calls,1);
});

test("failed or invalid live reads do not become verified cache hits",async()=>{
  let attempts=0;
  const reader=createNearbyCatalogReader({
    shops:async()=>{attempts++;if(attempts===1)throw Error("offline");return {shops:[shop]};},
    menu:async()=>({menu_items:[item]}),
  },(s,menu)=>({...s,menu}));
  await assert.rejects(()=>reader(point),/offline/);
  const rows=await reader(point);
  assert.equal(rows.shops.length,1);
  assert.equal(attempts,2);
  const invalid=createNearbyCatalogReader({
    shops:async()=>({success:true}),
    menu:async()=>({menu_items:[]}),
  },(s,menu)=>({...s,menu}));
  await assert.rejects(()=>invalid(point),/invalid catalog/);
});

test("active app keeps same-location cards during refresh but fails closed on network errors",()=>{
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const service=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
  const module=readFileSync(new URL("../src/services/nearbyCatalogCache.ts",import.meta.url),"utf8");
  assert.match(app,/const sameLocation=!!key && key===displayedCatalogKeyRef\.current/);
  assert.match(app,/if\(!sameLocation\)\{displayedCatalogKeyRef\.current=null;setShops\(\[\]\)/);
  assert.match(app,/displayedCatalogKeyRef\.current=null;\s*setShops\(\[\]\);\s*setFetchError/);
  assert.match(app,/await readPickupCatalog\(userLocation\)/);
  assert.match(service,/createNearbyCatalogReader\([\s\S]*?\}, mapPickupShop\)/);
  assert.doesNotMatch(module,/localStorage|sessionStorage|indexedDB|fetch\(/);
  const storefront=app.slice(app.indexOf("function StoreInfoScreen("),app.indexOf("const filteredMenu",app.indexOf("function StoreInfoScreen(")));
  assert.match(storefront,/const shopMenu = shop\.menu;/);
  assert.doesNotMatch(storefront,/fetch\(|setIsMenuLoading|setApiMenu/);
});

test("a failed menu never hides verified neighbors or creates a partial cache hit", async () => {
  const other = {...shop, id:"shop-2"};
  let reads = 0;
  let fail = true;
  const reader = createNearbyCatalogReader({
    shops: async () => { reads++; return {shops:[shop, other]}; },
    menu: async id => {
      if (id === other.id && fail) throw Error("offline");
      return {menu_items:[item]};
    },
  }, fixture().map);

  const partial = await reader(point);
  assert.deepEqual(partial.shops.map(s => s.id), [shop.id]);
  assert.equal(partial.incomplete, true);
  fail = false;
  const complete = await reader(point);
  assert.deepEqual(complete.shops.map(s => s.id), [shop.id, other.id]);
  assert.equal(complete.incomplete, false);
  assert.equal(reads, 2);
});
