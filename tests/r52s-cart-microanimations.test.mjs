import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cartFlightDisplacement, scheduleCartFlight} from "../src/utils/cartFlyMotion.ts";

const price=readFileSync(new URL("../src/components/AnimatedPrice.tsx",import.meta.url),"utf8");
const modal=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const cart=readFileSync(new URL("../src/components/CartDrawer.tsx",import.meta.url),"utf8");
const target=readFileSync(new URL("../src/components/FloatingCartButton.tsx",import.meta.url),"utf8");

test("animated prices start at zero, settle quickly and allow reduced motion",()=>{
 assert.match(price,/useState\(\(\) => reducedMotion \? value : 0\)/);
 assert.match(price,/duration: 0\.28/);
 assert.match(price,/if \(reducedMotion\)/);
 assert.match(price,/aria-label=/);
});
test("cart flight geometry ends at the real cart target",()=>{
 const result=cartFlightDisplacement({left:100,top:200,width:80,height:50},{left:400,top:700,width:40,height:40});
 assert.deepEqual(result,{start:{x:140,y:225},dx:280,dy:495});
 assert.doesNotThrow(()=>scheduleCartFlight(undefined));
 assert.match(target,/data-localeats-cart-target="true"/);
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
 assert.match(modal,/initial=\{reducedMotion \? false/);
 assert.match(cart,/AnimatedPrice value=\{subtotal\}/);
 assert.match(cart,/AnimatedPrice value=\{estimatedTotal\}/);
 assert.match(modal,/pickupOrderingEnabled\(\)/);
 assert.doesNotMatch(cart,/fetch\(|submitPickupQuote\(/);
});
