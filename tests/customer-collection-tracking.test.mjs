import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isCollectionTrackingOrder, collectionTrackingStep } from "../src/services/orderTrackingPolicy.ts";

test("persisted order type decides collection independently of any rider or legacy flag", () => {
  assert.equal(isCollectionTrackingOrder({delivery_type:"collection",is_delivery:true}),true);
  assert.equal(isCollectionTrackingOrder({delivery_type:"delivery",order_type:"collection",is_delivery:false}),false);
  assert.equal(isCollectionTrackingOrder({order_type:"collection"}),true);
  assert.equal(isCollectionTrackingOrder({order_type:"delivery",is_delivery:false}),false);
  assert.equal(isCollectionTrackingOrder({is_delivery:false}),true);
  assert.equal(isCollectionTrackingOrder({is_delivery:true}),false);
  assert.equal(isCollectionTrackingOrder({}),false);
  assert.equal(isCollectionTrackingOrder(null),false);
});

test("pickup progress has no rider phase and only advances on saved order status", () => {
  assert.equal(collectionTrackingStep("pending"),0);
  assert.equal(collectionTrackingStep("preparing"),1);
  assert.equal(collectionTrackingStep("ready"),2);
  assert.equal(collectionTrackingStep("ready_for_pickup"),2);
  assert.equal(collectionTrackingStep("collected"),3);
  assert.equal(collectionTrackingStep("completed"),3);
  assert.equal(collectionTrackingStep("cancelled"),0);
});

test("tracking screen refuses client-side pickup completion and renders a collection timeline", () => {
  const source=readFileSync(new URL("../src/screens/OrderTrackingScreen.tsx",import.meta.url),"utf8");
  assert.match(source,/const isCollection = isCollectionTrackingOrder\(order\)/);
  assert.match(source,/label: "Ready for Pickup"/);
  assert.match(source,/label: "Collected"/);
  assert.match(source,/isCollection \? collectionTrackingStep\(oStatus\)/);
  assert.match(source,/!isCollection && \["ready", "picked_up", "delivered"\]/);
  assert.match(source,/!currentOrder \|\| isCollectionTrackingOrder\(currentOrder\)/);
  assert.match(source,/Payment must be confirmed by the shop before your order can be collected/);
  assert.match(source,/Ready for collection at the shop/);
  assert.doesNotMatch(source,/\{\["ready", "picked_up", "delivered"\]\.includes/);
});
