import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 createCustomerCommunityReadClient,CustomerCommunityApiError,
 communityWritesEnabled,communityFeatureMounted,
} from "../src/services/customerCommunityReadContract.ts";

const shopReview={id:"r1",shop_id:"shop-A",rating:5,comment:"Great kota",created_at:"2026-11-20T10:00:00Z"};
const orderMessage={id:"m1",order_id:"order-A",sender_role:"merchant",message:"Ready",created_at:"2026-11-20T10:01:00Z"};
const withReply=(body,status=200)=>{
 const requests=[];
 const transport=async(url,options)=>{
  requests.push({url,options});
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
 };
 const client=createCustomerCommunityReadClient(
  "https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app/",
  async()=> "SYNTHETIC_TEST_TOKEN",transport,{requireHttps:true});
 return {client,requests};
};
test("N8M Customer adapter supplies verified bearer only on GET; no UID or role query",async()=>{
 const {client,requests}=withReply({success:true,reviews:[shopReview]});
 const out=await client.reviews("shop-A");
 assert.deepEqual(out,[shopReview]);
 assert.equal(requests.length,1);
 assert.equal(requests[0].options.method,"GET");
 assert.equal(requests[0].options.cache,"no-store");
 assert.equal(requests[0].options.headers.Authorization,"Bearer fb-SYNTHETIC_TEST_TOKEN");
 assert.equal(requests[0].url,"https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app/api/v1/community/shops/shop-A/reviews");
 assert.ok(!requests[0].url.includes("uid="));
});
test("N8M Customers cannot inject account ID in followed shops request",async()=>{
 const {client,requests}=withReply({success:true,shop_ids:["shop-A","shop-A"]});
 assert.deepEqual(await client.followedShops(),{shop_ids:["shop-A"]});
 assert.equal(requests[0].url.endsWith("/api/v1/community/me/follows"),true);
});
test("N8M message projection strips private sender IDs/phone and denies Rider aliases",async()=>{
 const {client}=withReply({success:true,messages:[
  {...orderMessage,sender_uid:"owner-A",phone:"SYNTHETIC_PRIVATE_PHONE",owner_email:"private@example.invalid"},
 ]});
 assert.deepEqual(await client.pickupMessages("order-A"),[orderMessage]);
 const denied=withReply({success:true,messages:[{...orderMessage,sender_role:"rider"}]});
 await assert.rejects(denied.client.pickupMessages("order-A"),{code:"COMMUNITY_RESPONSE_INVALID"});
});
test("N8M fail-closed private-scope mismatch, oversize and malformed read response",async()=>{
 const cases=[
  ["reviews","shop-A",{success:true,reviews:[{...shopReview,shop_id:"shop-B"}]}],
  ["reviews","shop-A",{success:true,reviews:[{...shopReview,rating:99}]}],
  ["pickupMessages","order-A",{success:true,messages:[{...orderMessage,order_id:"order-B"}]}],
  ["followedShops",null,{success:true,shop_ids:["shop 1"]}],
  ["reviews","shop-A",{success:false,reviews:[shopReview]}],
  ["reviews","shop-A",{success:true}],
 ];
 for(const [method,id,body] of cases){
  const {client}=withReply(body);
  const promise=id?client[method](id):client[method]();
  await assert.rejects(promise,(e)=>e instanceof CustomerCommunityApiError&&e.status===503);
 }
});
test("N8M 404 dormant backend, 401 token errors, and network errors never become empty success",async()=>{
 const dormant=withReply({success:false,code:"NOT_FOUND"},404);
 await assert.rejects(dormant.client.reviews("shop-A"),{code:"COMMUNITY_ROUTE_NOT_ACTIVE"});
 const unauth=createCustomerCommunityReadClient("https://stage.example.invalid/",async()=>"",async()=>{
  throw Error("SHOULD_NOT_FETCH");
 });
 await assert.rejects(unauth.followedShops(),{code:"UNAUTHORIZED"});
 const network=createCustomerCommunityReadClient("https://stage.example.invalid/",async()=> "token",
  async()=>{throw Error("OFFLINE");});
 await assert.rejects(network.pickupMessages("order-A"),{code:"COMMUNITY_NETWORK_UNAVAILABLE"});
});
test("N8M caller-controlled shop or order path injection rejected before any HTTP request",async()=>{
 const {client,requests}=withReply({success:true,reviews:[]});
 await assert.rejects(client.reviews("../owner"),{status:404});
 await assert.rejects(client.pickupMessages("abc?uid=owner-A"),{status:404});
 assert.equal(requests.length,0);
});
test("N8M hostile API base URL or non-HTTPS network is not accepted",async()=>{
 for(const origin of ["https://api.example.invalid/v1","https://user:secret@api.example.invalid/","http://api.example.invalid/","https://api.example.invalid/?token=x"]){
  assert.throws(()=>createCustomerCommunityReadClient(origin,async()=>"x"));
 }
});
test("N8M no review/follow/chat writes or UI integration activated",()=>{
 assert.equal(communityWritesEnabled(),false);
 assert.equal(communityFeatureMounted(),false);
 const api=readFileSync(new URL("../src/services/customerCommunityReadContract.ts",import.meta.url),"utf8");
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.ok(!app.includes("customerCommunityReadContract"));
 assert.ok(!api.includes('method:"POST"'));
 assert.ok(!api.includes('method:"PATCH"'));
 assert.ok(!api.includes('method:"DELETE"'));
 const legacy=readFileSync(new URL("../src/services/customerStagingNoDirectWrites.ts",import.meta.url),"utf8");
 assert.match(legacy,/localeats-staging/);
});
