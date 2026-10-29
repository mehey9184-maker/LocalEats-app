import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
async function service(enabled){
 const result=await build({entryPoints:['src/services/customerPickup.ts'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',define:{'import.meta.env':JSON.stringify({VITE_PICKUP_ORDERING_ENABLED:enabled,VITE_LOCALEATS_API_URL:'http://127.0.0.1:1',PROD:false})},plugins:[{name:'isolated-provider',setup(b){
 b.onLoad({filter:/[\\/]lib[\\/]firebase\.ts$/},()=>({contents:'export const auth={get currentUser(){return {uid:globalThis.testPickupUid}}};',loader:'js'}));
 b.onLoad({filter:/[\\/]pickup[\\/]client\.ts$/},()=>({contents:'export const createPickupApi=()=>({create:(payload)=>globalThis.testPickupCreate(payload)});',loader:'js'}));
 }}]});const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);return mod.exports;
}
const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const review={intent:{idempotency_key:'fixture-key',shop_id:'fixture-shop'},quote:{total_minor:2750,pricing_fingerprint:'a'.repeat(64)}};
test('default-off activation cannot send or fabricate an order',async()=>{
 store.clear();globalThis.testPickupUid='fixture-customer';let calls=0;globalThis.testPickupCreate=()=>{calls++;};const api=await service('false');await assert.rejects(()=>api.submitPickupQuote(review),/not enabled/);assert.equal(calls,0);assert.equal(store.size,0);
});
test('lost response retains exact consent and identity-scoped request for recovery',async()=>{
 store.clear();globalThis.testPickupUid='fixture-customer';const requests=[];let lose=true;globalThis.testPickupCreate=async payload=>{requests.push(payload);if(lose)throw Error('connection lost');return {order:{id:'persisted-id',user_id:'fixture-customer',shop_id:'fixture-shop',delivery_type:'collection'},replayed:true};};const api=await service('true');
 await assert.rejects(()=>api.submitPickupQuote(review),/connection lost/);assert.equal(store.size,1);
 await assert.rejects(()=>api.submitPickupQuote({...review,intent:{...review.intent,idempotency_key:'changed'}}),/unresolved/);assert.equal(requests.length,1);
 globalThis.testPickupUid='other-customer';await assert.rejects(()=>api.submitPickupQuote(null),/Review a quote/);assert.equal(requests.length,1);
 globalThis.testPickupUid='fixture-customer';lose=false;assert.equal((await api.submitPickupQuote(null)).id,'persisted-id');assert.deepEqual(requests[0],requests[1]);assert.equal(store.size,0);assert.equal(requests[1].consent.total_minor,2750);
});
test('foreign or malformed persistence response never clears unresolved request',async()=>{
 store.clear();globalThis.testPickupUid='fixture-customer';globalThis.testPickupCreate=async()=>({order:{id:'foreign',user_id:'other',shop_id:'fixture-shop',delivery_type:'collection'},replayed:false});const api=await service('true');await assert.rejects(()=>api.submitPickupQuote(review),/not confirmed/);assert.equal(store.size,1);
});
