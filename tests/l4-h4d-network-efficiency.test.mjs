import test from "node:test";
import assert from "node:assert/strict";
import {createReadBackoff,retryAfterMs} from "../src/services/readBackoff.ts";
test("H4D Retry-After seconds, HTTP date, malformed value and minimum delay",()=>{
 const now=Date.UTC(2026,10,25,0,0,0);
 assert.equal(retryAfterMs("90",now),90000);
 assert.equal(retryAfterMs(new Date(now+120000).toUTCString(),now),120000);
 assert.equal(retryAfterMs("bad",now),60000);
 assert.equal(retryAfterMs(null,now),60000);
 assert.equal(retryAfterMs("0",now),1000);
});
test("H4D read cooldown never shortens an existing deadline or affects other scopes",()=>{
 let now=1000;const guard=createReadBackoff(()=>now);
 guard.observe("orders",429,"90");assert.equal(guard.remaining("orders"),90000);
 now+=10000;guard.observe("orders",429,"1");assert.equal(guard.remaining("orders"),80000);
 assert.equal(guard.remaining("shop"),0);guard.observe("shop",503,null);assert.equal(guard.remaining("shop"),0);
 guard.observe("shop",503,"2");assert.equal(guard.remaining("shop"),2000);
 now+=80000;assert.equal(guard.remaining("orders"),0);assert.equal(guard.remaining("shop"),0);
});

import {customerHistoryInterval} from "../src/services/historyPollingPolicy.ts";
import {createPickupApi} from "../src/pickup/client.ts";
test("H4D verified idle Customer schedule reduces reads by 75%; active/unknown/truncated retains 30s",()=>{
 for(const rows of [null,[{status:"pending"}],[{status:"preparing"}],[{status:"ready_for_pickup"}],[{status:"unknown"}],Array.from({length:50},()=>({status:"collected"}))])assert.equal(customerHistoryInterval(rows,"home"),30000);
 for(const screen of ["order-history","order-tracking","checkout","cart"])assert.equal(customerHistoryInterval([],screen),30000);
 assert.equal(customerHistoryInterval([{status:"collected"}],"home"),120000);
 const count=interval=>2*Math.floor(3600000/interval);
 console.log("H4D_IDLE_SCHEDULE "+JSON.stringify({baseline:count(30000),candidate:count(customerHistoryInterval([],"home")),active:count(customerHistoryInterval([{status:"pending"}],"home"))}));
});
test("H4D actual Customer transport prevents repeated rate-limited GETs without auto-replaying commands",async()=>{
 const paths=[];let tokenCalls=0;
 const api=createPickupApi("https://fixture.invalid",async()=>{tokenCalls++;return "fixture-token";},async(url,options)=>{
  const path=new URL(url).pathname;paths.push([path,options.method]);
  if(path==="/api/v1/orders"&&options.method==="GET")return new Response(JSON.stringify({success:false,code:"RATE_LIMITED"}),{status:429,headers:{"Retry-After":"90"}});
  return new Response(JSON.stringify({success:true,notifications:[],order:{id:"fixture"},replayed:false}));
 });
 await assert.rejects(api.orders(),{status:429});
 await assert.rejects(api.orders(),{status:429});
 assert.equal(paths.length,1);assert.equal(tokenCalls,1);
 await api.notifications();assert.equal(paths.length,2);
 await api.create({});assert.equal(paths.length,3);assert.equal(paths.at(-1)[1],"POST");
});
