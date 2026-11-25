// Execute the actual Customer App history effect with controlled browser callbacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {transformSync} from 'esbuild';
import {createPickupApi} from '../../src/pickup/client.ts';
import {readPickupWithDeadline} from '../../src/services/pickupRead.ts';
import {shouldPollCustomerHistory,ACTIVE_HISTORY_MS} from '../../src/services/historyPollingPolicy.ts';
const src=readFileSync('src/App.tsx','utf8'),tree=ts.createSourceFile('App.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let effect;
function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='useEffect'&&node.arguments[0]?.getText(tree).includes('let readyInboxErrorShown'))effect=node.arguments[0].getText(tree);ts.forEachChild(node,visit);}
visit(tree);assert.ok(effect);
const code=transformSync('export const effect='+effect,{loader:'tsx',format:'cjs',target:'es2022'}).code;
const tick=()=>new Promise(r=>setImmediate(r));
const row={id:'fixture-order',user_id:'A',shop_id:'shop-a',delivery_type:'collection',status:'pending'};
const event={id:'fixture-event',order_id:row.id,occurred_at:'2026-11-25T00:00:00Z'};
function fixture(){
 let now=0,orders=[],notifications=[],history=null,notices=[],interval,delay,ready=false,fail=false;
 const listeners=new Map(),requests=[];
 const target={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key)=>listeners.delete(key)};
 const document={...target,visibilityState:'visible'},navigator={onLine:true};
 const api=createPickupApi('http://127.0.0.1:1',async()=> 'A',async(url,init)=>{
  requests.push({path:new URL(url).pathname,method:init.method});
  if(fail)return Response.json({success:false,error:'Unavailable'},{status:503});
  return Response.json(url.endsWith('/notifications')?{success:true,notifications:ready?[event]:[]}:{success:true,orders:[{...row,status:ready?'ready_for_pickup':'pending'}]});
 });
 const d={historyUserId:'A',historyScreenRef:{current:'home'},refreshPickupHistory:{current:()=>{}},customerPickupApi:api,
  readPickupWithDeadline,shouldPollCustomerHistory,ACTIVE_HISTORY_MS,Date:{now:()=>now,parse:Date.parse},
  window:target,document,navigator,setInterval:(fn,ms)=>{interval=fn;delay=ms;return 1},clearInterval:()=>{interval=null;},
  setOrders:v=>{orders=v},setNotifications:v=>{notifications=v},setPickupHistory:v=>{history=typeof v==='function'?v(history):v},setNotification:v=>notices.push(v)};
 const mod={exports:{}};new Function('module','exports',...Object.keys(d),code)(mod,mod.exports,...Object.values(d));
 const cleanup=mod.exports.effect();
 return {requests,listeners,document,navigator,cleanup,delay:()=>delay,advance:(t)=>{now=t;interval?.()},ready:()=>{ready=true},fail:v=>{fail=v},orders:()=>orders,notifications:()=>notifications,history:()=>history,notices};
}
test('R06 actual Customer effect recovers ready order and durable inbox without push, keeps errors truthful',async()=>{
 const f=fixture();try{
 await tick();assert.equal(f.delay(),30000);assert.equal(f.orders()[0].status,'pending');assert.equal(f.notifications().length,0);
 f.ready();f.advance(30000);await tick();assert.equal(f.orders()[0].status,'ready');assert.equal(f.notifications()[0].id,event.id);
 const after=f.requests.length;f.navigator.onLine=false;f.advance(60000);await tick();assert.equal(f.requests.length,after);
 f.navigator.onLine=true;f.fail(true);f.listeners.get('online')();await tick();assert.equal(f.history().error,true);assert.equal(f.orders()[0].status,'ready');assert.equal(f.notifications()[0].id,event.id);
 f.fail(false);f.listeners.get('focus')();await tick();assert.equal(f.history().error,false);assert.equal(f.notifications().length,1);assert.equal(f.notifications()[0].id,event.id);
 assert.ok(f.requests.every(r=>r.method==='GET'));console.log('H5D_RECONCILE '+JSON.stringify({app:'Customer',pollMs:30000,missedPushRecovered:true,offlineSuppressed:true,staleErrorPreserved:true,duplicateInboxRows:0,mutations:0}));
 }finally{f.cleanup();}
});
