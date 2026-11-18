import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isPrivateMyKotaPreview,blockPrivateMyKotaOrder,PRIVATE_MY_KOTA_SHOP_ID} from "../src/services/privateMyKotaPolicy.ts";

const origin="https://localeats-customer-staging-r52d-private123.vercel.app";
const env={projectId:"localeats-staging",configSource:"environment",orderingEnabled:"false",
 apiOrigin:"https://localeats-api-staging-r52d-verified-mehey9184-makers-projects.vercel.app"};
test("account-only simulated fixture client gate is not enabled on Production or arbitrary Previews",()=>{
 assert.equal(isPrivateMyKotaPreview(origin,env),true);
 for(const [o,e] of [
  ["https://localeatssa.co.za",env],
  ["https://unrelated-preview.vercel.app",env],
  ["https://localeats-customer-staging-r52d-private123.evil.example",env],
  ["http://localeats-customer-staging-r52d-private123.vercel.app",env],
  [origin,{...env,projectId:"localeats-5e26e"}],
  [origin,{...env,configSource:"bundle"}],
  [origin,{...env,orderingEnabled:"true"}],
  [origin,{...env,apiOrigin:"https://localeats-api.vercel.app"}],
  [origin,{...env,apiOrigin:"https://localeats-api-staging-r52d-evi1-mehey9184-makers-projects.vercel.app.evil.test"}],
  [origin,{...env,apiOrigin:"https://localeats-api-staging-r52d-verified-mehey9184-makers-projects.vercel.app/route"}]
 ])assert.equal(isPrivateMyKotaPreview(o,e),false,JSON.stringify({o,e}));
});
test("virtual My-Kota cannot reach real quote or order",()=>{
 assert.throws(()=>blockPrivateMyKotaOrder(PRIVATE_MY_KOTA_SHOP_ID),/cannot create an order/);
 assert.doesNotThrow(()=>blockPrivateMyKotaOrder("shop-my-kota-ivory-park"));
});
test("no fake GPS, private cache, or persistent private cart; keep original ShopCard",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const pickup=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
 const fixture=readFileSync(new URL("../src/services/privateMyKotaPreview.ts",import.meta.url),"utf8");
 assert.match(app,/auth\.currentUser\?\.uid===session\?\.user\?\.id/);
 assert.match(app,/setPrivateMyKotaShop\(null\)/);
 assert.match(app,/setCart\(items=>items\.filter\(i=>i\.shopId!==PRIVATE_MY_KOTA_SHOP_ID\)\)/);
 assert.match(app,/cart\.filter\(item=>item\.shopId!==PRIVATE_MY_KOTA_SHOP_ID\)/);
 assert.match(app,/SIMULATED LOCATION — private My-Kota test only/);
 assert.match(app,/PRIVATE MY-KOTA TEST · SAMPLE ONLY/);
 assert.match(app,/shops=\{visibleShops\}/);
 assert.match(app,/\bShopCard\b/);
 assert.match(pickup,/for\(const item of cart\)blockPrivateMyKotaOrder\(item\.shopId\)/);
 assert.match(pickup,/blockPrivateMyKotaOrder\(PRIVATE_MY_KOTA_SHOP_ID\)/);
 assert.match(fixture,/private-test\/my-kota\/shop\?mode=simulated/);
 assert.doesNotMatch(fixture,/localStorage|sessionStorage|indexedDB|setUserLocation/);
});
