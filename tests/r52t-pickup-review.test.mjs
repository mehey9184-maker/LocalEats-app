import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const originalCart=readFileSync(new URL("../src/components/CartDrawer.tsx",import.meta.url),"utf8");
const modal=readFileSync(new URL("../src/components/PickupReviewModal.tsx",import.meta.url),"utf8");
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");

const result=await build({entryPoints:["src/utils/pickupReview.ts"],write:false,bundle:true,platform:"node",format:"esm"});
const moduleText=Buffer.from(result.outputFiles[0].text).toString("base64");
const { reviewPickupCart, formatReviewRands }=await import("data:text/javascript;base64,"+moduleText);

const shop={id:"shop-staging",name:"STAGING TEST — Open Kota",isOpen:true,
  menu:[{id:"kota",name:"My Kota",price:25,image:"",displayPrice:"R25.00"}]};
const kota={id:"kota",shopId:"shop-staging",name:"My Kota",price:25,quantity:3,image:"",specialInstructions:"",selectedCustomizations:[]};

test("R5.2T: three kotas show R75 while corrected single kota shows R25",()=>{
  const three=reviewPickupCart([kota],shop);
  assert.equal(three.valid,true);
  assert.equal(three.count,3);
  assert.equal(three.totalMinor,7500);
  assert.equal(three.items[0].lineMinor,7500);
  assert.equal(formatReviewRands(three.totalMinor),"R75.00");
  const one=reviewPickupCart([{...kota,quantity:1}],shop);
  assert.equal(one.valid,true);
  assert.equal(one.count,1);
  assert.equal(one.totalMinor,2500);
  assert.equal(formatReviewRands(one.totalMinor),"R25.00");
});
test("R5.2T: reviews block stale prices, unknown items, invalid quantities, extras, cross-shop and closed shops",()=>{
  const checks=[
    [[{...kota,price:30}],shop],
    [[{...kota,id:"missing"}],shop],
    [[{...kota,quantity:0}],shop],
    [[{...kota,quantity:21}],shop],
    [[{...kota,selectedCustomizations:[{name:"Extra",price:5}]}],shop],
    [[{...kota,shopId:"other-shop"}],shop],
    [[kota],{...shop,isOpen:false}],
    [[],shop],
    [[kota],undefined],
  ];
  for(const [cart,active] of checks){
    assert.equal(reviewPickupCart(cart,active).valid,false,JSON.stringify(cart));
  }
});
test("R5.2T: staging cart alone opens review; default checkout remains intact",()=>{
  assert.match(originalCart,/VITE_FIREBASE_CONFIG_SOURCE === "environment"/);
  assert.match(originalCart,/VITE_PICKUP_ORDERING_ENABLED !== "true"/);
  assert.match(originalCart,/if \(previewReviewOnly\) \{\s*onClose\(\);\s*setIsReviewOpen\(true\);\s*return;/);
  assert.match(originalCart,/onProceedToCheckout\(\)/);
  assert.match(originalCart,/<PickupReviewModal/);
  assert.match(app,/onReturnToCart=\{\(\) => setIsCartDrawerOpen\(true\)\}/);
});
test("R5.2T: timer and skip only unlock confirmation, never submit",()=>{
  assert.match(modal,/const REVIEW_SECONDS = 10/);
  assert.match(modal,/if \(remaining <= 0\) setStage\("confirm"\)/);
  assert.match(modal,/onClick=\{\(\) => setStage\("confirm"\)\}/);
  assert.match(modal,/Skip Countdown/);
  assert.match(modal,/onClick=\{\(\) => setStage\("simulated"\)\}/);
  assert.match(modal,/disabled=\{!summary\.valid\}/);
  assert.doesNotMatch(modal,/submitPickupQuote|createPickupApi|fetch\(|onProceedToCheckout|checkoutAction\(/);
});
test("R5.2T: editing the quantity invalidates prior confirmation, and the preview never claims a real order",()=>{
  assert.match(modal,/\[isOpen, cartFingerprint\]/);
  assert.match(modal,/setStage\("review"\);\s*setSecondsLeft\(REVIEW_SECONDS\);/);
  assert.match(modal,/onChangeQuantity\(item.id, item.shopId, -1/);
  assert.match(modal,/onChangeQuantity\(item.id, item.shopId, 1/);
  assert.match(modal,/You selected \{quantity\} × \{item.name\}, not 1/);
  assert.match(modal,/No order was created/);
  assert.match(modal,/Final live price must be verified by the server/);
  assert.match(modal,/document\.visibilityState !== "hidden"/);
  assert.match(modal,/aria-modal="true"/);
});
