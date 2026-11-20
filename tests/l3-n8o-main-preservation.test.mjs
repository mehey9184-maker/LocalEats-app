import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const originalMain="d5680332d391d9aa497d10ff047c839242b2d62f";

test("N8O integrates security onto main-based branch, preserves latest receipt and paginated pickup history",()=>{
 assert.match(originalMain,/^[0-9a-f]{40}$/);
 assert.equal(existsSync(new URL("../src/services/pickupReceipt.ts",import.meta.url)),true);
 const receipt=read("src/services/pickupReceipt.ts");
 const history=read("src/screens/OrderHistoryScreen.tsx");
 const client=read("src/pickup/client.ts");
 assert.match(receipt,/pickupReceipt/);
 assert.match(history,/readOlder/);
 assert.match(history,/historyCursor/);
 assert.match(client,/\/api\/v1\/orders\/history/);
 assert.match(client,/\/api\/v1\/orders\/quote/);
});
test("N8O original checkout remains quote-verified and gated, not bypassed by reconciliation",()=>{
 const checkout=read("src/screens/CheckoutScreen.tsx");
 const pickup=read("src/services/customerPickup.ts");
 const app=read("src/App.tsx");
 assert.match(checkout,/AnimatedPrice/);
 assert.match(checkout,/quotePickupCart/);
 assert.match(checkout,/submitPickupQuote/);
 assert.match(checkout,/pickupOrderingEnabled/);
 assert.match(pickup,/blockPickupSubmission/);
 assert.match(app,/readPickupCatalog/);
 assert.match(app,/OrderHistoryScreen/);
});
test("N8O public pickup shop card strict mapping excludes raw private database metadata",()=>{
 const s=read("src/services/pickupMapping.ts");
 assert.match(s,/Never expose credentials/);
 assert.ok(!s.includes("return {...shop"));
 assert.ok(!s.includes("return {...item"));
 assert.match(s,/return \{id:String\(shop\.id\),name:shop\.name/);
 assert.match(s,/MAX_PICKUP_ITEM_QUANTITY = 20/);
 assert.match(s,/isWithinPickupArea/);
});
test("N8O stage-only no-write guard and dormant community client do not enable account/order features",()=>{
 const s=read("src/lib/firebase.ts");
 const auth=read("src/lib/supabase.ts");
 const guard=read("src/services/customerStagingNoDirectWrites.ts");
 const dormant=read("src/services/customerCommunityReadContract.ts");
 const app=read("src/App.tsx");
 const names=["addReview","followShop","unfollowShop","sendMessage","saveProfile","savePushToken","updateShop","addMenuItem"];
 for(const method of names){
  const start=s.indexOf("  async "+method+"(");
  assert.ok(start>=0,method);
  assert.match(s.slice(start,start+450),/ensureCustomerLegacyWriteAllowed\(\)/,method);
 }
 assert.match(auth,/isCustomerStageLegacyWriteBlocked\(import\.meta\.env\)/);
 assert.match(guard,/localeats-staging/);
 assert.match(dormant,/communityWritesEnabled=\(\)=>false/);
 assert.ok(!app.includes("customerCommunityReadContract"));
 assert.match(auth,/signInWithEmailAndPassword/);
});
test("N8O source-only security reconciliation did not enable Production or activate legacy checkout",()=>{
 const client=read("src/pickup/client.ts");
 const pickup=read("src/services/customerPickup.ts");
 assert.match(pickup,/pickupOrderingEnabled/);
 assert.match(pickup,/blockPickupSubmission/);
 assert.match(client,/\/api\/v1\/catalog\/pickup-shops/);
 const auth=read("src/lib/supabase.ts");
 assert.ok(!auth.includes("createClient("));
 assert.match(auth,/const mockDbChain: any = createChain\(\)/);
});
