import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createCatalogApi, CatalogApiError, parseShop, parseMenuItem, mapCatalogShop, displayCatalog, loadCatalog, coordinates, hasCoordinates, catalogDistance, compareShopDistance, isNearbyShop, AUTHORITATIVE_CATALOG_CACHE_KEY } from "./CatalogApi";

const shop = { id: "shop-exact", name: "Test shop", is_active: true };
const item = { id: "menu-exact", shop_id: shop.id, name: "Test item", price: 12.345, is_available: true };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const apiFor = (data: unknown, status = 200) => createCatalogApi(() => "https://catalog.invalid///", async () => response(data, status));
const mapped = (s = shop, m = [item]) => mapCatalogShop(parseShop(s), m.map(row => parseMenuItem(row, s.id)));
const source = (path: string) => readFileSync(path, "utf8");
const app = source("src/App.tsx"), server = source("server.ts"), client = source("src/services/CatalogApi.ts");
const card = source("src/components/ShopCard.tsx"), maps = source("src/components/MapComponents.tsx");
const firebase = source("src/lib/firebase.ts");
const proxy = server.slice(server.indexOf("const proxyCatalog"), server.indexOf("const getAuthoritativeOrderApiUrl"));

for (const [method, suffix, body] of [
  ["getShops", "/shops", {success:true, shops:[shop]}],
  ["getShop", "/shops/shop-exact", {success:true, shop}],
  ["getMenu", "/shops/shop-exact/menu", {success:true, menu:[item]}],
] as const) test(method + " uses exact public path with trimmed base and no auth", async () => {
  let url: unknown, options: unknown;
  const api = createCatalogApi(() => " https://catalog.invalid/// ", async (u, o) => { url=u; options=o; return response(body); });
  await api[method](shop.id);
  assert.equal(url, "https://catalog.invalid/api/v1/catalog" + suffix);
  assert.equal(options, undefined);
});
test("shop ID path is encoded", async () => {
  let path = "";
  const api = createCatalogApi(() => "https://catalog.invalid", async u => {path=String(u); return response({success:true, menu:[]});});
  await api.getMenu("shop/a?b");
  assert.equal(path, "https://catalog.invalid/api/v1/catalog/shops/shop%2Fa%3Fb/menu");
});
test("missing URL fails before fetch", async () => {
  let calls=0;
  await assert.rejects(createCatalogApi(() => "", async () => {calls++; return response({});}).getShops(), CatalogApiError);
  assert.equal(calls,0);
});
test("network error is explicit", async () => {
  await assert.rejects(createCatalogApi(() => "https://catalog.invalid", async () => {throw Error("offline");}).getShops(), /Unable to reach/);
});
test("non-JSON rejected", async () => {
  await assert.rejects(createCatalogApi(() => "https://catalog.invalid", async () => new Response("<html/>")).getShops(), CatalogApiError);
});
test("invalid JSON rejected", async () => {
  await assert.rejects(createCatalogApi(() => "https://catalog.invalid", async () => new Response("{", {headers:{"content-type":"application/json"}})).getShops(), /Invalid catalog JSON/);
});
for (const status of [401,404,500,503]) test("HTTP " + status + " rejected", async () => {
  await assert.rejects(apiFor({success:true, shops:[]}, status).getShops(), (e: CatalogApiError) => e.status === status);
});
for (const payload of [null, [], {}, {success:false,shops:[]}, {success:true,shops:{}}, {success:true,shops:[null]}]) {
  test("malformed shop envelope " + JSON.stringify(payload), async () => {await assert.rejects(apiFor(payload).getShops(), CatalogApiError);});
}
for (const partial of [{id:""}, {name:null}, {is_active:"true"}, {rating:Infinity}, {rating:6}]) {
  test("invalid shop row " + JSON.stringify(partial), () => assert.throws(() => parseShop({...shop,...partial}), CatalogApiError));
}
for (const partial of [{id:""}, {name:null}, {shop_id:"other"}, {price:-1}, {price:Infinity}, {price:NaN}, {price:"12"}, {is_available:"false"}, {customizations:{fake:true}}]) {
  test("invalid menu row " + JSON.stringify(partial), () => assert.throws(() => parseMenuItem({...item,...partial}, shop.id), CatalogApiError));
}
test("malformed menu envelope rejected", async () => {await assert.rejects(apiFor({success:true,menu:{}}).getMenu(shop.id));});
test("single shop must match requested ID", async () => {await assert.rejects(apiFor({success:true,shop}).getShop("different"));});
test("exact menu ID preserved", () => assert.equal(mapped().menu[0].id, item.id));
test("exact shop and menu parent IDs preserved", () => {assert.equal(mapped().id,shop.id); assert.equal(mapped().menu[0].shop_id,shop.id);});
test("exact fractional price preserved", () => assert.equal(mapped().menu[0].price,item.price));
test("false item availability preserved", () => assert.equal(mapped(shop,[{...item,is_available:false}]).menu[0].is_available,false));
test("inactive approved shop remains displayable", () => {
  const result = displayCatalog({shops:[parseShop({...shop,is_active:false})],menus:[[]]});
  assert.equal(result.length,1); assert.equal(result[0].is_active,false);
});
test("private and unexpected fields not trusted", () => {
  const parsed = parseShop({...shop,owner_id:"private",approval_reason:"private",firebase_uid:"private",menu:[item]});
  for (const key of ["owner_id","approval_reason","firebase_uid","menu"]) assert.ok(!(key in parsed));
  assert.ok(!("secret" in parseMenuItem({...item,secret:"private"},shop.id)));
});
test("latitude and longitude preserved", () => assert.deepEqual(coordinates({latitude:-26,longitude:28}),{latitude:-26,longitude:28}));
test("coordinate aliases resolved", () => assert.deepEqual(coordinates({lat:-26,lng:28}),{latitude:-26,longitude:28}));
test("canonical coordinates win", () => assert.deepEqual(coordinates({latitude:0,longitude:0,lat:4,lng:5}),{latitude:0,longitude:0}));
test("invalid canonical coordinates use valid aliases", () => assert.deepEqual(coordinates({latitude:100,longitude:Infinity,lat:0,lng:0}),{latitude:0,longitude:0}));
test("missing coordinates never fabricated", () => assert.deepEqual(coordinates({}),{latitude:undefined,longitude:undefined}));
for (const coordinate of [{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:NaN,longitude:0},{latitude:0,longitude:Infinity}]) {
  test("invalid coordinate unavailable " + JSON.stringify(coordinate), () => {assert.equal(hasCoordinates(coordinate),false);assert.equal(catalogDistance(coordinate,{lat:0,lng:0}),null);});
}
test("zero coordinate valid and zero distance", () => assert.equal(catalogDistance({latitude:0,longitude:0},{lat:0,lng:0}),0));
test("missing coordinates cannot be nearby", () => assert.equal(isNearbyShop({}, {lat:0,lng:0}),false));
test("real distance respects four km cap", () => {assert.equal(isNearbyShop({latitude:0.03,longitude:0},{lat:0,lng:0}),true);assert.equal(isNearbyShop({latitude:0.04,longitude:0},{lat:0,lng:0},20),false);});
test("smaller selected radius respected", () => assert.equal(isNearbyShop({latitude:0.03,longitude:0},{lat:0,lng:0},2),false));
test("no user location does not invent proximity", () => {assert.equal(catalogDistance({latitude:0,longitude:0},null),null);assert.equal(isNearbyShop({},null),true);});
test("distance sorting places missing coordinates last stably", () => {
  const a={latitude:0,longitude:0}, b={latitude:1,longitude:0}, u={lat:0,lng:0};
  assert.ok(compareShopDistance(a,b,u)<0);assert.equal(compareShopDistance(a,{},u),-1);
  assert.equal(compareShopDistance({},a,u),1);assert.equal(compareShopDistance({},{},u),0);
});
test("empty shops stay empty", async () => assert.deepEqual(await apiFor({success:true,shops:[]}).getShops(),[]));
test("empty menu stays empty without samples", async () => {assert.deepEqual(await apiFor({success:true,menu:[]}).getMenu(shop.id),[]);assert.deepEqual(mapped(shop,[]).menu,[]);});
test("missing business facts stay unknown", () => {
  const result=mapped(); assert.equal(result.rating,null);assert.equal(result.address,"Location unavailable");
  assert.equal(result.description,"No description provided");assert.equal(result.prepTime,undefined);assert.equal(result.reviewCount,undefined);
  assert.equal(result.delivery_eta,undefined);assert.equal(result.logo,"");
});
test("at most three menus in flight, in original order", async () => {
  let active=0, peak=0;
  const shops=Array.from({length:10},(_,i)=>({...shop,id:String(i)}));
  const result=await loadCatalog({
    getShops:async()=>shops,
    getShop:async()=>shop,
    getMenu:async id=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return [{...item,shop_id:id}];},
  });
  assert.equal(peak,3);assert.deepEqual(result.menus.map(menu=>menu[0].shop_id),shops.map(s=>s.id));
});
test("menu failure fails whole snapshot without alternate authority", async () => {
  await assert.rejects(loadCatalog({getShops:async()=>[shop],getShop:async()=>shop,getMenu:async()=>{throw new CatalogApiError("offline");}}));
});
for (const forbidden of ["FirestoreService.getShops","FirestoreService.listenToShops","mergeShopsCatalogs","DEFAULT_FALLBACK_SHOPS","MY_KOTA_TEST_STORE","Chef's Special Special","fallback-custom-item","deterministicLat","deterministicLng","hashString(shop.id)","cached_shops","all_shops"]) {
  test("App excludes retired authority: " + forbidden, () => assert.ok(!app.includes(forbidden)));
}
for(const table of ["shops","menu_items"]) {
  test("browser catalog has no direct Supabase " + table,()=>assert.doesNotMatch(app+client,new RegExp("\\.from\\(\\s*['\"]"+table+"['\"]")));
  test("server has no direct Supabase catalog " + table,()=>assert.doesNotMatch(server,new RegExp("\\.from\\(\\s*['\"]"+table+"['\"]")));
}
test("retired Firestore catalog helpers removed", () => assert.doesNotMatch(firebase, /async (getShops|listenToShops|seedDemoShopsIfEmpty)\(/));
test("unused catalog hook removed with no imports", () => {assert.equal(existsSync("src/hooks/useShopsData.ts"),false);assert.ok(!app.includes("useShopsData"));});
test("legacy proxies target encoded authoritative Catalog-01 paths", () => {
  assert.ok(proxy.includes('"/api/v1/catalog" + path'));assert.ok(proxy.includes('encodeURIComponent(req.params.shopId)'));
  assert.ok(proxy.includes("res.status(upstream.status).json(data)"));assert.ok(proxy.includes("res.status(503)"));
  assert.doesNotMatch(proxy,/supabase|Firestore/);
});
test("new cache key only written after successful snapshot including empty", () => {
  assert.equal(AUTHORITATIVE_CATALOG_CACHE_KEY,"localeats_authoritative_catalog_v1");
  assert.ok(app.includes("setShops(displayCatalog(snapshot))"));assert.ok(app.includes("JSON.stringify(snapshot)"));
  assert.ok(!app.includes("getItem(AUTHORITATIVE_CATALOG_CACHE_KEY"));
  assert.match(app,/catch \(error\) \{[\s\S]*?setShops\(\[\]\)/);
});
test("cold start empty, base catalog never filters inactive",()=>{assert.ok(app.includes("useState<Shop[]>([])"));assert.ok(app.includes("const visibleShops = shops;"));});
test("no fabricated rating reviews ETA or ID distance in active UI", () => {
  assert.doesNotMatch(app+card, /rating\s*\|\|\s*["']4\.[58]|reviewCount\s*\|\|\s*(24|120)|120\+ reviews|delivery_eta\s*\|\|\s*["'](?:20m|20-35 min)|charCodeAt|Math\.pow\(aLat/);
  assert.doesNotMatch(card,/const cat =|Local Kitchen/);
});
test("shop marker guards missing coordinates before rendering", () => {
  const marker=maps.slice(maps.indexOf("// Memoized Shop"),maps.indexOf("export function AddressSearch"));
  assert.ok(marker.indexOf("if (!hasCoordinates(shop)) return null")<marker.indexOf("<Marker"));
  assert.doesNotMatch(marker,/-25\.9964|28\.2268/);
});
test("nearby views use shared guarded radius helper", () => assert.ok((app.match(/isNearbyShop\(shop, userLocation/g)||[]).length>=3));
test("central cart guard requires current shop and available item", () => {
  assert.ok(app.includes('!getShopStatus(currentShop).isOpen || currentItem?.is_available !== true'));
  assert.ok(card.includes("disabled={isUnavailable}"));
});
test("reorder cannot synthesize menu IDs",()=>assert.doesNotMatch(app,/id: item\.product_name|originalMenuItem \|\| \{/));
test("checkout safety files unchanged", () => {
  assert.equal(execFileSync("git",["diff","--name-only","HEAD","--","src/screens/CheckoutScreen.tsx","src/screens/OrderTrackingScreen.tsx","src/lib/legacyCheckoutDataScrubber.ts"],{encoding:"utf8"}).trim(),"");
});
