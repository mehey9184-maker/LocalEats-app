import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createConfirmedProfileTransport} from "../src/lib/confirmedCustomerProfile.ts";

let current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "synthetic-token-A"};
let calls=[];
const json=(data,status=200,contentType="application/json")=>new Response(
 typeof data==="string"?data:JSON.stringify(data),{status,headers:{"content-type":contentType}}
);
const settings=(fetcher,enabled=true,canWrite=true)=>createConfirmedProfileTransport({
 origin:"https://api.example.test",currentUser:()=>current,readsEnabled:()=>enabled,
 writesEnabled:()=>canWrite,fetcher
});
test("real profile save requires Firebase token, matching owner and verified server JSON receipt",async()=>{
 calls=[];current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "synthetic-token-A"};
 const api=settings(async (url,init)=>{
  calls.push({url,init});
  return json({success:true,profile:{user_id:"customer-a",fullName:"A User",phone:"0712345678",role:"customer"}});
 });
 const value=await api.save("customer-a",{fullName:"A User",phone:"0712345678"});
 assert.equal(value.user_id,"customer-a");
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,"https://api.example.test/api/v1/profiles/me");
 assert.equal(calls[0].init.headers.Authorization,"Bearer fb-synthetic-token-A");
 const payload=JSON.parse(calls[0].init.body);
 assert.deepEqual(payload,{fullName:"A User",phone:"0712345678"});
 assert.equal(calls[0].init.cache,"no-store");
});
test("customer B cannot request A profile or save B changes under A identity",async()=>{
 current={uid:"customer-b",isAnonymous:false,getIdToken:async()=> "synthetic-token-B"};
 let called=0;
 const api=settings(async()=>{called++;return json({success:true,profile:{user_id:"customer-a"}})});
 await assert.rejects(()=>api.read("customer-a"),/matching registered account/);
 await assert.rejects(()=>api.save("customer-a",{fullName:"Fraud"}),/matching registered account/);
 assert.equal(called,0);
});
test("user-controllable roles and account ids are prohibited before any HTTP request",async()=>{
 current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "token"};
 let called=0;
 const api=settings(async()=>{called++;return json({success:true,profile:{user_id:"customer-a"}})});
 for(const patch of [{role:"admin"},{user_id:"customer-b"},{id:"customer-b"},{email:"fake@sample.test"},{updated_at:"now"}]){
  await assert.rejects(()=>api.save("customer-a",patch),/not authorized/);
 }
 assert.equal(called,0);
});
test("disabled flags and anonymous guests fail closed without sending private data",async()=>{
 let called=0;
 current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "token"};
 const fetcher=async()=>{called++;return json({success:true,profile:{user_id:"customer-a"}})};
 await assert.rejects(()=>settings(fetcher,false,true).read("customer-a"),/not enabled/);
 await assert.rejects(()=>settings(fetcher,true,false).save("customer-a",{fullName:"A"}),/not enabled/);
 current={uid:"guest",isAnonymous:true,getIdToken:async()=> "anon"};
 await assert.rejects(()=>settings(fetcher).save("guest",{fullName:"Guest"}),/registered account/);
 assert.equal(called,0);
});
test("HTML, unconfirmed replies, and wrong-profile receipts never look like success",async()=>{
 current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "token"};
 for(const response of [
 json("<html>Welcome</html>",200,"text/html"),
 json({success:false,profile:{user_id:"customer-a"}}),
 json({success:true,profile:{user_id:"customer-b",fullName:"B"}}),
 json({success:true,profile:{user_id:"customer-a"}},503)
 ]){
  const api=settings(async()=>response);
  await assert.rejects(()=>api.save("customer-a",{fullName:"A User"}),/not confirmed|verified response/);
 }
});
test("account switch during pending HTTP response cannot install old profile",async()=>{
 let resolveReply;
 const pending=new Promise(resolve=>{resolveReply=resolve});
 current={uid:"customer-a",isAnonymous:false,getIdToken:async()=> "token-A"};
 const api=settings(async()=>pending);
 const operation=api.read("customer-a");
 for(let n=0;n<15;n++)await Promise.resolve();
 current={uid:"customer-b",isAnonymous:false,getIdToken:async()=> "token-B"};
 resolveReply(json({success:true,profile:{user_id:"customer-a"}}));
 await assert.rejects(operation,/account changed/);
});
test("Customer screen updates only verified server identity; existing UX remains",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const complete=readFileSync(new URL("../src/screens/auth/CompleteProfileScreen.tsx",import.meta.url),"utf8");
 assert.match(app,/VITE_PROFILE_BACKEND_ENABLED==="true"/);
 assert.match(app,/VITE_PROFILE_WRITES_ENABLED==="true"/);
 assert.match(app,/const saved=await confirmedProfileTransport.save/);
 assert.match(app,/const result=await confirmedProfileTransport.read\(userId\)/);
 assert.match(app,/trustedProfileRole\(saved.role\)/);
 assert.doesNotMatch(app,/const updated = \{ \.\.\.userProfile, \.\.\.data \};\s*setUserProfile\(updated\)/);
 assert.match(complete,/onSave: \(data: Partial<UserProfile>\) => Promise<void>/);
 assert.match(complete,/await onSave\(\{ photoURL: publicUrl \}\)/);
 assert.match(complete,/uploaded and confirmed saved/);
 assert.doesNotMatch(complete,/saved to Supabase \(<200KB\)!/);
});

test("server-owned profile mode does not reuse cached private fields or elevate metadata roles",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.match(app,/const trustedProfileRole=\(_value:unknown\):UserProfile\["role"\]=>"user"/);
 assert.match(app,/return import\.meta\.env\.VITE_PROFILE_BACKEND_ENABLED==="true"\s*\? blank : safeLocalStorageGet\("userProfile",blank\)/);
 assert.match(app,/if\(import\.meta\.env\.VITE_PROFILE_BACKEND_ENABLED==="true"\)return;\s*if \(userProfile/);
 assert.match(app,/if\(import\.meta\.env\.VITE_PROFILE_BACKEND_ENABLED==="true"\)\{\s*setUserProfile\(\{\s*id:session\.user\.id/);
 assert.match(app,/setUserProfile\(_prev=>\(\{\s*id:userId,role:trustedProfileRole\(result.role\)/);
 assert.match(app,/userProfile\.id===session\?\.user\?\.id/);
 assert.match(app,/userProfile\.id!==uid/);
});
