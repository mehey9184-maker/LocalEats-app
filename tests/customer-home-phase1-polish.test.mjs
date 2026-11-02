import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {homeRating,homeReviewCount,homeDistance,homeDeliveryEta,homeReorderMenuItem} from "../src/services/homeTrustPolicy.ts";

const shop={id:"my-kota",name:"My-Kota",rating:0,reviewCount:0,distance:3.6,delivery_eta:"",
 is_active:true,isOpen:true,menu:[{id:"kota1",name:"Kota",price:25,is_available:true}]};

test("Home never fabricates rating, reviews or distance",()=>{
 assert.equal(homeRating(shop),null);
 assert.equal(homeRating({...shop,rating:4.8}),4.8);
 assert.equal(homeRating({...shop,rating:6}),null);
 assert.equal(homeRating({...shop,rating:NaN}),null);
 assert.equal(homeReviewCount(shop),null);
 assert.equal(homeReviewCount({...shop,reviewCount:24}),24);
 assert.equal(homeReviewCount({...shop,reviewCount:-2}),null);
 assert.equal(homeDistance(shop),"3.6 km");
 assert.equal(homeDistance({...shop,distance:undefined}),null);
 assert.equal(homeDistance({...shop,distance:8}),null);
 assert.equal(homeDistance({...shop,distance:NaN}),null);
});
test("Home does not invent a delivery estimate",()=>{
 assert.equal(homeDeliveryEta(shop),null);
 assert.equal(homeDeliveryEta({...shop,delivery_eta:"20-35 min"}),"20-35 min");
 assert.equal(homeDeliveryEta({...shop,delivery_eta:"soon"}),null);
});
test("reordering takes current validated menu price, never historical prices",()=>{
 const item=homeReorderMenuItem(shop,"Kota","old-order-variant");
 assert.equal(item?.price,25);
 assert.equal(homeReorderMenuItem({...shop,is_active:false},"Kota","kota1"),null);
 assert.equal(homeReorderMenuItem({...shop,isOpen:false},"Kota","kota1"),null);
 assert.equal(homeReorderMenuItem({...shop,menu:[]},"Kota","kota1"),null);
 assert.equal(homeReorderMenuItem({...shop,menu:[{...shop.menu[0],is_available:false}]},"Kota","kota1"),null);
 assert.equal(homeReorderMenuItem({...shop,menu:[{...shop.menu[0],price:Infinity}]},"Kota","kota1"),null);
 assert.equal(homeReorderMenuItem(undefined,"Kota","kota1"),null);
});
test("Home copy describes pickup and guards Order Again at click time",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.match(app,/pickupOrderingEnabled\(\) \? "Browse local food shops near "/);
 assert.match(app,/pickupOrderingEnabled\(\) \? "Shops near "/);
 assert.match(app,/homeReorderMenuItem\(shop,entry\.name,entry\.variantId\)/);
 assert.match(app,/homeReorderMenuItem\(currentShop,menuItem\.name,menuItem\.id\)/);
 assert.match(app,/if\(!currentItem \|\| !currentShop \|\| !getShopStatus\(currentShop\)\.isOpen\)/);
 assert.doesNotMatch(app,/const menuItem: MenuItem = originalMenuItem \|\|/);
 assert.doesNotMatch(app,/const \[notificationPermissionStatus/);
 assert.doesNotMatch(app,/Enable Alerts/);
 assert.match(app,/onClick=\{onNotifications\}/);
});
test("original card remains and no fabricated trust metrics or ETA are shown",()=>{
 const card=readFileSync(new URL("../src/components/ShopCard.tsx",import.meta.url),"utf8");
 assert.match(card,/shop-card-/);
 assert.match(card,/readOnlyClosed \? \(shop\.opening_time/);
 assert.match(card,/onStoreInfo\(shop\.id\)/);
 assert.match(card,/homeRating\(shop\)/);
 assert.match(card,/homeReviewCount\(shop\)/);
 assert.match(card,/homeDistance\(shop\)/);
 assert.match(card,/ratingValue !== null/);
 assert.match(card,/distanceStr &&/);
 assert.doesNotMatch(card,/shop\.rating \|\| "4\.8"/);
 assert.doesNotMatch(card,/shop\.reviewCount \|\| 24/);
 assert.doesNotMatch(card,/hashString\(s\.id\)/);
 assert.doesNotMatch(card,/title="Verified Township Kitchen"/);
 assert.doesNotMatch(card,/delivery_eta \|\| "20-35 min"/);
});
