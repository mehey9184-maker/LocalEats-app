import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {customerOrderStatusNotices} from "../src/services/customerOrderStatusNotices.ts";
const uid="account-A";
const order=(id,status,extra={})=>({id,status,user_id:uid,delivery_type:"collection",...extra});
test("initial customer API snapshot does not announce old order progress",()=>{
 assert.deepEqual(customerOrderStatusNotices(null,[order("one","preparing")],uid),[]);
});
test("confirmed preparing, completion and cancellations notify exactly once per transition",()=>{
 assert.deepEqual(customerOrderStatusNotices([order("one","pending")],[order("one","preparing")],uid),
  [{orderId:"one",title:"Order accepted",message:"The shop confirmed your order and is preparing it."}]);
 assert.deepEqual(customerOrderStatusNotices([order("one","preparing")],[order("one","preparing")],uid),[]);
 assert.equal(customerOrderStatusNotices([order("one","ready_for_pickup")],[order("one","collected")],uid)[0].title,"Order collected");
 assert.equal(customerOrderStatusNotices([order("one","pending")],[order("one","cancelled")],uid)[0].title,"Order cancelled");
});
test("Ready is reserved for server inbox, no hallucinated order facts or cross-account events",()=>{
 assert.deepEqual(customerOrderStatusNotices([order("one","preparing")],[order("one","ready_for_pickup")],uid),[]);
 assert.deepEqual(customerOrderStatusNotices([],[order("new","preparing")],uid),[]);
 assert.deepEqual(customerOrderStatusNotices([order("one","pending")],[order("one","preparing",{user_id:"account-B"})],uid),[]);
 assert.deepEqual(customerOrderStatusNotices([order("one","pending")],[order("one","preparing",{delivery_type:"delivery"})],uid),[]);
});
test("customer refresh requires server confirmation and ignores out-of-order requests",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.match(app,/const data=await customerPickupApi.orders\(\)/);
 assert.match(app,/request!==latestOrderFetch/);
 assert.match(app,/customerOrderStatusNotices\(previousConfirmedOrders,confirmed,uid\)/);
 assert.match(app,/const inbox=await customerPickupApi.notifications\(\)/);
 assert.match(app,/setInterval\(\(\)=>\{if\(!document.hidden\)refresh\(\);\},15000\)/);
 assert.match(app,/window.addEventListener\("localeats-pickup-ready",onRealtimeWake\)/);
});
