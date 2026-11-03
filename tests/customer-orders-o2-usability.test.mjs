import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {confirmedPickupDisplayStatus,confirmedPickupTotal,confirmedPickupPayment} from "../src/services/customerOrdersPolicy.ts";

const src=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const history=src("../src/screens/OrderHistoryScreen.tsx");
const tracking=src("../src/screens/CustomerPickupTrackingScreen.tsx");

test("O2 history renders item rows and stacked accessible controls on narrow phones",()=>{
 assert.match(history,/<ul aria-label="Ordered items"/);
 assert.match(history,/min-w-0 break-words/);
 assert.match(history,/flex flex-col sm:flex-row sm:items-center sm:justify-between/);
 assert.match(history,/w-full sm:w-auto min-h-11/);
 assert.match(history,/View Status/);
 assert.match(history,/Current Menu/);
 assert.match(history,/disabled=\{!shop\}/);
});

test("O2 history progress uses only valid confirmed steps, never invents progress for cancellations or unknown statuses",()=>{
 assert.match(history,/\{status\.step>=0 && \(/);
 assert.match(history,/aria-label="Confirmed pickup progress"/);
 assert.match(history,/aria-current=\{index===status\.step\?"step":undefined\}/);
 assert.match(history,/grid grid-cols-4/);
 assert.equal(confirmedPickupDisplayStatus("pending").step,0);
 assert.equal(confirmedPickupDisplayStatus("ready").step,2);
 assert.equal(confirmedPickupDisplayStatus("cancelled").step,-1);
 assert.equal(confirmedPickupDisplayStatus("unrecognized").step,-1);
});

test("O2 tracking has confirmed-state color distinctions and a labeled accessible timeline",()=>{
 assert.match(tracking,/statusToneClasses\[state\.tone\]/);
 assert.match(tracking,/aria-label="Confirmed pickup progress"/);
 assert.match(tracking,/aria-current=\{current\?"step":undefined\}/);
 assert.match(tracking,/\{state\?\.label|\{state\.label/);
 assert.doesNotMatch(tracking,/setLocalOrders|createPickup\(|cancelPickup\(/);
});

test("O2 payment information and amount remain server-confirmed, without historical price fallback",()=>{
 assert.match(history,/>Payment<\/p>/);
 assert.match(tracking,/>Payment<\/p>/);
 assert.match(history,/confirmedPickupTotal\(order\)/);
 assert.match(tracking,/confirmedPickupTotal\(chosen\)/);
 assert.match(history,/confirmedPickupPayment\(order\)/);
 assert.match(tracking,/confirmedPickupPayment\(chosen\)/);
 assert.equal(confirmedPickupTotal({total_price:79.5}),79.5);
 assert.equal(confirmedPickupTotal({total_price:undefined,total:100}),null);
 assert.equal(confirmedPickupPayment({payment_status:"paid"}),"Payment confirmed by shop");
 assert.doesNotMatch(history,/addToCart\(|setCart\(|from\("orders"\)/);
 assert.doesNotMatch(tracking,/supabase|firebase|localStorage/);
});
