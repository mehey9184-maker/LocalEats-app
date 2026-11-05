import test from 'node:test';
import assert from 'node:assert/strict';
import {createPickupCancellation} from '../src/services/pickupCancellation.ts';

const order={id:'order',shop_id:'shop',user_id:'customer',delivery_type:'collection',status:'pending',revision:0};
function fixture(overrides={}){
 const values=new Map(),calls=[];
 const options={identity:()=> 'customer',enabled:()=>true,storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},command:async(...args)=>{calls.push(args);return {order:{...order,status:'cancelled',revision:1}};},...overrides};
 return {options,values,calls,cancel:createPickupCancellation(options)};
}
test('disabled, foreign, delivery and accepted orders never send a cancellation',async()=>{
 for(const [change,options] of [[{}, {enabled:()=>false}],[{user_id:'other'},{}],[{delivery_type:'delivery'},{}],[{status:'preparing'},{}]]){
  const f=fixture(options);await assert.rejects(()=>f.cancel({...order,...change},'Changed plans'));assert.equal(f.calls.length,0);assert.equal(f.values.size,0);
 }
});
test('cancel requires a reason and a valid persisted revision',async()=>{
 const f=fixture();
 for(const reason of ['', ' '.repeat(3),'a'.repeat(501)])await assert.rejects(()=>f.cancel(order,reason));
 await assert.rejects(()=>f.cancel({...order,revision:-1},'Changed plans'));
 await assert.rejects(()=>f.cancel({...order,revision:Number.MAX_SAFE_INTEGER},'Changed plans'));
 assert.equal(f.calls.length,0);
});
test('rapid repeats share one command and only confirmed cancellation clears recovery',async()=>{
 let resolve;const f=fixture({command:()=>new Promise(r=>{resolve=r;})});
 const first=f.cancel(order,'Changed plans'),second=f.cancel(order,'Changed plans');
 assert.equal(f.values.size,1);resolve({order:{...order,status:'cancelled',revision:1}});
 assert.equal((await first).status,'cancelled');await second;assert.equal(f.values.size,0);
});
test('lost response and reload retry the original command and reason exactly',async()=>{
 let body;
 const f=fixture({command:async(_id,_action,payload,merchant)=>{body=payload;assert.equal(merchant,false);throw Error('Lost response');}});
 await assert.rejects(()=>f.cancel(order,'Changed plans'),/Lost response/);assert.equal(f.values.size,1);
 let replay;
 const retry=createPickupCancellation({...f.options,command:async(_id,_action,payload)=>{replay=payload;return {order:{...order,status:'cancelled',revision:1}};}});
 await retry(order,'Different reason entered later');assert.deepEqual(replay,body);assert.equal(replay.reason,'Changed plans');assert.equal(f.values.size,0);
});
test('an unconfirmed or foreign result does not claim success or discard recovery',async()=>{
 for(const response of [{...order,status:'pending'},{...order,status:'cancelled',user_id:'other'}]){
  const f=fixture({command:async()=>({order:response})});await assert.rejects(()=>f.cancel(order,'Changed plans'),/not confirmed/);assert.equal(f.values.size,1);
 }
});
test('a definitive server rejection clears the failed command',async()=>{
 const f=fixture({command:async()=>{throw Object.assign(Error('Order already accepted'),{status:409});}});
 await assert.rejects(()=>f.cancel(order,'Changed plans'));assert.equal(f.values.size,0);
});
test('an account change cannot reuse another account cancellation',async()=>{
 let uid='customer';const f=fixture({identity:()=>uid,command:async()=>{throw Error('Lost response');}});
 await assert.rejects(()=>f.cancel(order,'Changed plans'));uid='other';
 await assert.rejects(()=>f.cancel(order,'Changed plans'));assert.equal(f.values.size,1);
});

test('a never-settling request times out, aborts and releases retry with the exact saved command',async()=>{
 let calls=0,original,replayed,signal;
 const f=fixture({timeoutMs:15,command:async(_id,_action,body,_merchant,requestSignal)=>{
  calls++;signal=requestSignal;
  if(calls===1){original=body;return new Promise(()=>{});}
  replayed=body;return {order:{...order,status:'cancelled',revision:1}};
 }});
 await assert.rejects(()=>f.cancel(order,'Changed plans'),/outcome is unconfirmed/);
 assert.equal(signal.aborted,true);assert.equal(f.values.size,1);
 await f.cancel(order,'Different reason');assert.deepEqual(replayed,original);assert.equal(calls,2);assert.equal(f.values.size,0);
});

test('a late reply after timeout cannot clear the unresolved cancellation',async()=>{
 let resolve;
 const f=fixture({timeoutMs:10,command:()=>new Promise(r=>{resolve=r;})});
 await assert.rejects(()=>f.cancel(order,'Changed plans'),/outcome is unconfirmed/);
 resolve({order:{...order,status:'cancelled',revision:1}});
 await new Promise(r=>setImmediate(r));assert.equal(f.values.size,1);
});
