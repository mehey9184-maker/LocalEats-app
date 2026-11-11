import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=source("src/App.tsx");
const reviewScreen=source("src/screens/OrderRating.tsx");
const flowSource=source("src/services/kotaReviewInstallFlow.ts");
const baseOrder={
  id:"order-verified-1",shop_id:"shop-my-kota-ivory-park",user_id:"customer-1",
  status:"collected",delivery_type:"collection",delivery_status:"none",
  payment_status:"paid_at_shop",payment_method:"cash",revision:3,
  customer_name:"Test",phone:"",total_price:25,created_at:"2026-11-11T01:00:00Z",
  items:[{menu_item_id:"item1",name:"My-Kota",quantity:1,unit_price:25,line_total:25}]
};
const flow=await import("../src/services/kotaReviewInstallFlow.ts");

test("qualify only server-shaped collected Kota orders for the authenticated owner",()=>{
  assert.equal(flow.isVerifiedCollectedKota(baseOrder,"customer-1"),true);
  assert.equal(flow.isVerifiedCollectedKota(baseOrder,"customer-2"),false);
  assert.equal(flow.isVerifiedCollectedKota({...baseOrder,status:"pending"},"customer-1"),false);
  assert.equal(flow.isVerifiedCollectedKota({...baseOrder,status:"ready_for_pickup"},"customer-1"),false);
  assert.equal(flow.isVerifiedCollectedKota({...baseOrder,delivery_type:"delivery"},"customer-1"),false);
  assert.equal(flow.isVerifiedCollectedKota({...baseOrder,items:[{...baseOrder.items[0],name:"Burger"}]},"customer-1"),false);
  assert.equal(flow.isVerifiedCollectedKota({...baseOrder,items:[{...baseOrder.items[0],quantity:0}]},"customer-1"),false);
  assert.equal(flow.nextUnreviewedKota([baseOrder],"customer-1",false,new Set()),null);
  assert.equal(flow.nextUnreviewedKota([baseOrder],"customer-2",true,new Set()),null);
  assert.equal(flow.nextUnreviewedKota([baseOrder],"customer-1",true,new Set(["order-verified-1"])),null);
  assert.equal(flow.nextUnreviewedKota([baseOrder],"customer-1",true,new Set())?.id,"order-verified-1");
});

test("review completion marks only the matching user and order, no cross-account unlock",()=>{
  const data=new Map();
  globalThis.window={localStorage:{
    getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,String(value))
  }};
  assert.equal(flow.reviewedKotaOrderIds("customer-1").size,0);
  flow.rememberReviewedKota("customer-1","order-verified-1");
  flow.rememberReviewedKota("customer-1","order-verified-1");
  assert.deepEqual([...flow.reviewedKotaOrderIds("customer-1")],["order-verified-1"]);
  assert.equal(flow.reviewedKotaOrderIds("customer-2").size,0);
  assert.equal(flow.nextUnreviewedKota([baseOrder],"customer-1",true,flow.reviewedKotaOrderIds("customer-1")),null);
  assert.equal(flow.nextUnreviewedKota([{...baseOrder,id:"order-verified-2"}],"customer-1",true,flow.reviewedKotaOrderIds("customer-1"))?.id,"order-verified-2");
});

test("post-purchase install requires a fresh authenticated API read and a saved Kota review",()=>{
  assert.match(app,/currentPickupHistory\?\.userId === historyUserId/);
  assert.match(app,/currentPickupHistory\.orders !== null/);
  assert.match(app,/!currentPickupHistory\.error && !currentPickupHistory\.refreshing/);
  assert.match(app,/canManageCustomerProfile\(auth\.currentUser, session\?\.user\?\.id\)/);
  assert.match(app,/pickupOrderingEnabled\(\) && historyUserId/);
  assert.match(app,/nextUnreviewedKota\(/);
  assert.match(app,/isVerifiedCollectedKota\(order, historyUserId \?\? ""\)/);
  assert.match(app,/postReviewInstallEligible/);
  assert.match(app,/delayMs=\{0\}/);
  assert.match(app,/!pendingReview/);
  assert.match(app,/const confirmed = await customerPickupApi\.order\(pendingReview\.orderId\)/);
  assert.match(app,/rememberReviewedKota\(uid, confirmed\.order\.id\)/);
  assert.match(app,/setKotaReviewRevision\(value => value \+ 1\)/);
  assert.match(app,/setPendingReview\(null\);\s+setCurrentScreen\("home"\);/);
  assert.match(app,/catch \(err\) \{[\s\S]*?Your review was not saved\. Please retry/);
  assert.match(app,/if \(!pickupOrderingEnabled\(\)\) \{[\s\S]*?Pickup reviews are not enabled in this Preview/);
  assert.doesNotMatch(app,/parseInt\(String\(pendingReview\.shopId\)/);
  assert.match(reviewScreen,/\{pendingReview\.riderName && \(/);
});

test("the reminder never interrupts checkout and does not use a checkout success stub",()=>{
  assert.match(app,/!\["home", "order-history", "order-tracking"\]\.includes\(currentScreen\)/);
  assert.match(app,/nextReminder: Date\.now\(\)/);
  assert.match(app,/order\.status === "collected"/m); // status mapping from verified pickup API
  assert.doesNotMatch(flowSource,/localStorage.*purchase/i);
  assert.doesNotMatch(flowSource,/status === "pending"/);
});
