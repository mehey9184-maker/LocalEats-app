import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cartFlightDisplacement, scheduleCartFlight, cartFlightEaseOut, cartFlightKeyframes, CART_FLIGHT_DURATION_MS} from "../src/utils/cartFlyMotion.ts";

const price=readFileSync(new URL("../src/components/AnimatedPrice.tsx",import.meta.url),"utf8");
const modal=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const cart=readFileSync(new URL("../src/components/CartDrawer.tsx",import.meta.url),"utf8");
const target=readFileSync(new URL("../src/components/FloatingCartButton.tsx",import.meta.url),"utf8");

test("prices count up with a smooth ease-out and honor reduced motion",()=>{
 assert.match(price,/useState\(\(\) => reducedMotion \? value : 0\)/);
 assert.match(price,/duration: 0\.82/);
 assert.match(price,/ease: \[0\.16, 1, 0\.3, 1\]/);
 assert.match(price,/if \(reducedMotion\)/);
 assert.match(price,/aria-label=/);
});
test("cart flight geometry ends at the real cart target",()=>{
 const result=cartFlightDisplacement({left:100,top:200,width:80,height:50},{left:400,top:700,width:40,height:40});
 assert.deepEqual(result,{start:{x:140,y:225},dx:280,dy:495});
 assert.doesNotThrow(()=>scheduleCartFlight(undefined));
 assert.match(target,/data-localeats-cart-target="true"/);
 assert.equal(CART_FLIGHT_DURATION_MS,1050);
 assert.equal(cartFlightEaseOut(0),0);
 assert.equal(cartFlightEaseOut(1),1);
 assert.ok(cartFlightEaseOut(0.25)-cartFlightEaseOut(0) > cartFlightEaseOut(0.75)-cartFlightEaseOut(0.5),"flight begins faster than it finishes");
 const keyframes=cartFlightKeyframes(result.dx,result.dy);
 assert.equal(keyframes.length,41);
 assert.equal(keyframes[0].offset,0);
 assert.equal(keyframes.at(-1).offset,1);
 assert.equal(keyframes.at(-1).opacity,0);
 assert.match(String(keyframes.at(-1).transform),/translate3d\(280px,495px,0\)/);
});
test("cart flight is triggered only from confirmed add-to-cart paths",()=>{
 assert.match(modal,/setCart\(\[buildCartItemNode\(quantity\)\]\);\s*scheduleCartFlight/);
 assert.match(modal,/scheduleCartFlight\(sourceRect, immutableBaseItem\.image\);\s*\/\/ Notification removed/);
 assert.match(modal,/if \(matchingRow && matchingRow\.quantity >= MAX_PICKUP_ITEM_QUANTITY\) return;/);
 assert.match(modal,/if \(!getShopStatus\(shop\)\.isOpen\)/);
 assert.match(modal,/sourceRect\?: CartFlightRect/);
});
test("quantity pop and cart amounts are visual only; checkout still read-only",()=>{
 assert.match(modal,/key=\{quantity\}/);
 assert.match(modal,/transition=\{\{ duration: 0\.28, ease: \[0\.16, 1, 0\.3, 1\] \}\}/);
 assert.match(modal,/initial=\{reducedMotion \? false/);
 assert.match(cart,/AnimatedPrice value=\{subtotal\}/);
 assert.match(cart,/AnimatedPrice value=\{estimatedTotal\}/);
 assert.match(modal,/pickupOrderingEnabled\(\)/);
 assert.doesNotMatch(cart,/fetch\(|submitPickupQuote\(/);
});
