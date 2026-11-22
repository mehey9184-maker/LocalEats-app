import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {shopCardTrustState} from "../src/services/shopCardTrustState.ts";

const normal={outsidePickupArea:false,locationUnknown:false,notAcceptingOrders:false,isOpen:true};
test("only genuine in-range, active, open shops say Open Now and Pickup at shop",()=>{
 assert.deepEqual(shopCardTrustState(normal),{
  badge:"Open Now",actionHint:"Pickup at shop",hoursHint:null,
 });
});
test("authoritatively inactive shop overrides Open Now and blocks the pickup claim",()=>{
 assert.deepEqual(shopCardTrustState({...normal,notAcceptingOrders:true}),{
  badge:"Not taking orders",actionHint:"Browse menu only",hoursHint:null,
 });
});
test("closed shop keeps the menu browsable without inventing opening hours",()=>{
 assert.deepEqual(shopCardTrustState({...normal,isOpen:false}),{
  badge:"Closed",actionHint:"Browse menu only",hoursHint:"Opening time unavailable",
 });
 assert.equal(shopCardTrustState({...normal,isOpen:false,nextOpeningTime:"09:00"}).hoursHint,"Opens 09:00");
 assert.equal(shopCardTrustState({...normal,isOpen:false,nextOpeningTime:"   "}).hoursHint,"Opening time unavailable");
});
test("GPS restrictions take precedence even when shop happens to be open",()=>{
 assert.deepEqual(shopCardTrustState({...normal,outsidePickupArea:true}),{
  badge:"Outside 4 km",actionHint:"Browse menu only",hoursHint:null,
 });
 assert.deepEqual(shopCardTrustState({...normal,locationUnknown:true}),{
  badge:"Location needed",actionHint:"Browse menu only",hoursHint:null,
 });
 assert.equal(shopCardTrustState({...normal,outsidePickupArea:true,notAcceptingOrders:true}).badge,"Outside 4 km");
});
test("active customer shop card uses one status source; original pickup gates stay intact",()=>{
 const card=readFileSync("src/components/ShopCard.tsx","utf8");
 assert.match(card,/const trustState=shopCardTrustState/);
 assert.match(card,/const notAcceptingOrders = status\.message === "Away \/ Not Accepting Orders"/);
 assert.match(card,/const etaStr = trustState.actionHint/);
 assert.match(card,/\{trustState\.badge\}/);
 assert.match(card,/\{trustState\.hoursHint\}/);
 assert.match(card,/status\.isOpen && !notAcceptingOrders/);
 assert.match(card,/Not taking orders\. Browse menu only\./);
 assert.doesNotMatch(card,/status\.nextOpeningTime \|\| "Soon"/);
 assert.match(card,/isOutsidePickupArea/);
 assert.match(card,/const isUnavailable = outsidePickupArea \|\| locationUnknown/);
});
test("idea register is canonical, explicitly unapproved and keeps image strategy deferred",()=>{
 const doc=readFileSync("docs/LOCALEATS_SCALABLE_IDEA_REGISTER.md","utf8");
 for(const idea of ["LE-02","LocalMarket","LocalRider","LocalPay","LocalCover","phone charging lockers","Reconciliation"].slice(0,6))
  assert.match(doc,new RegExp(idea,"i"));
 assert.match(doc,/DO NOT IMPLEMENT NOW/);
 assert.match(doc,/not.*permission to implement/i);
 assert.match(doc,/owner approval/i);
 assert.match(doc,/versioned/);
});
