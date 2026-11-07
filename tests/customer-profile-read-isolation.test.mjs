import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {canManageCustomerProfile} from "../src/lib/profileAccess.ts";
import {initialCustomerProfileState,beginProfileRead,acceptProfileRead,failProfileRead,requireProfileEditBasis} from "../src/lib/customerProfileState.ts";
const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("App.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
let favoritesEffect;
let toggleCallback;
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="fetchUserProfile")callback=node.initializer.arguments[0].getText(ast);
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="toggleFavorite")toggleCallback=node.initializer.arguments[0].getText(ast);
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==="useEffect"&&node.arguments[0]?.getText(ast).includes("favoriteState.intent"))favoritesEffect=node.arguments[0].getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);assert.ok(callback);
test("App profile hydration uses only the central profile reader",()=>{
 assert.match(callback,/readCustomerProfile\(userId\)/);
 assert.doesNotMatch(callback,/FirestoreService\.getProfile|\/api\/profiles|supabase\.auth\.getUser/);
});
const emitted=ts.transpileModule(`return (${callback.replace('import("./lib/apiAuth")','getAuthModule()')});`,{
 compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"callback.ts"
}).outputText;
const effectCode=ts.transpileModule(`return (${favoritesEffect});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"effect.ts"}).outputText;
const toggleCode=ts.transpileModule(`return (${toggleCallback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"toggle.ts"}).outputText;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const identity=uid=>({uid,isAnonymous:false});
function harness(read,{fetch=async()=>({ok:false,status:503}),deferUpdates=false,follow=async()=>{},strictReplay=false,centralFailure=false}={}){
 let profile={id:"A",fullName:"Initial"},favorites=["initial"];
 let favoriteState={items:favorites,intent:null};
 const auth={currentUser:identity("A")};const updates=[],writes=[],contexts=[],notices=[];
 const emptyCustomerProfile=()=>({fullName:"",email:"",phone:"",city:"Johannesburg",address:"",country:"South Africa",role:"user"});
 let profileState={...initialCustomerProfileState(emptyCustomerProfile()),profile,favoriteState,owner:auth.currentUser,basis:{identity:auth.currentUser,revision:"2026-11-06T18:00:00Z"}};
 const update=(kind,next)=>{
  const apply=()=>{if(kind==="profile")profile=typeof next==="function"?next(profile):next;
   else {const items=typeof next==="function"?next(favorites):next;if(items!==favorites){favorites=items;favoriteState={items,intent:null};}};};
  if(deferUpdates)updates.push(apply);else apply();
 };
 const deps={auth,canManageCustomerProfile,profileReadGeneration:{current:0},
  beginProfileRead,acceptProfileRead,failProfileRead,requireProfileEditBasis,
  handleUpdateProfile:async(data,show,callback,basis)=>{requireProfileEditBasis(basis,auth.currentUser);contexts.push(basis);if(centralFailure)throw Error("Conflict");writes.push({user_id:auth.currentUser.uid,...data});},setNotification:n=>notices.push(n),
  setCustomerProfileState:next=>{const apply=()=>{profileState=typeof next==='function'?next(profileState):next;profile=profileState.profile;favoriteState=profileState.favoriteState;favorites=favoriteState.items;};if(deferUpdates)updates.push(apply);else apply();},
  lastSyncedFavoriteStateRef:{current:null},
  setFavoriteState:next=>{const first=next(favoriteState);if(strictReplay)next(favoriteState);favoriteState=first;favorites=first.items;profileState.favoriteState=first;},
  session:{user:{id:"A"}},upsertProfileWithRPC:async data=>{writes.push(data);return{error:null};},
  emptyCustomerProfile,
  readCustomerProfile:async uid=>{const row=await read(uid);const revision=row?.updated_at??"2026-11-06T18:00:00Z";return{profile:row?{...row,user_id:row.user_id??row.id,updated_at:revision}:null,revision:row?revision:null};},
  FirestoreService:{getProfile:read,followShop:follow,unfollowShop:follow},getAuthModule:async()=>({getApiAuthHeaders:async()=>({})}),fetch,
  showAlert:()=>{},setCurrentScreen:()=>{},triggerHaptic:()=>{},
  setUserProfile:next=>update("profile",next),setFavorites:next=>update("favorites",next),
  supabase:{auth:{getUser:async()=>({data:{user:null}})}},
  console:{debug:()=>{},warn:()=>{},info:()=>{}},setTimeout:()=>{},
 };
 const run=new Function(...Object.keys(deps),emitted)(...Object.values(deps));
 const switchTo=uid=>{auth.currentUser=identity(uid);profile={id:uid,fullName:uid+" ready"};profileState={...initialCustomerProfileState(emptyCustomerProfile()),profile,owner:auth.currentUser};favorites=[uid+" favorite"];favoriteState={items:favorites,intent:null};profileState.favoriteState=favoriteState;};
 return {run,auth,switchTo,writes,contexts,notices,get basis(){return profileState.basis;},toggleFavorite:id=>new Function(...Object.keys(deps),"favorites","customerProfileState",toggleCode)(...Object.values(deps),favorites,profileState)(id),runFavoritesEffect:()=>new Function(...Object.keys(deps),"favorites","favoriteState",effectCode)(...Object.values(deps),favorites,favoriteState)(),setFavoriteIntent:next=>{favoriteState={items:next,intent:{identity:auth.currentUser,userId:auth.currentUser.uid,basis:profileState.basis}};favorites=next;profileState.favoriteState=favoriteState;},flush:()=>updates.splice(0).forEach(f=>f()),get profile(){return profile;},get favorites(){return favorites;}};
}
test("late A profile response cannot publish A details or favorites after B is ready",async()=>{
 const pending=deferred(),h=harness(()=>pending.promise),load=h.run("A");
 h.switchTo("B");pending.resolve({id:"A",fullName:"Private A",favorites:["A only"]});await load;
 assert.deepEqual(h.profile,{id:"B",fullName:"B ready"});assert.deepEqual(h.favorites,["B favorite"]);
});
test("late API response body cannot publish a signed-out account",async()=>{
 const pending=deferred(),bodyStarted=deferred();
 const h=harness(()=>{bodyStarted.resolve();return pending.promise;});
 const load=h.run("A");await bodyStarted.promise;h.auth.currentUser=null;
 pending.resolve({user_id:"A",fullName:"Private A",favorites:["A only"]});await load;
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

test("confirmed null fields and zero coordinates replace stale same-account display",async()=>{
 const h=harness(async()=>({user_id:"A",fullName:null,address:null,photo_url:null,latitude:0,longitude:0,role:"admin",favorites:[]}));await h.run("A");
 assert.equal(h.profile.fullName,"");assert.equal(h.profile.address,"");assert.equal(h.profile.photoURL,"");assert.equal(h.profile.latitude,0);assert.equal(h.profile.role,"user");assert.equal(h.profile.is_admin,false);
});

test("failed profile reads cannot replace current display with invented saved data",async()=>{
 const h=harness(async()=>{throw Error("service unavailable");});await h.run("A");
 assert.equal(h.profile.fullName,"Initial");assert.deepEqual(h.favorites,["initial"]);
});

test("loading authoritative favorites cannot enqueue a profile mutation",async()=>{
 const h=harness(async()=>({user_id:"A",fullName:"Alice",favorites:["server-favorite"]}));await h.run("A");h.runFavoritesEffect();assert.deepEqual(h.writes,[]);
});
test("clearing favorites for a verified absent profile cannot enqueue a mutation",async()=>{
 const h=harness(async()=>null);await h.run("A");h.runFavoritesEffect();assert.deepEqual(h.writes,[]);
});
test("suppressing hydration does not suppress a later explicit favorite change",async()=>{
 const h=harness(async()=>({user_id:"A",fullName:"Alice",favorites:["server-favorite"]}));await h.run("A");h.runFavoritesEffect();
 h.setFavoriteIntent(["server-favorite","chosen"]);h.runFavoritesEffect();assert.deepEqual(h.writes,[{user_id:"A",favorites:["server-favorite","chosen"]}]);
});
test("actual favorite control marks only a confirmed user action for profile sync",async()=>{
 const h=harness(async()=>null);await h.toggleFavorite("chosen");h.runFavoritesEffect();assert.deepEqual(h.writes,[{user_id:"A",favorites:["initial","chosen"]}]);
});
test("a delayed follow acknowledgement cannot adopt a fresh same-UID session",async()=>{
 const pending=deferred();const h=harness(async()=>null,{follow:()=>pending.promise});const toggle=h.toggleFavorite("chosen");
 h.auth.currentUser=identity("A");pending.resolve();await toggle;h.runFavoritesEffect();assert.deepEqual(h.writes,[]);assert.deepEqual(h.favorites,["initial"]);
});
test("StrictMode eager result and updater replay retain one explicit favorite sync",async()=>{
 const h=harness(async()=>null,{strictReplay:true});await h.toggleFavorite("chosen");h.runFavoritesEffect();h.runFavoritesEffect();
 assert.deepEqual(h.favorites,["initial","chosen"]);assert.deepEqual(h.writes,[{user_id:"A",favorites:["initial","chosen"]}]);
});

test("a delayed favorite acknowledgement retains the basis captured before the action",async()=>{
 const pending=deferred(),h=harness(async()=>({user_id:"A",fullName:"A"}),{follow:()=>pending.promise});
 const original=h.basis;const toggle=h.toggleFavorite("chosen");await h.run("A");assert.notEqual(h.basis,original);
 pending.resolve();await toggle;h.runFavoritesEffect();assert.equal(h.contexts[0],original);
});
test("unverified favorites cannot initiate a follow or profile write",async()=>{
 let follows=0;const h=harness(async()=>{throw Error("Unavailable");},{follow:async()=>follows++});
 h.switchTo("A");await h.toggleFavorite("chosen");h.runFavoritesEffect();assert.equal(follows,0);assert.deepEqual(h.writes,[]);
});
test("central favorite failure is visible and cannot fall back to a legacy writer",async()=>{
 const h=harness(async()=>null,{centralFailure:true});await h.toggleFavorite("chosen");h.runFavoritesEffect();await Promise.resolve();await Promise.resolve();
 assert.deepEqual(h.writes,[]);assert.equal(h.notices[0]?.type,"error");
 assert.doesNotMatch(favoritesEffect,/upsertProfileWithRPC|queueProfileSync/);
});

test("the actual App read callback cannot roll back favorites from an older server revision",async()=>{
 let reads=0;const h=harness(async()=>++reads===1?{user_id:'A',fullName:'Fresh',favorites:['fresh'],updated_at:'2026-11-06T18:00:01Z'}:{user_id:'A',fullName:'Old',favorites:['old'],updated_at:'2026-11-06T18:00:00Z'});
 await h.run('A');await h.run('A');assert.equal(h.profile.fullName,'Fresh');assert.deepEqual(h.favorites,['fresh']);h.runFavoritesEffect();assert.deepEqual(h.writes,[]);
});
