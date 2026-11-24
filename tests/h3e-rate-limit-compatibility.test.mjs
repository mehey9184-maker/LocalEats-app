import test from "node:test";
import assert from "node:assert/strict";
import {createPickupApi} from "../src/pickup/client.ts";
import {createPickupCancellation,pickupCancellationKey} from "../src/services/pickupCancellation.ts";
const order={id:"synthetic-order",shop_id:"synthetic-shop",user_id:"customer",delivery_type:"collection",status:"pending",revision:0};
test("429 never becomes successful quote, create, or catalog and does not automatically retry",async()=>{
 let requests=0;const api=createPickupApi("https://api.example.invalid",async()=>"synthetic",async()=>{
   requests++;return Response.json({success:false,code:"RATE_LIMITED",error:"Too many requests"},{status:429,headers:{"Retry-After":"12"}});
 });
 for(const action of [()=>api.approvedShops(),()=>api.quote({}),()=>api.create({}),()=>api.notifications()]){
   await assert.rejects(action(),e=>e.status===429 && e.code==="RATE_LIMITED");
 }
 assert.equal(requests,4);
});
test("customer cancellation keeps exact command through a rate-limit response",async()=>{
 const saved=new Map(),requests=[];let limited=true;
 const api=createPickupApi("https://api.example.invalid",async()=>"synthetic",async(_url,init)=>{
  requests.push(JSON.parse(init.body));
  return limited?Response.json({success:false,code:"RATE_LIMITED",error:"Too many requests"},{status:429}):Response.json({success:true,order:{...order,status:"cancelled",revision:1}});
 });
 const cancel=createPickupCancellation({identity:()=>"customer",enabled:()=>true,storage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},command:api.command});
 await assert.rejects(cancel(order,"Synthetic reason"),e=>e.status===429);
 assert.equal(saved.size,1);assert.ok(saved.has(pickupCancellationKey("customer",order.id)));
 limited=false;assert.equal((await cancel(order,"Different text")).status,"cancelled");
 assert.deepEqual(requests[0],requests[1]);assert.equal(saved.size,0);
});
