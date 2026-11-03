import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 confirmedCustomerPickupOrders,confirmedPickupDisplayStatus,
 confirmedPickupTotal,confirmedPickupPayment,confirmedPickupShopName,
} from "../src/services/customerOrdersPolicy.ts";

const src=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const app=src("../src/App.tsx");
const history=src("../src/screens/OrderHistoryScreen.tsx");
const safeTracking=src("../src/screens/CustomerPickupTrackingScreen.tsx");
const legacyTracking=src("../src/screens/OrderTrackingScreen.tsx");
const now="2026-11-03T12:00:00.000Z";
const order=(data={})=>({id:"pickup-1",user_id:"ownerA",shop_id:"shop1",delivery_type:"collection",status:"pending",
 total_price:35,payment_method:"cash",payment_status:"unpaid",created_at:now,items:[
  {menu_item_id:"food-1",name:"Kota",quantity:1,unit_price:35,line_total:35},
 ],...data});

test("Order History shows only confirmed collection orders owned by current Firebase account",()=>{
 const all=[order({id:"x"}),order({id:"different",user_id:"ownerB"}),
  order({id:"delivery",delivery_type:"delivery"}),order({id:"x",total_price:999}),
  order({id:"older",created_at:"2026-09-01T00:00:00.000Z"})];
 assert.deepEqual(confirmedCustomerPickupOrders(all,"ownerA").map(o=>o.id),["x","older"]);
 assert.equal(confirmedCustomerPickupOrders(all,"ownerB").length,1);
 assert.deepEqual(confirmedCustomerPickupOrders(all,undefined),[]);
 assert.deepEqual(confirmedCustomerPickupOrders(null,"ownerA"),[]);
 assert.equal(all.length,5);
 assert.match(history,/confirmedCustomerPickupOrders\(pickupOrders,ownerUid\)/);
 assert.doesNotMatch(history,/supabase|from\("orders"\)|localStorage|safeLocalStorageGet/);
 assert.match(app,/data\.orders\.some\(o=>/);
 assert.match(app,/o\.user_id!==uid/);
 assert.match(app,/firebaseAuth\.currentUser\?\.uid!==uid/);
 assert.match(app,/setOrders\(\[\]\);setOrdersLoadState\(\{uid,status:"loading"\}\)/);
 assert.match(app,/setOrdersLoadState\(\{uid,status:"error"\}\)/);
});

test("Pickup statuses reflect only actual persisted status values, including Collected",()=>{
 const stages=[
  ["pending","Pending shop acceptance",0,false],
  ["accepted","Preparing",1,false],
  ["preparing","Preparing",1,false],
  ["ready_for_pickup","Ready for collection",2,false],
  ["ready","Ready for collection",2,false],
  ["collected","Collected",3,true],
  ["completed","Collected",3,true],
  ["cancelled","Cancelled",-1,true],
  ["rejected","Cancelled",-1,true],
  ["invented","Status unavailable",-1,false],
 ];
 for(const [input,label,step,terminal] of stages)assert.deepEqual(
  (({label,step,terminal})=>({label,step,terminal}))(confirmedPickupDisplayStatus(input)),
  {label,step,terminal});
 assert.match(safeTracking,/stages\.map/);
 assert.match(safeTracking,/aria-current=\{current\?"step":undefined\}/);
 assert.doesNotMatch(safeTracking,/setLocalOrders|status:\s*"cancelled"/);
});

test("Payment and amounts never substitute historical or missing prices as a confirmation",()=>{
 assert.equal(confirmedPickupTotal(order()),35);
 assert.equal(confirmedPickupTotal(order({total_price:NaN,total:40,price:20})),null);
 assert.equal(confirmedPickupTotal(order({total_price:undefined,total_amount:90})),null);
 assert.equal(confirmedPickupTotal(order({total_price:-2})),null);
 assert.equal(confirmedPickupPayment(order()),"Cash payable at the shop");
 assert.equal(confirmedPickupPayment(order({payment_method:"card_machine"})),"Card payable at the shop");
 assert.equal(confirmedPickupPayment(order({payment_method:"other"})),"Payment method unavailable — confirm with shop");
 assert.equal(confirmedPickupPayment(order({payment_status:"paid"})),"Payment confirmed by shop");
 assert.equal(confirmedPickupPayment(order({payment_status:undefined})),"Payment status unavailable — confirm with shop");
 assert.equal(confirmedPickupShopName(order(),[{id:"shop1",name:"Shop One"}]),"Shop One");
 assert.equal(confirmedPickupShopName(order(),[]),"Shop information unavailable");
 assert.match(history,/confirmedPickupTotal\(order\)/);
 assert.match(safeTracking,/confirmedPickupTotal\(chosen\)/);
 assert.doesNotMatch(history,/total_amount\s*\?\?|total_price \?\? order.total|R0\.00|Pay R 0\.00/);
});

test("Order Again only browses current catalog menu, never copies historical items or prices into cart",()=>{
 assert.match(history,/onOpenShop\(shop\.id\)/);
 assert.match(history,/Current Menu/);
 assert.match(history,/disabled=\{!shop\}/);
 assert.doesNotMatch(history,/addToCart\(|setCart\(|handleReorder\(|order\.items\.forEach/);
 assert.doesNotMatch(safeTracking,/addToCart\(|setCart\(|createPickup\(|cancelPickup\(|fetch\(/);
 assert.match(safeTracking,/onOpenShop\(shop\.id\)/);
 assert.match(app,/onOpenShop=\{id=>\{setSelectedStoreId\(id\);setCurrentScreen\("store-info"\);\}\}/);
});

test("Tracked order is selected by account/ID and cannot originate from a local offline queue",()=>{
 assert.match(safeTracking,/confirmedCustomerPickupOrders\(orders,ownerUid\)/);
 assert.match(safeTracking,/confirmed\.find\(order=>order\.id===selectedOrderId\)/);
 assert.match(app,/setSelectedTrackingOrderId\(id\)/);
 assert.match(app,/onOpenTracking=\{\(orderId\) => \{/);
 assert.match(app,/setSelectedTrackingOrderId\(orderId\)/);
 assert.match(app,/import \{CustomerPickupTrackingScreen\}/);
 assert.doesNotMatch(app,/import \{ OrderTrackingScreen \}/);
 assert.match(app,/<CustomerPickupTrackingScreen/);
 assert.doesNotMatch(safeTracking,/supabase|firebase|localStorage|cached_orders|offline_orders_queue|pending_cancellation|DualSyncEngine/);
 assert.match(legacyTracking,/pending_cancellation/); // legacy source exists but is no longer mounted
});

test("Refresh uses current authenticated API and shows error/loading rather than fabricated success",()=>{
 assert.match(app,/customerPickupApi\.orders\(\)/);
 assert.match(app,/localeats-orders-refresh/);
 assert.match(app,/setOrdersLoadState\(\{uid,status:"ready"\}\)/);
 assert.match(history,/loadState==="error"/);
 assert.match(history,/loadState==="loading"/);
 assert.match(safeTracking,/loadState==="error"/);
 assert.match(safeTracking,/loadState==="loading"/);
 assert.match(history,/onRefresh/);
 assert.match(safeTracking,/onRefresh/);
 assert.doesNotMatch(history,/Synced|successfully placed|Track Live/);
});
