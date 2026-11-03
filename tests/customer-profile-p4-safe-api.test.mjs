import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  previewProfileEnabled,handleProfileCollection,handleProfileItem,
} from "../src/server/previewProfileApi.ts";

const app=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const write=(uid,changes,headers={})=>new Request("https://preview.local/api/profiles",{
  method:"POST",
  headers:{"content-type":"application/json",authorization:"Bearer fb-test-token",...headers},
  body:JSON.stringify({user_id:uid,...changes}),
});
const read=(id,headers={})=>new Request("https://preview.local/api/profiles/"+encodeURIComponent(id),{
  headers:{authorization:"Bearer fb-test-token",...headers},
});
const staging={
  VERCEL_ENV:"preview",
  VERCEL_GIT_COMMIT_REF:"repair/customer-profile-p4-safe-api-preview-01",
  PROFILE_P4_ENABLE_STAGING_WRITES:"true",
  PROFILE_P4_STAGING_SUPABASE_REF:"staging1234567",
  PROFILE_P4_STAGING_SUPABASE_URL:"https://staging1234567.supabase.co",
  PROFILE_P4_STAGING_SUPABASE_SECRET_KEY:"test-only-not-a-real-secret",
  PROFILE_P4_STAGING_FIREBASE_PROJECT_ID:"localeats-staging-test",
};
function makeServices(owner="ownerA",initial={}){
  const rows=new Map(Object.entries(initial));
  const calls={reads:[],inserts:[],updates:[]};
  const services={
    verifyFirebaseToken:async(token)=>token==="test-token"?{uid:owner,email:"verified@staging.example"}:null,
    readProfile:async(uid)=>{calls.reads.push(uid);return rows.get(uid)??null;},
    insertProfile:async(row)=>{calls.inserts.push(row);rows.set(row.user_id,row);return row;},
    updateProfile:async(uid,patch)=>{calls.updates.push({uid,patch});const saved={...rows.get(uid),...patch};rows.set(uid,saved);return saved;},
  };
  return {services,calls,rows};
}

test("P4 defaults closed, even when an existing Production Supabase or Firebase project is present",()=>{
 assert.equal(previewProfileEnabled({}),false);
 assert.equal(previewProfileEnabled({...staging,VERCEL_ENV:"production"}),false);
 assert.equal(previewProfileEnabled({...staging,VERCEL_GIT_COMMIT_REF:"main"}),false);
 assert.equal(previewProfileEnabled({...staging,VERCEL_GIT_COMMIT_REF:"repair/customer-profile-p3-backend-security-01"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_ENABLE_STAGING_WRITES:"false"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_STAGING_FIREBASE_PROJECT_ID:"localeats-5e26e"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_STAGING_SUPABASE_REF:"phdjumtqkooyppxozqsi",PROFILE_P4_STAGING_SUPABASE_URL:"https://phdjumtqkooyppxozqsi.supabase.co"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_STAGING_SUPABASE_URL:"http://staging1234567.supabase.co"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_STAGING_SUPABASE_URL:"https://anotherproject.supabase.co"}),false);
 assert.equal(previewProfileEnabled({...staging,PROFILE_P4_STAGING_SUPABASE_SECRET_KEY:""}),false);
 assert.equal(previewProfileEnabled(staging),true);
});

test("P4 routes return API JSON, not HTML, and never write without isolated staging services",async()=>{
 const disabledWrite=await handleProfileCollection(write("ownerA",{fullName:"Person"}),null);
 const disabledRead=await handleProfileItem(read("ownerA"),null);
 assert.equal(disabledWrite.status,503);
 assert.equal(disabledRead.status,503);
 assert.equal(disabledWrite.headers.get("content-type").includes("application/json"),true);
 assert.equal(disabledRead.headers.get("cache-control").includes("no-store"),true);
 assert.equal((await disabledWrite.json()).success,false);
 assert.equal((await disabledRead.json()).profile,undefined);
 const root=await handleProfileCollection(new Request("https://preview.local/api/profiles"),null);
 assert.equal(root.status,405);
 assert.equal((await root.json()).error,"Method not allowed");
});

test("P4 rejects missing or fraudulent auth and cross-account read or write before touching a database",async()=>{
 const {services,calls}=makeServices();
 assert.equal((await handleProfileCollection(write("ownerA",{fullName:"A"},{authorization:""}),services)).status,401);
 assert.equal((await handleProfileCollection(write("ownerB",{fullName:"B"}),services)).status,403);
 assert.equal((await handleProfileItem(read("ownerB"),services)).status,403);
 assert.equal((await handleProfileItem(read("ownerA",{authorization:"Bearer sb-test-token"}),services)).status,401);
 assert.equal(calls.reads.length,0);
 assert.equal(calls.inserts.length,0);
 assert.equal(calls.updates.length,0);
});

test("P4 creates staging customer profiles only with Firebase-verified email, never supplied role/email",async()=>{
 const {services,rows,calls}=makeServices();
 const response=await handleProfileCollection(write("ownerA",{
   fullName:"Local Customer",phone:"071 234 5678",
   role:"admin",is_admin:true,email:"forged@attacker.example",
 }),services);
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.success,true);
 assert.equal(rows.get("ownerA").role,"customer");
 assert.equal(rows.get("ownerA").email,"verified@staging.example");
 assert.equal(rows.get("ownerA").phone,"+27712345678");
 assert.equal("is_admin" in rows.get("ownerA"),false);
 assert.equal(calls.inserts.length,1);
 assert.equal(calls.updates.length,0);
});

test("P4 preserves existing merchant role and email on customer-editable profile updates",async()=>{
 const original={user_id:"ownerA",role:"merchant",email:"merchant@trusted.example",fullName:"Before"};
 const {services,rows,calls}=makeServices("ownerA",{ownerA:original});
 const result=await handleProfileCollection(write("ownerA",{
   fullName:"Updated",role:"admin",email:"hijacked@example.com",
 }),services);
 assert.equal(result.status,200);
 assert.equal(rows.get("ownerA").role,"merchant");
 assert.equal(rows.get("ownerA").email,"merchant@trusted.example");
 assert.equal(rows.get("ownerA").fullName,"Updated");
 assert.equal(calls.inserts.length,0);
 assert.equal(calls.updates.length,1);
 assert.equal(calls.updates[0].uid,"ownerA");
 assert.equal("role" in calls.updates[0].patch,false);
});

test("P4 only returns the verified account's saved row and fails closed on storage errors",async()=>{
 const initial={user_id:"ownerA",role:"customer",fullName:"Owned"};
 const {services}=makeServices("ownerA",{ownerA:initial});
 const ok=await handleProfileItem(read("ownerA"),services);
 assert.equal(ok.status,200);
 assert.equal((await ok.json()).profile.fullName,"Owned");
 const missing=await handleProfileItem(read("missing"),makeServices("missing").services);
 assert.equal(missing.status,404);
 const broken={...services,readProfile:async()=>{throw new Error("db connection or secret");}};
 const failed=await handleProfileItem(read("ownerA"),broken);
 assert.equal(failed.status,503);
 assert.equal(JSON.stringify(await failed.json()).includes("secret"),false);
 const failedSave=await handleProfileCollection(write("ownerA",{phone:"+27712345678"}),broken);
 assert.equal(failedSave.status,503);
 const falseAck={...services,insertProfile:async()=>({user_id:"ownerB"})};
 assert.equal((await handleProfileCollection(write("ownerB",{fullName:"Test"}),falseAck)).status,403);
});

test("P4 validates methods, body shape and authenticated route paths",async()=>{
 const {services}=makeServices();
 const malformed=await handleProfileCollection(new Request("https://preview.local/api/profiles",{
   method:"POST",headers:{"content-type":"application/json",authorization:"Bearer fb-test-token"},body:"not JSON",
 }),services);
 assert.equal(malformed.status,400);
 const badType=await handleProfileCollection(new Request("https://preview.local/api/profiles",{
   method:"POST",headers:{"content-type":"text/plain",authorization:"Bearer fb-test-token"},body:"hello",
 }),services);
 assert.equal(badType.status,415);
 const oversized=await handleProfileCollection(write("ownerA",{fullName:"A".repeat(9000)}),services);
 assert.equal(oversized.status,413);
 assert.equal((await handleProfileItem(read("ownerA").clone(),services)).status,404);
 assert.equal((await handleProfileItem(new Request("https://preview.local/api/profiles/ownerA/more"),services)).status,404);
 assert.equal((await handleProfileItem(new Request("https://preview.local/api/profiles/%2F"),services)).status,400);
});

test("P4 Vercel integration preserves SPA pages, skips API fallback and never deploys legacy Express orders",()=>{
 const vercel=JSON.parse(app("../vercel.json"));
 assert.deepEqual(vercel.rewrites,[{source:"/:path((?!api/).*)",destination:"/index.html"}]);
 const collection=app("../api/profiles.ts"),item=app("../api/profiles/[id].ts");
 assert.match(collection,/getStagingProfileServices\(process\.env\)/);
 assert.match(item,/getStagingProfileServices\(process\.env\)/);
 assert.doesNotMatch(collection+item,/server\.ts|createViteServer|\/api\/orders/);
 assert.match(app("../src/services/customerOrdersPolicy.ts"),/confirmedCustomerPickupOrders/);
});
