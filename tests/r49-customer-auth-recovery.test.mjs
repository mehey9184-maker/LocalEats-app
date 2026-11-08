/**
 * R4.9 customer pickup transport authentication recovery — test only.
 * Existing UI unchanged. No Firebase/Supabase project, live API, browser,
 * ordering, merchant command or external account is accessed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPickupApi,PickupApiError} from '../src/pickup/client.ts';

const fakeOrder=(uid,id)=>({id,shop_id:'shop-1',user_id:uid,
 status:'ready_for_pickup',delivery_type:'collection',
 delivery_status:'none',payment_status:'unpaid',payment_method:'cash',
 revision:1,customer_name:'Synthetic',phone:'0000000000',total_price:25,
 items:[],created_at:'2026-11-07T10:00:00Z'});
const response=(status,data)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json'}
});
test('R4.9 current pickup client obtains a fresh Firebase token per customer request',async()=>{
 let uid='customer-one';
 const seen=[];
 const transport=async(url,opts)=>{
  seen.push({url,auth:opts.headers.Authorization,cache:opts.cache});
  return response(200,{success:true,orders:[fakeOrder(uid,'order-'+uid)]});
 };
 const api=createPickupApi('http://127.0.0.1:9999',async()=>'signed-token-'+uid,transport);
 const a=await api.orders();
 uid='customer-two';
 const b=await api.orders();
 assert.equal(a.orders[0].user_id,'customer-one');
 assert.equal(b.orders[0].user_id,'customer-two');
 assert.deepEqual(seen.map(x=>x.auth),[
  'Bearer fb-signed-token-customer-one','Bearer fb-signed-token-customer-two'
 ]);
 assert.ok(seen.every(x=>x.cache==='no-store'));
});
test('R4.9 revoked Firebase 401 is rejected, not falsely presented as empty order history',async()=>{
 let calls=0;
 const api=createPickupApi('http://127.0.0.1:9999',
   async()=>'synthetic-revoked-token',
   async()=>{calls++;return response(401,{success:false,error:'Unauthorized'});});
 await assert.rejects(()=>api.orders(),e=>
  e instanceof PickupApiError&&e.status===401&&e.message==='Unauthorized'
 );
 assert.equal(calls,1,'no implicit submission or repeat request');
});
test('R4.9 a new signed-in Firebase token recovers after an API 401 without reusing failed result',async()=>{
 let good=false,reads=0;
 const api=createPickupApi('http://127.0.0.1:9999',
   async()=>good?'new-firebase-token':'expired-firebase-token',
   async(_,opts)=>{
    reads++;
    if(opts.headers.Authorization==='Bearer fb-expired-firebase-token')
      return response(401,{success:false,error:'Unauthorized'});
    return response(200,{success:true,orders:[fakeOrder('new-user','new-order')]});
   });
 await assert.rejects(()=>api.orders(),e=>e.status===401);
 good=true;
 const restored=await api.orders();
 assert.equal(restored.orders.length,1);
 assert.equal(restored.orders[0].user_id,'new-user');
 assert.equal(reads,2);
});
test('R4.9 absent Firebase identity is rejected before any network/database request',async()=>{
 let calls=0;
 const api=createPickupApi('http://127.0.0.1:9999',
   async()=>'',async()=>{calls++;return response(200,{success:true,orders:[]})});
 await assert.rejects(()=>api.orders(),e=>e instanceof PickupApiError&&e.status===401);
 assert.equal(calls,0);
});
test('R4.9 network/auth outage does not turn unknown pickup state into a false successful response',async()=>{
 const api=createPickupApi('http://127.0.0.1:9999',
  async()=>'synthetic-token',async()=>{throw Error('local mocked outage')});
 await assert.rejects(()=>api.orders(),e=>
   e instanceof PickupApiError&&e.code==='CONNECTION_LOST');
});
test('R4.9 source audit: Customer session recovery is Supabase-based; pickup auth is Firebase-based',()=>{
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const pickup=readFileSync(new URL('../src/services/customerPickup.ts',import.meta.url),'utf8');
 const history=readFileSync(new URL('../src/screens/OrderHistoryScreen.tsx',import.meta.url),'utf8');
 assert.match(app,/supabase\.auth\.onAuthStateChange/);
 assert.match(app,/getResilientSession\(3000\)/);
 assert.match(pickup,/auth\.currentUser/);
 assert.match(pickup,/user\.getIdToken\(\)/);
 assert.match(history,/Couldn.t load pickup orders/);
 assert.match(history,/onRetry/);
 // KNOWN STAGING GATE: 401 is currently a generic history error with Retry,
 // not independently verified browser login/redirection recovery.
});
test('R4.9 no real customer order submission or UI/UX change required by these checks',()=>{
 const pickup=readFileSync(new URL('../src/services/customerPickup.ts',import.meta.url),'utf8');
 assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED/);
 assert.match(pickup,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
});
