import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pickupCartIntent,blockPickupSubmission} from "../src/services/pickupMapping.ts";

const checkout=readFileSync(new URL("../src/screens/CheckoutScreen.tsx",import.meta.url),"utf8");
const cart=readFileSync(new URL("../src/components/CartDrawer.tsx",import.meta.url),"utf8");
const pickupService=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");

test("first-customer checkout offers only the existing Counter Pickup card",()=>{
  assert.match(checkout,/const \[deliveryType, setDeliveryType\] = useState<"collection" \| "delivery">\(\s*"collection"/);
  assert.match(checkout,/Counter Pickup/);
  assert.match(checkout,/R0\.00 Pickup Fee/);
  assert.match(checkout,/Collect at the shop/);
  assert.doesNotMatch(checkout,/Bicycle Courier/);
  assert.doesNotMatch(checkout,/setDeliveryType\("delivery"\)/);
  assert.doesNotMatch(checkout,/~\{deliveryFeePercent\}% of meal/);
  assert.doesNotMatch(checkout,/100% Free/);
  assert.match(checkout,/grid grid-cols-1 gap-3/);
});

test("cart defaults to pickup and never adds a delivery fee on its default path",()=>{
  assert.match(cart,/fulfillment = "collection"/);
  assert.match(cart,/const estDeliveryFee = fulfillment === "collection" \? 0 : 15\.0/);
  assert.match(cart,/fulfillment === "collection" \? "Pickup fee" : "Estimated Delivery"/);
  assert.match(cart,/fulfillment === "collection" \? "Estimated pay at shop" : "Est\. Total"/);
});

test("actual quote creation remains exclusively collection with pay-at-shop choice",()=>{
  const item={id:"synthetic-kota",shopId:"synthetic-shop",quantity:1,price:25};
  const point={lat:-26.0,lng:28.0};
  for(const method of ["cash","card_machine"]){
    const request=pickupCartIntent([item],point,"Test Customer","0712345678",method);
    assert.equal(request.contract_version,"pickup-v1");
    assert.equal(request.delivery_type,"collection");
    assert.equal(request.delivery_schedule_mode,"standard");
    assert.equal(request.payment_method,method);
    assert.equal(request.tip_amount,0);
    assert.equal(request.items.length,1);
    assert.equal(Object.hasOwn(request,"delivery_coordinates"),false);
  }
  assert.throws(()=>pickupCartIntent([item],point,"Test Customer","0712345678","online_card"),/Pay at the shop/);
});

test("this Preview does not enable order submissions or invent an order result",()=>{
  assert.match(pickupService,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
  assert.match(checkout,/blockPickupSubmission\(\);/);
  assert.throws(()=>blockPickupSubmission(),/not enabled yet/);
  assert.doesNotMatch(checkout,/Simulate test checkout/);
});
