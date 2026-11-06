import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfileApiClient, ProfileApiError} from '../src/lib/customerProfileApi.ts';
const revision='2026-11-06T18:00:00.123456+00:00';
const newer='2026-11-06T18:00:01.123456+00:00';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const identity=(uid='A')=>({uid,isAnonymous:false,getIdToken:async()=>`test-${uid}`});
const receipt=(fields={},rev=revision)=>({success:true,profile:{user_id:'A',fullName:'Alice',email:'a@example.invalid',updated_at:rev,...fields},revision:rev});
function harness({fetch:request,production=false,baseUrl='https://profile-api.example.invalid',timeoutMs=1000}={}){
 const auth={currentUser:identity()},calls=[];
 const client=createProfileApiClient({baseUrl,production,timeoutMs,currentUser:()=>auth.currentUser,fetch:async(url,options)=>{
  calls.push({url,options});return request?request(url,options):Response.json(receipt());
 }});
 return{...client,auth,calls};
}

test('production requires an explicit HTTPS API origin; unsafe URLs never send credentials',async()=>{
 for(const baseUrl of ['', 'http://localhost:4000','https://u:p@example.invalid','https://api.example.invalid/path','https://api.example.invalid?token=x','javascript:alert(1)']){
  const h=harness({baseUrl,production:true});await assert.rejects(()=>h.read('A'));assert.equal(h.calls.length,0);
 }
});
test('canonical read sends only the captured Firebase token and uses no forced refresh',async()=>{
 const h=harness();const argumentsSeen=[];h.auth.currentUser.getIdToken=async(...args)=>{argumentsSeen.push(args);return'test-A';};
 const result=await h.read('A');assert.equal(result.profile.user_id,'A');assert.equal(result.revision,revision);
 assert.equal(h.calls[0].url,'https://profile-api.example.invalid/api/v1/profiles/me');
 assert.equal(h.calls[0].options.headers.Authorization,'Bearer fb-test-A');assert.deepEqual(argumentsSeen,[[]]);
 assert.equal(h.calls[0].options.cache,'no-store');assert.equal(h.calls[0].options.redirect,'error');
});
test('guest, anonymous and mismatched accounts fail before obtaining credentials or sending requests',async()=>{
 for(const user of [null,{...identity(),isAnonymous:true},identity('B')]){
  const h=harness();h.auth.currentUser=user;await assert.rejects(()=>h.read('A'));assert.equal(h.calls.length,0);
 }
});
test('empty or oversized account IDs cannot start an authenticated request',async()=>{
 for(const uid of ['', 'A'.repeat(129)]){const h=harness();h.auth.currentUser=identity(uid);await assert.rejects(()=>h.read(uid));assert.equal(h.calls.length,0);}
});
test('read strips privilege fields and preserves zero coordinates and explicit nulls',async()=>{
 const h=harness({fetch:()=>Response.json(receipt({role:'admin',is_admin:true,internal_secret:'not-for-client',latitude:0,longitude:0,address:null}))});
 const result=await h.read('A');assert.equal(result.profile.role,undefined);assert.equal(result.profile.internal_secret,undefined);assert.equal(result.profile.address,null);assert.equal(result.profile.latitude,0);
});
test('foreign owner, malformed revision, mismatched receipt revision and nested personal fields fail closed',async()=>{
 for(const body of [receipt({user_id:'B'}),receipt({},'bad'),{...receipt(),revision:newer},receipt({fullName:{private:'nested'}}),{success:true,profile:null,revision}]){
  const h=harness({fetch:()=>Response.json(body)});await assert.rejects(()=>h.read('A'));
 }
});
test('legacy canonical reads derive only a valid backend revision; genuine absence is distinguished from missing routes',async()=>{
 const body=receipt();delete body.revision;
 const h=harness({fetch:()=>Response.json(body)});assert.equal((await h.read('A')).revision,revision);
 const missing=harness({fetch:()=>Response.json({success:false,code:'PROFILE_NOT_FOUND'},{status:404})});assert.deepEqual(await missing.read('A'),{profile:null,revision:null});
 const empty=harness({fetch:()=>Response.json({success:true,profile:null,revision:null})});assert.deepEqual(await empty.read('A'),{profile:null,revision:null});
 const unknown=harness({fetch:()=>Response.json({error:'Not Found'},{status:404})});await assert.rejects(()=>unknown.read('A'));
 const html=harness({fetch:()=>new Response('<html>SPA</html>',{headers:{'Content-Type':'text/html'}})});await assert.rejects(()=>html.read('A'));
});
test('a late A token never sends a request after switching to B',async()=>{
 const token=deferred();const h=harness();h.auth.currentUser.getIdToken=()=>token.promise;
 const reading=h.read('A');h.auth.currentUser=identity('B');token.resolve('test-A');await assert.rejects(reading);assert.equal(h.calls.length,0);
});
test('same-UID re-login cannot revive an older identity request',async()=>{
 const token=deferred();const h=harness();h.auth.currentUser.getIdToken=()=>token.promise;
 const reading=h.read('A');h.auth.currentUser=identity('A');token.resolve('test-A');await assert.rejects(reading);assert.equal(h.calls.length,0);
});
test('save captures its initiating identity before yielding to a new same-UID login',async()=>{
 const token=deferred();const h=harness({fetch:()=>Response.json(receipt({city:'Tembisa'},newer))});h.auth.currentUser.getIdToken=()=>token.promise;
 const saving=h.save('A',{city:'Tembisa'},revision);h.auth.currentUser=identity('A');token.resolve('old-A');
 await assert.rejects(saving);assert.equal(h.calls.length,0);
});
test('an old account JSON receipt cannot publish after an account switch',async()=>{
 const body=deferred(),started=deferred();const h=harness({fetch:()=>({status:200,ok:true,headers:new Headers({'Content-Type':'application/json'}),json:()=>{started.resolve();return body.promise;}})});
 const reading=h.read('A');await started.promise;h.auth.currentUser=identity('B');body.resolve(receipt());await assert.rejects(reading);
});
test('the deadline covers auth and prevents a late request after timeout',async()=>{
 const token=deferred();const h=harness({timeoutMs:15});h.auth.currentUser.getIdToken=()=>token.promise;
 await assert.rejects(()=>h.read('A'),e=>e instanceof ProfileApiError&&e.code==='PROFILE_TIMEOUT');
 token.resolve('late');await new Promise(r=>setTimeout(r,5));assert.equal(h.calls.length,0);
});
test('the deadline also covers response parsing and aborts its transport signal',async()=>{
 const body=deferred();const h=harness({timeoutMs:15,fetch:()=>({status:200,ok:true,headers:new Headers({'Content-Type':'application/json'}),json:()=>body.promise})});
 await assert.rejects(()=>h.read('A'),e=>e.code==='PROFILE_TIMEOUT');assert.equal(h.calls[0].options.signal.aborted,true);body.resolve(receipt());
});
test('PATCH preserves the original microsecond revision and sends only requested fields',async()=>{
 const h=harness({fetch:()=>Response.json(receipt({city:'Tembisa'},newer))});
 const result=await h.save('A',{city:' Tembisa '},revision);assert.equal(result.profile.city,'Tembisa');
 assert.equal(h.calls[0].options.method,'PATCH');assert.deepEqual(JSON.parse(h.calls[0].options.body),{profile:{city:'Tembisa'},expectedRevision:revision});
});
test('unknown privilege fields, missing/malformed revisions and incomplete coordinates cannot be submitted',async()=>{
 for(const patch of [{role:'admin'},{user_id:'B'},{email:'other@example.invalid'},{latitude:2},{fullName:'x'.repeat(121)}]){
  const h=harness();await assert.rejects(()=>h.save('A',patch,revision));assert.equal(h.calls.length,0);
 }
 for(const rev of [undefined,'bad']){const h=harness();await assert.rejects(()=>h.save('A',{city:'Tembisa'},rev));assert.equal(h.calls.length,0);}
});
test('a generic success or wrong requested values cannot confirm a save',async()=>{
 for(const body of [{success:true},{success:true,profile:{user_id:'A'}},receipt({city:'Unchanged'},newer)]){
  const h=harness({fetch:()=>Response.json(body)});await assert.rejects(()=>h.save('A',{city:'Tembisa'},revision));
 }
});
test('conflicts stop retries and failure messages never reflect server secrets',async()=>{
 const h=harness({fetch:()=>Response.json({error:'private-database-diagnostic'},{status:409})});
 await assert.rejects(()=>h.save('A',{city:'Tembisa'},revision),e=>e.status===409&&e.retryable===false&&!e.message.includes('diagnostic'));
 const unavailable=harness({fetch:()=>Response.json({error:'private-database-diagnostic'},{status:503})});
 await assert.rejects(()=>unavailable.read('A'),e=>e.retryable===true&&!e.message.includes('diagnostic'));
});
test('caller cancellation aborts work and cannot start a late authenticated request',async()=>{
 const token=deferred(),controller=new AbortController();const h=harness();h.auth.currentUser.getIdToken=()=>token.promise;
 const pending=h.read('A',{signal:controller.signal});controller.abort();await assert.rejects(pending,e=>e.code==='PROFILE_CANCELLED');token.resolve('late');await new Promise(r=>setTimeout(r,5));assert.equal(h.calls.length,0);
});
