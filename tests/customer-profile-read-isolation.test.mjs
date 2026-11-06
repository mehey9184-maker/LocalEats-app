import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {canManageCustomerProfile} from "../src/lib/profileAccess.ts";
const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("App.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="fetchUserProfile")callback=node.initializer.arguments[0].getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);assert.ok(callback);
const emitted=ts.transpileModule(`return (${callback.replace('import("./lib/apiAuth")','getAuthModule()')});`,{
 compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"callback.ts"
}).outputText;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const identity=uid=>({uid,isAnonymous:false});
function harness(read,{fetch=async()=>({ok:false,status:503}),deferUpdates=false}={}){
 let profile={id:"A",fullName:"Initial"},favorites=["initial"];
 const auth={currentUser:identity("A")};const updates=[];
 const update=(kind,next)=>{
  const apply=()=>{if(kind==="profile")profile=typeof next==="function"?next(profile):next;
   else favorites=typeof next==="function"?next(favorites):next;};
  if(deferUpdates)updates.push(apply);else apply();
 };
 const deps={auth,canManageCustomerProfile,profileReadGeneration:{current:0},
  FirestoreService:{getProfile:read},getAuthModule:async()=>({getApiAuthHeaders:async()=>({})}),fetch,
  setUserProfile:next=>update("profile",next),setFavorites:next=>update("favorites",next),
  supabase:{auth:{getUser:async()=>({data:{user:null}})}},
  console:{debug:()=>{},warn:()=>{},info:()=>{}},setTimeout:()=>{},
 };
 const run=new Function(...Object.keys(deps),emitted)(...Object.values(deps));
 const switchTo=uid=>{auth.currentUser=identity(uid);profile={id:uid,fullName:uid+" ready"};favorites=[uid+" favorite"];};
 return {run,auth,switchTo,flush:()=>updates.splice(0).forEach(f=>f()),get profile(){return profile;},get favorites(){return favorites;}};
}
test("late Firestore A response cannot publish A details or favorites after B is ready",async()=>{
 const pending=deferred(),h=harness(()=>pending.promise),load=h.run("A");
 h.switchTo("B");pending.resolve({id:"A",fullName:"Private A",favorites:["A only"]});await load;
 assert.deepEqual(h.profile,{id:"B",fullName:"B ready"});assert.deepEqual(h.favorites,["B favorite"]);
});
test("late API response body cannot publish a signed-out account",async()=>{
 const pending=deferred(),bodyStarted=deferred();
 const h=harness(async()=>null,{fetch:async()=>({ok:true,json:()=>{bodyStarted.resolve();return pending.promise;}})});
 const load=h.run("A");await bodyStarted.promise;h.auth.currentUser=null;
 pending.resolve({profile:{user_id:"A",fullName:"Private A",favorites:["A only"]}});await load;
 assert.equal(h.profile.fullName,"Initial");assert.deepEqual(h.favorites,["initial"]);
});
test("mismatched returned profile owner is refused even for a current session",async()=>{
 const h=harness(async()=>({user_id:"B",fullName:"Private B",favorites:["B only"]}));await h.run("A");
 assert.equal(h.profile.fullName,"Initial");assert.deepEqual(h.favorites,["initial"]);
});
test("newer read wins when two requests for the same account resolve out of order",async()=>{
 const first=deferred();let count=0;
 const h=harness(()=>++count===1?first.promise:Promise.resolve({id:"A",fullName:"Fresh"}));
 const old=h.run("A");await h.run("A");first.resolve({id:"A",fullName:"Old"});await old;
 assert.equal(h.profile.fullName,"Fresh");
});
test("queued React state updaters recheck account ownership before committing",async()=>{
 const h=harness(async()=>({id:"A",fullName:"Private A",favorites:["A only"]}),{deferUpdates:true});
 await h.run("A");h.switchTo("B");h.flush();
 assert.equal(h.profile.fullName,"B ready");assert.deepEqual(h.favorites,["B favorite"]);
});
test("current matching profile still loads normally",async()=>{
 const h=harness(async()=>({id:"A",fullName:"Verified A",favorites:["shop-1"]}));await h.run("A");
 assert.equal(h.profile.fullName,"Verified A");assert.deepEqual(h.favorites,["shop-1"]);
});
