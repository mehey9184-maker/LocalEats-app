import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuideFlow} from '../src/services/startupGuides.ts';

function fixture(initial={},blocked=false){
 const values=new Map(Object.entries(initial)),pending=[],changes=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('blocked');values.set(key,value);}};
 const flow=createGuideFlow({storage,onChange:stage=>changes.push(stage),schedule:callback=>{pending.push(callback);return pending.length;},cancel:()=>{}});
 return {flow,values,pending,changes};
}
test('a first visit shows one overview, then one interactive guide',()=>{
 const f=fixture();f.pending[0]();assert.deepEqual(f.changes,['overview']);
 f.flow.complete();assert.deepEqual(f.changes,['overview','interactive']);
 f.flow.complete();assert.deepEqual(f.changes,['overview','interactive',null]);
 assert.equal(f.values.get('localeats_tour_seen'),'true');assert.equal(f.values.get('localeats_interactive_tour_seen'),'true');
});
test('Skip prevents a pending timer from reopening either guide',()=>{
 const f=fixture();f.flow.skip();f.pending[0]();assert.deepEqual(f.changes,[null]);
 assert.equal(f.values.get('localeats_tour_seen'),'true');assert.equal(f.values.get('localeats_interactive_tour_seen'),'true');
});
test('returning visits skip completed guides and Help can explicitly reopen either',()=>{
 const f=fixture({localeats_tour_seen:'true',localeats_interactive_tour_seen:'true'});
 assert.equal(f.pending.length,0);f.flow.start('interactive');f.flow.skip();f.flow.start('overview');f.flow.complete();
 assert.deepEqual(f.changes,['interactive',null,'overview',null]);
});
test('explicit Help action supersedes delayed startup and unmount cancels delayed work',()=>{
 const f=fixture();f.flow.start('interactive');f.pending[0]();assert.deepEqual(f.changes,['interactive']);
 f.flow.dispose();f.flow.start('overview');assert.deepEqual(f.changes,['interactive']);
 const g=fixture();g.flow.dispose();g.pending[0]();assert.deepEqual(g.changes,[]);
});
test('storage failures still let the current session dismiss its guides',()=>{
 const f=fixture({},true);assert.doesNotThrow(()=>f.flow.skip());f.pending[0]();assert.deepEqual(f.changes,[null]);
});
