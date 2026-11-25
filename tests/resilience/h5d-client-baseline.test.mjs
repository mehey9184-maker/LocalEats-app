// Actual read policy and pickup transport, synthetic time/accounts only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPickupApi} from '../../src/pickup/client.ts';
import {customerHistoryInterval,shouldPollCustomerHistory} from '../../src/services/historyPollingPolicy.ts';
const observe=(id,data)=>console.log('H5D_BASELINE '+JSON.stringify({id,...data}));
const reply=(status=200,body={success:true,orders:[]},headers={})=>Response.json(body,{status,headers});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
test('R06 missed-push fallback policy: active/unknown fast, verified idle delayed',()=>{
 const active=[{status:'pending'}],idle=[{status:'collected'}];
 const cases=[['active',active,'home'],['unknown',null,'home'],['truncated',Array(50).fill(idle[0]),'home'],['idle',idle,'home'],['tracking',idle,'order-tracking']];
 for(const [name,rows,screen] of cases){
  const interval=customerHistoryInterval(rows,screen);const first=[30000,60000,90000,120000].find(t=>shouldPollCustomerHistory(rows,screen,0,t));
  assert.equal(interval,first);observe('R06_POLICY',{state:name,firstEligibleTickMs:first});
 }
 const app=readFileSync('src/App.tsx','utf8');
 // Source observations only: no mounted app or delivery claim.
 observe('R06_SOURCE',{policyReferenced:app.includes('shouldPollCustomerHistory'),notificationEndpointReferenced:app.includes('.notifications('),onlineListener:/addEventListener\(["']online/.test(app)});
});
test('R12 actual client cooldown persists across account switch before token retrieval',async()=>{
 let uid='A',now=0,tokenReads=0;const requests=[];
 const api=createPickupApi('http://127.0.0.1:1',async()=>{tokenReads++;return uid},async(url,init)=>{requests.push({method:init.method,authorization:init.headers.Authorization});return requests.length===1?reply(429,{success:false,code:'RATE_LIMITED',error:'Retry'},{'Retry-After':'90'}):reply()},{now:()=>now});
 await assert.rejects(api.orders(),e=>e.status===429);uid='B';now=30000;
 const second=await api.orders().then(()=>true,()=>false);assert.equal(second,false);assert.equal(requests.length,1);assert.equal(tokenReads,1);
 now=90000;await api.orders();assert.equal(requests.length,2);assert.equal(requests[1].authorization,'Bearer fb-B');
 observe('R12_ACCOUNT',{secondAccountBlocked:!second,tokenReadsBeforeExpiry:1,requestsBeforeExpiry:1,expiryRecovery:true,requestsAfterExpiry:2});
});
test('R12 late prior-account response imposes cooldown on new account',async()=>{
 let uid='A',now=0;const d=deferred(),requests=[];
 const api=createPickupApi('http://127.0.0.1:1',async()=>uid,async(url,init)=>{requests.push(init.headers.Authorization);return requests.length===1?d.promise:reply()},{now:()=>now});
 const first=api.orders();const rejected=assert.rejects(first,e=>e.status===503);await tick();uid='B';
 d.resolve(reply(503,{success:false,code:'UNAVAILABLE',error:'Retry'},{'Retry-After':'60'}));await rejected;
 const allowed=await api.orders().then(()=>true,()=>false);assert.equal(allowed,false);observe('R12_LATE',{newAccountBlocked:!allowed,requests:requests.length});
 now=60000;await api.orders();assert.equal(requests.at(-1),'Bearer fb-B');
});
test('R12 route separation, 503 Retry-After, mutation never auto retried',async()=>{
 let now=0;const requests=[];
 const api=createPickupApi('http://127.0.0.1:1',async()=>'A',async(url,init)=>{requests.push({url,method:init.method});if(requests.length===1)return reply(503,{success:false,error:'Unavailable'},{'Retry-After':'15'});if(init.method==='POST')return reply(503,{success:false,error:'Unknown'});return reply(200,{success:true,notifications:[],orders:[]})},{now:()=>now});
 await assert.rejects(api.orders(),e=>e.status===503);
 await assert.rejects(api.orders(),e=>e.status===429);assert.equal(requests.length,1);
 await api.notifications();await assert.rejects(api.create({synthetic:true}));await tick();assert.equal(requests.filter(r=>r.method==='POST').length,1);
 now=15000;await api.orders();assert.equal(requests.length,4);
 observe('R12_CONTROLS',{routeSeparation:true,expiryRecovery:true,mutationTransmissions:1,automaticReplay:false});
});
