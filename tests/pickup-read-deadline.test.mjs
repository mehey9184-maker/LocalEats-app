import test from 'node:test';
import assert from 'node:assert/strict';
import {readPickupWithDeadline} from '../src/services/pickupRead.ts';
test('stalled feed aborts and rejects so the caller can release refreshing',async()=>{
 let signal;
 await assert.rejects(()=>readPickupWithDeadline(s=>{signal=s;return new Promise(()=>{});},{timeoutMs:10}),/took too long/);
 assert.equal(signal.aborted,true);
 assert.deepEqual(await readPickupWithDeadline(async()=>['fresh']),['fresh']);
});
test('late feed cannot publish old data after a newer read succeeds',async()=>{
 let resolve,visible=['confirmed'];
 const old=readPickupWithDeadline(()=>new Promise(r=>{resolve=r;}),{timeoutMs:10}).then(rows=>{visible=rows;});
 await assert.rejects(()=>old,/took too long/);
 visible=await readPickupWithDeadline(async()=>['newest']);resolve(['obsolete']);
 await new Promise(r=>setImmediate(r));assert.deepEqual(visible,['newest']);
});
test('account cleanup aborts an outstanding feed even when transport ignores abort',async()=>{
 const parent=new AbortController();let signal;
 const read=readPickupWithDeadline(s=>{signal=s;return new Promise(()=>{});},{signal:parent.signal});
 parent.abort();await assert.rejects(()=>read,/cancelled/);assert.equal(signal.aborted,true);
});
