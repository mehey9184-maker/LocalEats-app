import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {canManageCustomerProfile} from "../src/lib/profileAccess.ts";
import {isConfirmedProfileSave} from "../src/lib/profileConfirmation.ts";
import {initialCustomerProfileState,requireProfileEditBasis,acceptProfileSave,profileSaveResult} from "../src/lib/customerProfileState.ts";
const source=readFileSync(new URL("../src/lib/profileService.ts",import.meta.url),"utf8");
const ast=ts.createSourceFile("profileService.ts",source,ts.ScriptTarget.Latest,true);
const names=["syncProfileDirect","upsertProfileWithRPC","scheduleProfileRetry","processOfflineProfileQueue"];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))
 .map(n=>n.getText(ast).replace(/^export /,"").replace("import('./apiAuth')",'getAuthModule()')).join("\n");
const emitted=ts.transpileModule(functions+"\nreturn {syncProfileDirect,upsertProfileWithRPC,scheduleProfileRetry,processOfflineProfileQueue};",{
 compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"callbacks.ts"
}).outputText;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const identity=uid=>({uid,isAnonymous:false});
function harness({headers=async()=>({Authorization:"Bearer A"}),fetchImpl,cache={id:"A"},queue=[]}={}){
 const auth={currentUser:identity("A")},events=[],requests=[],timers=[];
 const values=new Map([["userProfile",JSON.stringify(cache)]]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const deps={auth,canManageCustomerProfile,isConfirmedProfileSave,toDBPhone:v=>v??"",
  getAuthModule:async()=>({getApiAuthHeaders:headers}),
  fetch:async(url,options)=>{requests.push({url,options});return fetchImpl?fetchImpl():({status:503,headers:{get:()=>"application/json"},json:async()=>({error:"Unavailable"})});},
  window:{localStorage:storage},localStorage:storage,navigator:{onLine:true},
  queueProfileSync:()=>events.push("queue"),clearProfileFromQueue:()=>events.push("clear"),
  incrementProfileRetry:()=>events.push("retry"),scheduleProfileRetry:()=>events.push("schedule"),
  isPermanentSyncError:()=>false,console:{warn:()=>{},info:()=>{},error:()=>{},log:()=>{}},
  activeRetryTimers:new Map(),calculateBackoffDelay:()=>0,
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},getProfileSyncQueue:()=>queue,
 };
 const api=new Function(...Object.keys(deps),emitted)(...Object.values(deps));
 return {...api,auth,events,requests,storage,fireTimers:()=>Promise.all(timers.splice(0).map(fn=>fn()))};
}
test("A profile must not be sent with B credentials after token retrieval",async()=>{
 const pending=deferred(),started=deferred();
 const h=harness({headers:()=>{started.resolve();return pending.promise;}});
 const save=h.syncProfileDirect({user_id:"A",fullName:"Private A"});await started.promise;
 h.auth.currentUser=identity("B");pending.resolve({Authorization:"Bearer B"});const result=await save;
 assert.equal(h.requests.length,0);assert.equal(result.success,false);
});
test("same UID re-login cannot revive a prior identity's pending save",async()=>{
 const pending=deferred(),started=deferred();const h=harness({headers:()=>{started.resolve();return pending.promise;}});
 const save=h.syncProfileDirect({user_id:"A",fullName:"Old A"});await started.promise;
 h.auth.currentUser=identity("A");pending.resolve({Authorization:"Bearer New-A"});await save;
 assert.equal(h.requests.length,0);
});
test("a late success receipt after account switching cannot confirm the old save",async()=>{
 const body=deferred(),started=deferred();const h=harness({fetchImpl:()=>({status:200,headers:{get:()=>"application/json"},json:()=>{started.resolve();return body.promise;}})});
 const save=h.syncProfileDirect({user_id:"A",fullName:"Private A"});await started.promise;
 h.auth.currentUser=identity("B");body.resolve({success:true,profile:{user_id:"A"}});
 assert.equal((await save).success,false);
});
test("a stale outer upsert cannot clear or reschedule queues after account switching",async()=>{
 const body=deferred(),started=deferred();const h=harness({fetchImpl:()=>({status:200,headers:{get:()=>"application/json"},json:()=>{started.resolve();return body.promise;}})});
 const save=h.upsertProfileWithRPC({user_id:"A",fullName:"Private A"});await started.promise;
 const before=h.events.length;h.auth.currentUser=identity("B");
 h.storage.setItem("userProfile",JSON.stringify({id:"B",fullName:"Private B"}));
 body.resolve({success:true,profile:{user_id:"A"}});const result=await save;
 assert.ok(result.error);assert.deepEqual(h.events.slice(before),[]);
 assert.equal(JSON.parse(h.storage.getItem("userProfile")).id,"B");
});
test("partial A edits never inherit private fields from B's old local cache",async()=>{
 const h=harness({cache:{id:"B",photoURL:"private-b-photo",address:"private-b-address"}});
 await h.upsertProfileWithRPC({user_id:"A",fullName:"New A"});
 const cached=JSON.parse(h.storage.getItem("userProfile"));
 assert.notEqual(cached.photoURL,"private-b-photo");assert.notEqual(cached.address,"private-b-address");
});
test("unchanged matching identity can receive its confirmed save",async()=>{
 const h=harness({fetchImpl:()=>({status:200,headers:{get:()=>"application/json"},json:async()=>({success:true,profile:{user_id:"A"}})})});
 const result=await h.upsertProfileWithRPC({user_id:"A",fullName:"Verified A"});
 assert.equal(result.error,null);assert.deepEqual(h.events,["queue","clear"]);
});

test("queued retry cannot run after logout and a fresh login with the same UID",async()=>{
 const h=harness();h.scheduleProfileRetry({user_id:"A",fullName:"Old A"});
 h.auth.currentUser=identity("A");await h.fireTimers();assert.equal(h.requests.length,0);
});
test("offline queue completion after account switch cannot mutate retry metadata",async()=>{
 const pending=deferred(),started=deferred();
 const h=harness({queue:[{user_id:"A",data:{user_id:"A",fullName:"Private A"}}],headers:()=>{started.resolve();return pending.promise;}});
 const processing=h.processOfflineProfileQueue();await started.promise;h.auth.currentUser=identity("B");
 pending.resolve({Authorization:"Bearer B"});await processing;
 assert.equal(h.requests.length,0);assert.deepEqual(h.events,[]);
});
test("in-flight retry cannot clear an old account queue after identity changes",async()=>{
 const body=deferred(),started=deferred();
 const h=harness({fetchImpl:()=>({status:200,headers:{get:()=>"application/json"},json:()=>{started.resolve();return body.promise;}})});
 h.scheduleProfileRetry({user_id:"A",fullName:"Private A"});const retry=h.fireTimers();await started.promise;
 h.auth.currentUser=identity("B");body.resolve({success:true,profile:{user_id:"A"}});await retry;
 assert.deepEqual(h.events,[]);
});

const appSource=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const appAst=ts.createSourceFile("App.tsx",appSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let saveCallback;
function findSave(node){
 if(!saveCallback&&ts.isVariableDeclaration(node)&&node.name.getText(appAst)==="handleUpdateProfile")saveCallback=node.initializer.getText(appAst);
 ts.forEachChild(node,findSave);
}
findSave(appAst);assert.ok(saveCallback);
const emittedSave=ts.transpileModule(`return (${saveCallback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"save.ts"}).outputText;
function appSaveHarness({processing=async(action,done)=>{await action();done?.();},deferState=false,save}={}){
 const auth={currentUser:identity("A")},pending=[];
 let profile={id:"A",fullName:"Initial"};
 const basis={identity:auth.currentUser,revision:"2026-11-06T18:00:00.123456+00:00"};const requests=[];
 const emptyCustomerProfile=()=>({fullName:"",email:"",phone:"",city:"Johannesburg",address:"",country:"South Africa",role:"user"});
 let state={...initialCustomerProfileState(emptyCustomerProfile()),profile,basis,owner:auth.currentUser,status:"ready"};
 const deps={auth,canManageCustomerProfile,session:{user:{id:"A"}},userProfile:profile,
  setNotification:()=>{},upsertProfileWithRPC:async data=>{requests.push({kind:"legacy",data});return{error:null};},runWithProcessing:processing,
  requireProfileEditBasis,acceptProfileSave,profileSaveResult,emptyCustomerProfile,profileReadGeneration:{current:1},profileSaveInFlightRef:{current:null},
  toDBPhone:v=>v,
  customerProfileApi:{save:async(uid,patch,revision)=>{requests.push({kind:"central",uid,patch,revision});return save?save(uid,patch,revision):{profile:{user_id:uid,fullName:typeof patch.fullName==='string'?patch.fullName.trim():'Initial',...Object.fromEntries(Object.entries(patch).filter(([key])=>key!=='fullName')),updated_at:"2026-11-06T18:00:01.123456+00:00"},revision:"2026-11-06T18:00:01.123456+00:00"};}},
  setCustomerProfileState:next=>{const apply=()=>{state=typeof next==='function'?next(state):next;profile=state.profile;};if(deferState)pending.push(apply);else apply();},
  setUserProfile:next=>{const apply=()=>profile=typeof next==="function"?next(profile):next;if(deferState)pending.push(apply);else apply();},
 };
 const raw=new Function(...Object.keys(deps),emittedSave)(...Object.values(deps));
 return {run:(data,show=true,done)=>raw(data,show,done,basis),raw,basis,requests,auth,
  switchToB:()=>{auth.currentUser=identity("B");profile={id:"B",fullName:"Private B"};state={...initialCustomerProfileState(emptyCustomerProfile()),profile,owner:auth.currentUser};},
  flush:()=>pending.splice(0).forEach(f=>f()),get profile(){return profile;}};
}
test("account change during success feedback cannot navigate or confirm the old form",async()=>{
 const started=deferred(),release=deferred();let callbacks=0;
 const h=appSaveHarness({processing:async(action,done)=>{await action();started.resolve();await release.promise;done?.();}});
 const saving=h.run({fullName:"Updated A"},true,()=>callbacks++);await started.promise;
 h.switchToB();release.resolve();await assert.rejects(saving,/account changed/);
 assert.equal(callbacks,0);assert.equal(h.profile.fullName,"Private B");
});
test("a delayed React save-state updater cannot overwrite B after a confirmed A save",async()=>{
 const h=appSaveHarness({deferState:true});await h.run({fullName:"Updated A"},false);
 h.switchToB();h.flush();assert.equal(h.profile.fullName,"Private B");
});
test("same account receives its saved state and success callback",async()=>{
 let callbacks=0;const h=appSaveHarness();await h.run({fullName:"Updated A"},true,()=>callbacks++);
 assert.equal(callbacks,1);assert.equal(h.profile.fullName,"Updated A");
});
test("App submits only edited fields and their original verified revision",async()=>{
 const h=appSaveHarness();await h.run({fullName:" Updated A ",role:"admin",email:"not-authority@example.invalid"},false);
 assert.deepEqual(h.requests,[{kind:"central",uid:"A",patch:{fullName:" Updated A "},revision:h.basis.revision}]);
 assert.equal(h.profile.fullName,"Updated A");assert.equal(h.profile.role,"user");
});
test("an unverified or foreign form cannot initiate a profile save",async()=>{
 const h=appSaveHarness();await assert.rejects(()=>h.raw({fullName:"Updated"},false));assert.equal(h.requests.length,0);
 await assert.rejects(()=>h.raw({fullName:"Updated"},false,undefined,{...h.basis,identity:identity("B")}));assert.equal(h.requests.length,0);
});
test("an API failure leaves the verified profile intact and does not call success",async()=>{
 let callbacks=0;const h=appSaveHarness({save:async()=>{throw Error("Unconfirmed");}});
 await assert.rejects(()=>h.run({fullName:"Draft"},false,()=>callbacks++),/Unconfirmed/);assert.equal(h.profile.fullName,"Initial");assert.equal(callbacks,0);
});

test("a legacy favorites-only request cannot blank unrelated saved profile fields",async()=>{
 const h=harness();await h.syncProfileDirect({user_id:"A",favorites:["chosen"]});
 assert.equal(h.requests.length,1);
 assert.deepEqual(JSON.parse(h.requests[0].options.body),{user_id:"A",favorites:["chosen"]});
});
test("legacy partial writes preserve explicit clearing but exclude customer privilege and server timestamp fields",async()=>{
 const h=harness();await h.syncProfileDirect({user_id:"A",address:"",latitude:0,longitude:0,role:"admin",email:"changed@example.invalid"});
 assert.deepEqual(JSON.parse(h.requests[0].options.body),{user_id:"A",address:"",latitude:0,longitude:0});
});

test("a favorites-only legacy draft keeps the same account's cached phone",async()=>{
 const h=harness({cache:{id:"A",phone:"0712345678",fullName:"Saved name"}});
 await h.upsertProfileWithRPC({user_id:"A",favorites:["chosen"]});
 const cached=JSON.parse(h.storage.getItem("userProfile"));assert.equal(cached.phone,"0712345678");assert.equal(cached.fullName,"Saved name");
});
