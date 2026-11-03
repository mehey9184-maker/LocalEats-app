import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {saveConfirmedCustomerProfile} from "../src/services/customerProfilePolicy.ts";

const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const profile=source.slice(source.indexOf("function ProfileScreen({"),source.indexOf("const QuantityModal ="));
const auth={uid:"ownerA",getIdToken:async()=>"test-firebase-token"};
const response=(ok,data)=>({ok,json:async()=>data});
const updates={fullName:"Test Customer",phone:"+27 71 234 5678",city:"Tembisa",address:"Main Street"};

test("P1 profile updates are restricted to the signed-in account with verified API readback",async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(options.method==="POST")return response(true,{success:true});
  return response(true,{profile:{user_id:"ownerA",...updates,phone:"+27712345678"}});
 };
 const saved=await saveConfirmedCustomerProfile("ownerA",auth,updates,fetcher);
 assert.equal(saved.fullName,updates.fullName);
 assert.equal(calls.length,2);
 assert.equal(calls[0].url,"/api/profiles");
 assert.equal(calls[0].options.headers.Authorization,"Bearer fb-test-firebase-token");
 assert.equal(calls[1].url,"/api/profiles/ownerA");
 assert.equal(calls[1].options.method,"GET");
 assert.equal(JSON.parse(calls[0].options.body).user_id,"ownerA");
 assert.equal("role" in JSON.parse(calls[0].options.body),false);
});

test("P1 never sends edits for wrong, missing, or changing accounts",async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return response(true,{success:true});};
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",{...auth,uid:"ownerB"},updates,fetcher),/correct account/);
 await assert.rejects(saveConfirmedCustomerProfile(undefined,auth,updates,fetcher),/correct account/);
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",null,updates,fetcher),/correct account/);
 assert.equal(calls,0);
});

test("P1 refuses unconfirmed, fabricated, or mismatched save responses",async()=>{
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",auth,updates,
  async()=>response(true,{html:"index page"})),/not confirmed/);
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",auth,updates,
  async(url,options)=>options.method==="POST"?response(true,{success:true}):response(true,{profile:{user_id:"another",...updates}})),/could not be verified/);
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",auth,updates,
  async(url,options)=>options.method==="POST"?response(true,{success:true}):response(true,{profile:{user_id:"ownerA",...updates,phone:"different"}})),/could not be verified/);
 await assert.rejects(saveConfirmedCustomerProfile("ownerA",auth,{photoURL:"https://somewhere/picture.jpg"},async()=>response(true,{success:true})),/authenticated LocalEats upload/);
});

test("P1 ignores stale async profile responses and never auto-writes a fallback profile during reads",()=>{
 const hydration=source.slice(source.indexOf("const fetchUserProfile = useCallback"),source.indexOf("// Resubscribe only a previously opted-in account"));
 assert.match(hydration,/Profile response identity mismatch/);
 assert.match(hydration,/firebaseAuth\.currentUser\?\.uid!==userId/);
 assert.match(hydration,/safePrev:UserProfile=prev\.id===userId/);
 assert.doesNotMatch(hydration,/Profile Auto-Upsert Notice/);
 assert.doesNotMatch(hydration,/userMeta\.role/);
});

test("P1 hides stale account profiles and avoids optimistic queue-based save in profile route",()=>{
 assert.match(source,/userProfile\?\.id===session\.user\.id/);
 assert.match(source,/saveConfirmedCustomerProfile\(uid,firebaseAuth\.currentUser,data\)/);
 assert.match(source,/firebaseAuth\.currentUser\?\.uid!==uid/);
 assert.doesNotMatch(profile,/<DiagnosticTool\s*\/>/);
 assert.doesNotMatch(profile,/Mock recent images|Array\.from\(\{ length: 15 \}\)/);
 assert.doesNotMatch(profile,/Gold VIP Tier|Silver Tier|Bronze Tier/);
 assert.match(profile,/Loyalty rewards are not active/);
 assert.match(profile,/Phone Number/);
 assert.match(profile,/Format valid/);
 assert.match(profile,/No unsaved profile changes/);
 assert.match(profile,/Photo changes are unavailable in this Preview/);
 assert.match(profile,/No profile picture set/);
 assert.doesNotMatch(profile,/getAvatarUrl\(userProfile\.fullName\)/);
 assert.doesNotMatch(profile,/mock recent images/i);
 assert.match(profile,/Photo removal could not be confirmed/);
 assert.doesNotMatch(profile,/onClick=\{\(\) => setShowGalleryModal\(true\)\}/);
 assert.match(profile,/saved via API|confirmed by the account API|confirmed by the account API\./i);
});
