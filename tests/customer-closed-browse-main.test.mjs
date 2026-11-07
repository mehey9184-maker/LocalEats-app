import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapPickupShop } from "../src/services/pickupMapping.ts";

const baseShop={
  id:"shop-verified",name:"Owner Test Kota",is_active:true,distance_km:1.2,
  lat:-25.9800,lng:28.2000,location:"Ivory Park",logo_url:"",rating:0,
  opening_time:"07:00",closing_time:"21:00"
};
const realMenu={id:"item-1",name:"Kota",price:25,is_available:true};

test("verified closed shop is mapped as CLOSED while keeping real menu and price",()=>{
 const shop=mapPickupShop({...baseShop,is_active:false},[realMenu]);
 assert.equal(shop.id,baseShop.id);
 assert.equal(shop.is_active,false);
 assert.equal(shop.isOpen,false);
 assert.equal(shop.menu.length,1);
 assert.equal(shop.menu[0].name,"Kota");
 assert.equal(shop.menu[0].price,25);
 assert.equal(shop.menu[0].displayPrice,"R 25.00");
});
test("open shop remains open; missing/invalid effective availability fails closed",()=>{
 const open=mapPickupShop(baseShop,[realMenu]);
 assert.equal(open.is_active,true);
 assert.equal(open.isOpen,true);
 for(const invalid of [undefined,null,"true",1,"false"]){
  assert.throws(()=>mapPickupShop({...baseShop,is_active:invalid},[realMenu]),/ineligible pickup shop/);
 }
});
test("approved closed shops are still subject to verified location and menu price checks",()=>{
 for(const distance of [-1,4.01,Infinity,NaN]){
  assert.throws(()=>mapPickupShop({...baseShop,is_active:false,distance_km:distance},[realMenu]),/ineligible pickup shop/);
 }
 assert.throws(()=>mapPickupShop({...baseShop,is_active:false,lat:null,lng:Infinity},[realMenu]),/real location/);
 assert.throws(()=>mapPickupShop({...baseShop,is_active:false},[{...realMenu,price:-1}]),/invalid menu price/);
});
test("original UI is retained, closed cards remain navigable and cart addition remains blocked",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const card=readFileSync(new URL("../src/components/ShopCard.tsx",import.meta.url),"utf8");
 const customer=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
 assert.match(app,/function StoreInfoScreen\(/);
 assert.match(app,/<MenuItemCard\b/);
 assert.match(card,/const isUnavailable = !status\.isOpen/);
 assert.match(card,/if \(!status\.isOpen\) \{\s*showAlert\(/);
 assert.match(app,/onClick=\{onClick\}\s*role="button"\s*tabIndex=\{0\}/);
 assert.match(app,/onConfirm=\{\(quantity, specialInstructions, selectedCustomizations\) => \{\s*if \(!getShopStatus\(shop\)\.isOpen\)/);
 assert.match(customer,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
 assert.doesNotMatch(app,/onClick=\{shop\.isOpen !== false \? onClick : undefined\}/);
});
