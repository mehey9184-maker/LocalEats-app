import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {
  assessCustomerMainReconciliation,verifiedMain,isolatedCustomerN8M,
  formerlyDeployedCustomerStage,
} from "./customer-main-merge-risk.mjs";

const read=(p)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const all=()=>({
 mainSha:verifiedMain,sourceDraftSha:isolatedCustomerN8M,
 replayedLatestReceiptAndHistory:true,originalShopCardVerified:true,
 originalCheckoutQuoteVerified:true,stagingFirebaseNoWriteGuardsPreserved:true,
 communityReadContractDormant:true,reviewedNoLegacyOrderFallbackActivation:true,
 currentMainReceiptTestsPassed:true,stagedPrivacyAndPickupTestsPassed:true,
 ownerApprovedPreviewOnlyReconciliation:true,
});

test("N8N latest main is a DIFFERENT checkout/history/receipt line from the older staged draft",()=>{
 assert.match(verifiedMain,/^[a-f0-9]{40}$/);
 assert.match(isolatedCustomerN8M,/^[a-f0-9]{40}$/);
 assert.notEqual(verifiedMain,isolatedCustomerN8M);
 assert.notEqual(formerlyDeployedCustomerStage,isolatedCustomerN8M);
 assert.equal(
  existsSync(new URL("../../src/services/pickupReceipt.ts",import.meta.url)),false,
  "This pre-reconciliation N8M draft has NOT yet integrated new main's receipt component");
 const result=assessCustomerMainReconciliation({
  mainSha:verifiedMain,sourceDraftSha:isolatedCustomerN8M,
  replayedLatestReceiptAndHistory:false,
 });
 assert.equal(result.eligibleForPairedStagingRelease,false);
 assert.match(result.blockers.join(" "),/receipt\/history/);
 assert.equal(result.realHostedPreviewAccepted,false);
});
test("N8N any missing upstream test or owner gate keeps staged release BLOCKED",()=>{
 for(const field of Object.keys(all())){
  const evidence=all();
  delete evidence[field];
  const result=assessCustomerMainReconciliation(evidence);
  assert.equal(result.eligibleForPairedStagingRelease,false,field);
 }
 const happy=assessCustomerMainReconciliation(all());
 assert.equal(happy.eligibleForPairedStagingRelease,true);
 assert.equal(happy.realHostedPreviewAccepted,false);
 assert.equal(happy.productionMergeAuthorized,false);
 assert.equal(happy.pickupOrderWritesAuthorized,false);
});
test("N8N legacy supabase frontend import is a Firebase/mock facade, not actual browser PostgREST",()=>{
 const s=read("src/lib/supabase.ts");
 assert.match(s,/from "firebase\/auth"/);
 assert.match(s,/const createChain =/);
 assert.match(s,/mockDbChain/);
 assert.match(s,/rpc: async/);
 assert.ok(!s.includes("createClient("));
 assert.match(s,/isCustomerStageLegacyWriteBlocked/);
});
test("N8N actual Customer profile sync uses Express API PLUS direct Firestore mirror",()=>{
 const s=read("src/lib/profileService.ts");
 assert.match(s,/fetch\('\/api\/profiles'/);
 assert.match(s,/FirestoreService\.saveProfile\(/);
 assert.match(s,/queueProfileSync\(/);
 assert.match(s,/cached: true, offline: true/);
});
test("N8N controlled pickup API coexists with legacy checkout paths — do not equate them",()=>{
 const checkout=read("src/screens/CheckoutScreen.tsx");
 const controlled=read("src/services/customerPickup.ts");
 const api=read("src/pickup/client.ts");
 assert.match(checkout,/quotePickupCart\(/);
 assert.match(checkout,/submitPickupQuote\(/);
 assert.match(checkout,/FirestoreService\.createAuthoritativeOrder\(/);
 assert.match(checkout,/supabase\s*\.from\("orders"\)/);
 assert.match(controlled,/createPickupApi\(/);
 assert.match(controlled,/pickupOrderingEnabled/);
 assert.match(api,/\/api\/v1\/orders\/quote/);
 assert.match(api,/\/api\/v1\/catalog\/pickup-shops/);
});
test("N8N legacy direct Firestore shop/review/chat/profile paths remain under stage no-write guard",()=>{
 const firebase=read("src/lib/firebase.ts");
 const shops=read("src/hooks/useShopsData.ts");
 const guard=read("src/services/customerStagingNoDirectWrites.ts");
 for(const method of [
  "addReview","getReviewsForShop","followShop","unfollowShop",
  "sendMessage","listenToOrderMessages","saveProfile","savePushToken",
 ])assert.ok(firebase.includes(method+"("),method);
 assert.match(shops,/FirestoreService\.listenToShops/);
 assert.match(shops,/FirestoreService\.getShops/);
 assert.match(guard,/localeats-staging/);
 const bridge=read("src/services/customerCommunityReadContract.ts");
 assert.match(bridge,/communityFeatureMounted=\(\)=>false/);
 assert.ok(!read("src/App.tsx").includes("customerCommunityReadContract"));
});
test("N8N legacy Customer Express backend owns a separate Supabase service-role and order fallback risk",()=>{
 const server=read("server.ts");
 assert.match(server,/createClient\(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(server,/app\.post\("\/api\/orders"/);
 assert.match(server,/Migration Fallback/);
 assert.match(server,/in.memory/i);
 // Any old checkout path to this handler must remain a separate security gate.
});
