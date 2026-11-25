// Exact baseline code + real pickup transport with injected local auth/fetch/storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const uid='fixture-a',shop='fixture-shop',orderId='fixture-order';
const key='pickup-create:'+uid,cancelKey='pickup-cancel:'+uid+':'+orderId;
const review={intent:{idempotency_key:'12345678-1234-4123-8123-123456789abc',shop_id:shop,payment_method:'cash'},quote:{can_submit:true,total_minor:2500,pricing_fingerprint:'a'.repeat(64)}};
const order={id:orderId,user_id:uid,shop_id:shop,delivery_type:'collection',status:'pending',revision:0,total_price:25,payment_method:'cash'};
const cancelled={...order,status:'cancelled',revision:1};
const ok=(o=order)=>Response.json({success:true,order:o,replayed:true});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
const observe=(id,result)=>console.log('H5B_BASELINE '+JSON.stringify({id,...result}));
async function service(){
 const result=await build({entryPoints:['src/services/customerPickup.ts'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',define:{'import.meta.env':JSON.stringify({VITE_PICKUP_ORDERING_ENABLED:'true',VITE_LOCALEATS_API_URL:'http://127.0.0.1:1',PROD:false})},plugins:[{name:'isolated-auth',setup(b){
 b.onLoad({filter:/[\\/]lib[\\/]firebase\.ts$/},()=>({contents:'export const auth={get currentUser(){return globalThis.h5bUser}};',loader:'js'}));
 }}]});const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);return mod.exports;
}
function setup(transport,options={}){
 const store=new Map();let requests=[];
 globalThis.h5bUser={uid,getIdToken:async()=>uid};
 globalThis.sessionStorage={getItem:k=>{if(options.denyRead)throw Error('storage denied');return store.get(k)??null;},setItem:(k,v)=>{if(options.denyWrite)throw Error('storage denied');store.set(k,v);},removeItem:k=>store.delete(k)};
 globalThis.fetch=async(path,init)=>{requests.push({path,method:init.method,body:JSON.parse(init.body),auth:init.headers.Authorization,signal:!!init.signal});return transport(path,init);};
 return {store,requests};
}
test('R01 create transport stalls: actual pending state and signal observation',async()=>{
 const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
 let settled=false;const p=api.submitPickupQuote(review).then(()=>{settled=true;},()=>{settled=true;});
 await tick();assert.equal(requests.length,1);assert.ok(store.has(key));
 await new Promise(r=>setTimeout(r,35));
 observe('R01',{settledAfter35ms:settled,signal:requests[0].signal,pendingRetained:store.has(key),note:'short observation plus exact transport signal; no 15s deadline claim from 35ms alone'});
 d.resolve(ok());await p;
});
test('R01 exact explicit replay after simulated committed response loss',async()=>{
 const ledger=new Map();let first=true;
 const {store,requests}=setup((_p,init)=>{const payload=JSON.parse(init.body);const k=payload.idempotency_key;if(!ledger.has(k))ledger.set(k,order);if(first){first=false;throw Error('response lost after fixture commit');}return ok(ledger.get(k));}),api=await service();
 await assert.rejects(api.submitPickupQuote(review));assert.ok(store.has(key));assert.equal(ledger.size,1);await tick();assert.equal(requests.length,1);
 assert.equal((await api.submitPickupQuote(null)).id,orderId);assert.deepEqual(requests[0].body,requests[1].body);assert.equal(ledger.size,1);assert.equal(store.size,0);
 observe('R01_REPLAY',{requests:2,fixtureCommittedOrders:ledger.size,exactPayload:true,automaticRetry:false});
});
test('R02 late create after account switch and A-B-A',async()=>{
 for(const roundTrip of [false,true]){
  const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
  const p=api.submitPickupQuote(review).then(()=>true,()=>false);await tick();assert.equal(requests.length,1);
  const a=globalThis.h5bUser;globalThis.h5bUser={uid:'fixture-b',getIdToken:async()=> 'fixture-b'};await tick();
  if(roundTrip)globalThis.h5bUser={...a};
  d.resolve(ok());const accepted=await p;
  observe(roundTrip?'R02_ABA':'R02_AB',{accepted,pendingRetained:store.has(key),requests:requests.length});
 }
});
test('R02 cancellation late confirmation after account switch',async()=>{
 const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
 const p=api.cancelCustomerPickup(order,'fixture reason').then(()=>true,()=>false);await tick();assert.equal(requests.length,1);
 globalThis.h5bUser={uid:'fixture-b',getIdToken:async()=> 'fixture-b'};d.resolve(ok(cancelled));
 observe('R02_CANCEL',{accepted:await p,pendingRetained:store.has(cancelKey)});
});
test('R03 storage denied or corrupt: no transport',async()=>{
 for(const mode of ['denyRead','denyWrite','corrupt']){
  const {store,requests}=setup(()=>{throw Error('unexpected transport')},{[mode]:true}),api=await service();
  if(mode==='corrupt'){store.set(key,'{bad');store.set(cancelKey,'{bad');}
  await assert.rejects(api.submitPickupQuote(mode==='corrupt'?null:review));await assert.rejects(api.cancelCustomerPickup(order,'fixture reason'));assert.equal(requests.length,0);
  observe('R03_'+mode,{requests:requests.length,createRecord:store.has(key),cancelRecord:store.has(cancelKey)});
 }
});
test('R03 simultaneous identical submits',async()=>{
 const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
 const a=api.submitPickupQuote(review),b=api.submitPickupQuote(review);await tick();const transmitted=requests.length;
 d.resolve(ok());await Promise.allSettled([a,b]);observe('R03_CONCURRENT',{transmitted,pendingRetained:store.has(key)});
});
test('R04 malformed 409 response after simulated commit retains uncertain intent?',async()=>{
 for(const action of ['create','cancel']){
  const {store,requests}=setup(()=>new Response('<html>gateway</html>',{status:409,headers:{'Content-Type':'text/html'}})),api=await service();
  await assert.rejects(action==='create'?api.submitPickupQuote(review):api.cancelCustomerPickup(order,'fixture reason'));
  assert.equal(requests.length,1);observe('R04_'+action,{pendingRetained:store.has(action==='create'?key:cancelKey),status:409,malformed:true});
 }
});
test('R04 structured conflict versus ambiguous 503',async()=>{
 for(const [status,code] of [[409,'PRICE_CHANGED'],[503,'PICKUP_PERSISTENCE_UNAVAILABLE'],[401,'UNAUTHORIZED'],[429,'RATE_LIMITED']]){
  const {store,requests}=setup(()=>Response.json({success:false,code,error:code},{status})),api=await service();
  await assert.rejects(api.submitPickupQuote(review));assert.equal(requests.length,1);
  observe('R04_'+status,{code,pendingRetained:store.has(key)});
 }
});
