import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {P7_MY_KOTA_ID,p7PreviewEnabled,previewMyKotaShop,previewDisplayShop} from "../src/services/p7PreviewShop.ts";

const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=file("../src/App.tsx"),checkout=file("../src/screens/CheckoutScreen.tsx");
const realShop={
 id:P7_MY_KOTA_ID,name:"My-Kota",description:"i sell food",
 location:"Katlego Street, Ivory Park",category:"Street Food",
 latitude:-25.9830322643032,longitude:28.2074831464466,
 lat:-25.9830322643032,lng:28.2074831464466,
 logo_url:"https://example.test/shop-logo.png",rating:4.8,
 is_active:true,stored_is_active:true,effective_is_active:true,
 opening_time:"08:00",closing_time:"22:00",pickup_payment_methods:["cash","card_machine"],
};
const menu=[{id:"real-menu-item",shop_id:P7_MY_KOTA_ID,name:"Cheese Kota",price:25,
 image_url:"https://example.test/menu.png",is_available:true,category:"Main Course"}];

test("P7 only activates the simulation on explicitly enabled LocalEats Vercel Preview origins",()=>{
 const origin="project-x7cvt-git-repair-p7-demo-mehey9184-makers-projects.vercel.app";
 assert.equal(p7PreviewEnabled("true",origin),true);
 assert.equal(p7PreviewEnabled("false",origin),false);
 assert.equal(p7PreviewEnabled(undefined,origin),false);
 assert.equal(p7PreviewEnabled("true","localeatssa.co.za"),false);
 assert.equal(p7PreviewEnabled("true","www.localeatssa.co.za"),false);
 assert.equal(p7PreviewEnabled("true","project-x7cvt-repaired-mehey9184-makers-projects.vercel.app.evil.test"),false);
 assert.equal(p7PreviewEnabled("true","evil-project-x7cvt-abc-mehey9184-makers-projects.vercel.app"),false);
});

test("P7 uses only real My-Kota catalog and menu fields without mutating actual location",()=>{
 const shop=previewMyKotaShop(realShop,menu);
 assert.ok(shop);
 assert.equal(shop.id,P7_MY_KOTA_ID);
 assert.equal(shop.name,"My-Kota");
 assert.equal(shop.latitude,realShop.latitude);
 assert.equal(shop.longitude,realShop.longitude);
 assert.equal(shop.address,realShop.location);
 assert.equal(shop.menu.length,1);
 assert.equal(shop.menu[0].price,25);
 assert.equal(shop.menu[0].is_available,true);
 assert.equal(shop.is_test_store,true);
 assert.deepEqual(shop.pickup_payment_methods,["cash","card_machine"]);
 assert.equal(shop.distance,undefined);
 assert.equal(shop.opening_time,"08:00");
 assert.equal(shop.closing_time,"22:00");
});

test("P7 cannot invent a shop, invent prices, or show inactive/forged catalog entries",()=>{
 const bad=[
   {...realShop,id:"shop-other"},
   {...realShop,effective_is_active:false},
   {...realShop,stored_is_active:false},
   {...realShop,is_active:false},
   {...realShop,latitude:100},
   {...realShop,location:"Elsewhere"},
 ];
 for(const row of bad)assert.equal(previewMyKotaShop(row,menu),null);
 assert.equal(previewMyKotaShop(realShop,[{...menu[0],price:-1}]),null);
 assert.equal(previewMyKotaShop(realShop,[{...menu[0],price:"25"}]),null);
 assert.equal(previewMyKotaShop(realShop,[{...menu[0],shop_id:"shop-other"}]),null);
 assert.equal(previewMyKotaShop(realShop,[{...menu[0],is_available:false}]),null);
 assert.equal(previewMyKotaShop(realShop,[]),null);
});

test("P7 does not duplicate a verified in-range shop",()=>{
 const virtual=previewMyKotaShop(realShop,menu);
 assert.equal(previewDisplayShop([],virtual).length,1);
 assert.equal(previewDisplayShop([{...virtual,is_test_store:false}],virtual).length,1);
 assert.equal(previewDisplayShop([],null).length,0);
});

test("P7 preserves ORIGINAL ShopCard and original StoreInfo/Cart UI",()=>{
 const card=file("../src/components/ShopCard.tsx");
 assert.match(app,/import \{ ShopCard, MenuItemSkeleton, MenuItemCard \}/);
 assert.match(app,/<ShopCard/);
 assert.match(app,/previewDisplayShop\(visibleShops,p7TestShop\)/);
 assert.match(app,/shops=\{displayShops\}/);
 assert.match(app,/shop=\{displayShops\.find/);
 assert.match(app,/readOnlyClosed=\{!displayShops\.some/);
 assert.match(app,/customerPickupApi\.menu\(P7_MY_KOTA_ID\)/);
 assert.match(app,/if\(!p7TestEnabled\)\{/);
 assert.match(app,/\},\[p7TestEnabled\]\);/);
 assert.match(app,/No real order can be submitted/);
 assert.match(app,/!pickupOrderingEnabled\(\)/);
 assert.doesNotMatch(app,/Pilot shops in Tembisa & Ivory Park/);
 assert.match(card,/export const ShopCard = memo/);
 assert.doesNotMatch(card,/previewMyKotaShop|is_test_store/);
});

test("P7 checkout simulation never invokes API order creation or queues a fake success",()=>{
 assert.match(checkout,/isP7TestCheckout/);
 assert.match(checkout,/const isP7TestCheckout=p7PreviewEnabled\(/);
 assert.match(checkout,/Simulate test checkout · no order/);
 assert.match(checkout,/Test flow completed\. Nothing was submitted/);
 assert.match(checkout,/if\(isP7TestCheckout\)\{/);
 assert.match(checkout,/setP7TestCompleted\(true\)/);
 assert.match(checkout,/no real order, payment or merchant notification/);
 assert.match(file("../src/services/customerPickup.ts"),/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
 assert.match(app,/readOnlyClosed=\{!displayShops\.some/);
});
