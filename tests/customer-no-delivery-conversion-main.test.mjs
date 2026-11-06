import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const checkout=readFileSync(new URL("../src/screens/CheckoutScreen.tsx",import.meta.url),"utf8");
const pickup=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");

test("pickup-only Home does not expose old delivery-conversion action",()=>{
  assert.doesNotMatch(app,/changeToDelivery/);
  assert.doesNotMatch(app,/Order updated to delivery/);
  assert.doesNotMatch(app,/Finding a rider now!/);
  assert.doesNotMatch(app,/delivery_status:\s*"finding_rider"/);
  assert.doesNotMatch(app,/delivery_fee:\s*15/);
});

test("no legacy browser write can assign a rider through a conversion action",()=>{
  assert.doesNotMatch(app,/is_delivery:\s*true/);
  assert.doesNotMatch(app,/setOrders\(\(prev\) =>[\s\S]{0,160}is_delivery:\s*true/);
  assert.match(app,/Pickup-only launch\. No delivery conversion action/);
});

test("Customer checkout stays collection-only and pay-at-shop",()=>{
  assert.match(checkout,/Counter Pickup/);
  assert.match(checkout,/R0\.00 Pickup Fee/);
  assert.doesNotMatch(checkout,/Bicycle Courier/);
  assert.doesNotMatch(checkout,/setDeliveryType\("delivery"\)/);
  assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
});

test("original nearby, menu, cart, and profile navigation remain in App",()=>{
  for(const path of ['currentScreen === "home"','currentScreen === "checkout"',
    'currentScreen === "store-info"','currentScreen === "profile"',
    'navigateToProfile("profile")']){
    assert.ok(app.includes(path),path);
  }
});
