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
const observe=(id,result)=>console.log('H5B_CORRECTED '+JSON.stringify({id,...result}));
async function service(){
 const result=await build({entryPoints:['src/services/customerPickup.ts'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',define:{'import.meta.env':JSON.stringify({VITE_PICKUP_ORDERING_ENABLED:'true',VITE_LOCALEATS_API_URL:'http://127.0.0.1:1',PROD:false})},plugins:[{name:'isolated-auth',setup(b){
 b.onLoad({filter:/[\\/]lib[\\/]firebase\.ts$/},()=>({contents:'export const auth={get currentUser(){return globalThis.h5bUser},beforeAuthStateChanged(fn){globalThis.h5bBefore=fn;return ()=>{}},onAuthStateChanged(fn){globalThis.h5bObserver=fn;return ()=>{}}};',loader:'js'}));
 }}]});const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);return mod.exports;
}
function setup(transport,options={}){
 const store=new Map();let requests=[];
 globalThis.h5bUser={uid,getIdToken:async()=>uid};
 globalThis.sessionStorage={getItem:k=>{if(options.denyRead)throw Error('storage denied');return store.get(k)??null;},setItem:(k,v)=>{if(options.denyWrite)throw Error('storage denied');store.set(k,v);},removeItem:k=>store.delete(k)};
 globalThis.fetch=async(path,init)=>{requests.push({path,method:init.method,body:JSON.parse(init.body),auth:init.headers.Authorization,signal:!!init.signal});return transport(path,init);};
 return {store,requests};
}
function switchUser(next){globalThis.h5bBefore?.(next);globalThis.h5bUser=next;globalThis.h5bObserver?.(next);}
test('R01 actual create deadline aborts transport, retains intent, allows exact explicit replay',async t=>{
 const d=deferred(),{store,requests}=setup((_p,init)=>{assert.ok(init.signal);return d.promise;}),api=await service();
 t.mock.timers.enable({apis:['setTimeout']});
 const p=api.submitPickupQuote(review);const rejection=assert.rejects(p,/outcome is unconfirmed/);
 await tick();assert.equal(requests.length,1);assert.ok(store.has(key));assert.equal(requests[0].signal,true);
 t.mock.timers.tick(15000);await rejection;assert.ok(store.has(key));assert.equal(requests.length,1);
 d.resolve(ok());await tick();assert.ok(store.has(key));observe('R01_DEADLINE',{deadlineMs:15000,requests:1,signal:true,pendingRetained:true});
});
test('R01 token stall aborts before transmission even when token later resolves',async t=>{
 const d=deferred(),{store,requests}=setup(()=>ok()),api=await service();globalThis.h5bUser.getIdToken=()=>d.promise;
 t.mock.timers.enable({apis:['setTimeout']});const p=api.submitPickupQuote(review);const rejected=assert.rejects(p,/outcome is unconfirmed/);
 await tick();t.mock.timers.tick(15000);await rejected;d.resolve(uid);await tick();
 assert.equal(requests.length,0);assert.ok(store.has(key));observe('R01_TOKEN',{transmitted:0,pendingRetained:true});
});
test('R01 simulated committed response loss then exact retry only on explicit action',async()=>{
 const ledger=new Map();let first=true;
 const {store,requests}=setup((_p,init)=>{const payload=JSON.parse(init.body);const k=payload.idempotency_key;if(!ledger.has(k))ledger.set(k,order);if(first){first=false;throw Error('response lost after fixture commit');}return ok(ledger.get(k));}),api=await service();
 await assert.rejects(api.submitPickupQuote(review));assert.ok(store.has(key));assert.equal(ledger.size,1);await tick();assert.equal(requests.length,1);
 assert.equal((await api.submitPickupQuote(null)).id,orderId);assert.deepEqual(requests[0].body,requests[1].body);assert.equal(ledger.size,1);assert.equal(store.size,0);
 observe('R01_REPLAY',{requests:2,fixtureCommittedOrders:ledger.size,exactPayload:true,automaticRetry:false});
});
test('R02 create rejects late responses after A-B or A-B-A including same user object',async()=>{
 for(const roundTrip of [false,true]){
  const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
  const p=api.submitPickupQuote(review);const rejected=assert.rejects(p,/session|submission changed/i);await tick();assert.equal(requests.length,1);
  const a=globalThis.h5bUser;switchUser({uid:'fixture-b',getIdToken:async()=> 'fixture-b'});if(roundTrip)switchUser(a);
  d.resolve(ok());await rejected;assert.ok(store.has(key));observe(roundTrip?'R02_ABA':'R02_AB',{accepted:false,pendingRetained:true,requests:1});
 }
});
test('R02 switch during token acquisition cannot transmit under stale account',async()=>{
 const d=deferred(),{store,requests}=setup(()=>ok()),api=await service();globalThis.h5bUser.getIdToken=()=>d.promise;
 const p=api.submitPickupQuote(review);const rejected=assert.rejects(p,/session/i);await tick();switchUser({uid:'fixture-b',getIdToken:async()=> 'fixture-b'});d.resolve(uid);await rejected;assert.equal(requests.length,0);assert.ok(store.has(key));observe('R02_TOKEN',{transmitted:0,pendingRetained:true});
});
test('R02 cancellation rejects late confirmation after A-B or A-B-A',async()=>{
 for(const roundTrip of [false,true]){
  const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
  const p=api.cancelCustomerPickup(order,'fixture reason');const rejected=assert.rejects(p,/session|cancellation changed/i);await tick();assert.equal(requests.length,1);
  const a=globalThis.h5bUser;switchUser({uid:'fixture-b',getIdToken:async()=> 'fixture-b'});if(roundTrip)switchUser(a);d.resolve(ok(cancelled));await rejected;assert.ok(store.has(cancelKey));observe(roundTrip?'R02_CANCEL_ABA':'R02_CANCEL',{accepted:false,pendingRetained:true});
 }
});
test('R03 denied/corrupt storage fails before transport',async()=>{
 for(const mode of ['denyRead','denyWrite','corrupt','invalidShape']){
  const {store,requests}=setup(()=>{throw Error('unexpected transport')},{[mode]:true}),api=await service();
  if(mode==='corrupt'){store.set(key,'{bad');store.set(cancelKey,'{bad');}
  if(mode==='invalidShape'){store.set(key,JSON.stringify({shop_id:shop,payment_method:'cash',consent:{currency:'ZAR',total_minor:2500,pricing_fingerprint:'a'.repeat(64)}}));store.set(cancelKey,JSON.stringify({command_id:'bad',expected_revision:0,reason:'fixture'}));}
  await assert.rejects(api.submitPickupQuote(['corrupt','invalidShape'].includes(mode)?null:review));await assert.rejects(api.cancelCustomerPickup(order,'fixture reason'));assert.equal(requests.length,0);
  if(['corrupt','invalidShape'].includes(mode)){assert.ok(store.has(key));assert.ok(store.has(cancelKey));}
  observe('R03_'+mode,{requests:0,createRecord:store.has(key),cancelRecord:store.has(cancelKey)});
 }
});
test('R03 simultaneous identical submits coalesce, changed payload blocked',async()=>{
 const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();
 const a=api.submitPickupQuote(review),b=api.submitPickupQuote(review);await tick();assert.equal(requests.length,1);
 await assert.rejects(api.submitPickupQuote({...review,intent:{...review.intent,idempotency_key:'12345678-1234-4123-8123-123456789abd'}}),/unresolved/);
 d.resolve(ok());assert.equal((await a).id,orderId);assert.equal((await b).id,orderId);assert.equal(store.size,0);observe('R03_CONCURRENT',{transmitted:1,pendingRetained:false});
});
test('R03 changed stored record during request cannot be cleared by old response',async()=>{
 const d=deferred(),{store,requests}=setup(()=>d.promise),api=await service();const p=api.submitPickupQuote(review);const rejected=assert.rejects(p,/session|submission changed/i);await tick();store.set(key,'replacement');d.resolve(ok());await rejected;assert.equal(store.get(key),'replacement');assert.equal(requests.length,1);
 observe('R03_STORAGE_RACE',{replacementRetained:true});
});
test('R04 ambiguous malformed or unrecognized response retains both intents',async()=>{
 for(const response of [()=>new Response('<html>gateway</html>',{status:409,headers:{'Content-Type':'text/html'}}),()=>Response.json({success:false,code:'IDEMPOTENCY_CONFLICT',error:'Conflict'},{status:409}),()=>Response.json({code:'PRICE_CHANGED',error:'Conflict'},{status:409}),()=>Response.json({success:false,code:'PRICE_CHANGED',error:'Conflict'},{status:503})]){
  for(const action of ['create','cancel']){
   const {store,requests}=setup(()=>response()),api=await service();await assert.rejects(action==='create'?api.submitPickupQuote(review):api.cancelCustomerPickup(order,'fixture reason'));
   assert.equal(requests.length,1);assert.ok(store.has(action==='create'?key:cancelKey));
  }
 }
 observe('R04_AMBIGUOUS',{cases:8,pendingRetained:true});
});
test('R04 only matched structured action-specific terminal conflict clears pending',async()=>{
 for(const [action,code] of [['create','PRICE_CHANGED'],['cancel','ORDER_STATE_CHANGED']]){
  const {store,requests}=setup(()=>Response.json({success:false,code,error:code},{status:409})),api=await service();await assert.rejects(action==='create'?api.submitPickupQuote(review):api.cancelCustomerPickup(order,'fixture reason'));assert.equal(requests.length,1);assert.equal(store.size,0);
 }
 observe('R04_TERMINAL',{cases:2,cleared:true});
});
