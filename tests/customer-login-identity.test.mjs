import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function callback(path,name,property=false){
 const source=readFileSync(new URL(path,import.meta.url),"utf8");
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;
 function visit(n){
  if(!found&&((property&&ts.isPropertyAssignment(n))||(!property&&ts.isVariableDeclaration(n)))&&n.name.getText(ast)===name)found=n.initializer.getText(ast);
  ts.forEachChild(n,visit);
 }
 visit(ast);assert.ok(found);
 return ts.transpileModule(`return (${found});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"callback.ts"}).outputText;
}
const loginCode=callback("../src/screens/auth/LoginScreen.tsx","handleLogin");
function loginHarness({mounted=true,deferState=false}={}){
 const pending=deferred(),auth={currentUser:{uid:"A",isAnonymous:false}},updates=[];
 let profile={id:"B",fullName:"Private B"},writes=0;
 const storage=new Map([["userProfile",JSON.stringify(profile)],["localeats_session","B"],["offline_orders_queue","B draft"]]);
 const deps={auth,loginMounted:{current:mounted},identifier:"a@example.test",password:"local-test",
  supabase:{auth:{signInWithPassword:()=>pending.promise}},
  setAuthError:()=>{},setLoading:()=>{},setHasRememberedToken:()=>{},setIsSuccess:()=>{},
  localStorage:{setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setUserProfile:next=>{const apply=()=>profile=typeof next==="function"?next(profile):next;if(deferState)updates.push(apply);else apply();},
  upsertProfileWithRPC:async()=>{writes++;return{error:null};},fetchUserProfile:()=>{},
  generateSecureToken:()=>"local-test-only",rememberMe:false,registerBiometrics:async()=>{},
  scheduleLoginTask:()=>{},onLogin:()=>{},navigator:{onLine:true},console:{warn:()=>{},debug:()=>{}},
 };
 const run=new Function(...Object.keys(deps),loginCode)(...Object.values(deps));
 return {run,auth,storage,pending,flush:()=>updates.splice(0).forEach(fn=>fn()),get profile(){return profile;},get writes(){return writes;}};
}
const returnedA={data:{user:{id:"A",email:"a@example.test",user_metadata:{full_name:"Account A"}}},error:null};
test("late A login result cannot overwrite active B profile, cache or queues",async()=>{
 const h=loginHarness();const login=h.run();h.auth.currentUser={uid:"B",isAnonymous:false};h.pending.resolve(returnedA);await login;
 assert.equal(h.profile.id,"B");assert.equal(h.storage.get("localeats_session"),"B");
 assert.equal(h.storage.get("offline_orders_queue"),"B draft");assert.equal(h.writes,0);
});
test("same account login can seed its display after Home unmounts Login",async()=>{
 const h=loginHarness({mounted:false});const login=h.run();h.pending.resolve(returnedA);await login;
 assert.equal(h.profile.id,"A");assert.equal(h.storage.get("localeats_session"),"A");
});
test("deferred Login state update cannot publish A into B",async()=>{
 const h=loginHarness({deferState:true});const login=h.run();h.pending.resolve(returnedA);await login;
 h.auth.currentUser={uid:"B",isAnonymous:false};h.flush();assert.equal(h.profile.id,"B");
});
test("logging in does not silently overwrite persisted profile fields",async()=>{
 const h=loginHarness();const login=h.run();h.pending.resolve(returnedA);await login;assert.equal(h.writes,0);
});
const facadeCode=callback("../src/lib/supabase.ts","signInWithPassword",true);
test("password facade refuses old credential after a new same-UID login",async()=>{
 const original={uid:"A"},auth={currentUser:original},pending=deferred(),started=deferred();
 const fn=new Function("auth","signInWithEmailAndPassword","formatSession",facadeCode)(auth,async()=>({user:original}),()=>{started.resolve();return pending.promise;});
 const login=fn({email:"a@example.test",password:"local-test"});await started.promise;
 auth.currentUser={uid:"A"};pending.resolve({user:{id:"A"}});const result=await login;
 assert.ok(result.error);assert.equal(result.data.session,null);
});

const biometricCode=callback("../src/screens/auth/LoginScreen.tsx","registerBiometrics");
function biometricHarness(create){
 const auth={currentUser:{uid:"A",isAnonymous:false}},values=new Map([["biometric_credential_id","B-previous-key"]]);
 const deps={auth,biometricsEnabled:true,window:{PublicKeyCredential:{},crypto:globalThis.crypto,location:{hostname:"127.0.0.1"}},
  navigator:{credentials:{create}},localStorage:{setItem:(k,v)=>values.set(k,v)},
  console:{warn:()=>{},log:()=>{}},setNotification:()=>{},btoa:globalThis.btoa,
 };
 return {auth,values,run:new Function(...Object.keys(deps),biometricCode)(...Object.values(deps))};
}
test("late biometric enrollment cannot overwrite a new account's device key",async()=>{
 const pending=deferred(),h=biometricHarness(()=>pending.promise);const enroll=h.run("a@example.test");
 h.auth.currentUser={uid:"B",isAnonymous:false};pending.resolve({rawId:new Uint8Array([1,2,3]).buffer});await enroll;
 assert.equal(h.values.get("biometric_credential_id"),"B-previous-key");
});
test("failed biometric enrollment never manufactures a credential",async()=>{
 const h=biometricHarness(async()=>{throw new Error("Canceled");});await h.run("a@example.test");
 assert.equal(h.values.get("biometric_credential_id"),"B-previous-key");
});
test("current account can retain its real device credential",async()=>{
 const h=biometricHarness(async()=>({rawId:new Uint8Array([1,2,3]).buffer}));await h.run("a@example.test");
 assert.equal(h.values.get("biometric_credential_id"),"AQID");
});
