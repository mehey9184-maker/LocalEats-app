#!/usr/bin/env node
/**
 * MANUAL ONLY: auth/persistence integration smoke for isolated P5 Preview.
 * Does not create projects or store credentials; tokens come from env only.
 * Never run with real LocalEats users or Production credentials.
 */
import assert from "node:assert/strict";

const {
  P5_PREVIEW_URL, P5_TEST_UID_A, P5_TEST_UID_B,
  P5_TEST_ID_TOKEN_A, P5_TEST_ID_TOKEN_B,
  P5_STAGING_SUPABASE_REF, P5_EXECUTE_STAGING_WRITES,
}=process.env;

const required={P5_PREVIEW_URL,P5_TEST_UID_A,P5_TEST_UID_B,
 P5_TEST_ID_TOKEN_A,P5_TEST_ID_TOKEN_B,P5_STAGING_SUPABASE_REF};
if(P5_EXECUTE_STAGING_WRITES!=="YES_STAGING_ONLY" ||
   Object.values(required).some(value=>!value)){
 console.log("SKIPPED P5 smoke: explicit staging-only inputs and confirmation required.");
 process.exit(0);
}

const origin=new URL(P5_PREVIEW_URL);
assert.equal(origin.protocol,"https:","Only HTTPS Preview is allowed");
assert.match(origin.hostname,/^project-x7cvt-[a-z0-9]+-mehey9184-makers-projects\.vercel\.app$/,
 "Only an individual LocalEats Vercel Preview deployment is allowed");
assert.equal(origin.pathname,"/","Use only the Preview origin, without path");
assert.equal(origin.search,"");
assert.equal(origin.hash,"");
assert.notEqual(P5_STAGING_SUPABASE_REF,"phdjumtqkooyppxozqsi","Production Supabase prohibited");
assert.notEqual(P5_TEST_UID_A,P5_TEST_UID_B,"Two different staging test accounts required");

const api=async(method,path,token,body)=>{
 const response=await fetch(new URL(path,origin),{
  method,
  headers:{"Authorization":"Bearer fb-"+token,"Content-Type":"application/json"},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
  cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000),
 });
 const text=await response.text();
 let json;try{json=JSON.parse(text);}
 catch{throw new Error("Non-JSON API response: HTTP "+response.status);}
 return {status:response.status,data:json};
};

const aPath="/api/profiles/"+encodeURIComponent(P5_TEST_UID_A);
const bPath="/api/profiles/"+encodeURIComponent(P5_TEST_UID_B);

// Prove identity isolation BEFORE sending any staging write.
const wrongRead=await api("GET",aPath,P5_TEST_ID_TOKEN_B);
assert.equal(wrongRead.status,403,"Account B must not read A");
const wrongWrite=await api("POST","/api/profiles",P5_TEST_ID_TOKEN_B,{
 user_id:P5_TEST_UID_A,fullName:"Forbidden P5",
});
assert.equal(wrongWrite.status,403,"Account B must not edit A");
console.log("PASS: staging account isolation before writes");
const bBefore=await api("GET",bPath,P5_TEST_ID_TOKEN_B);
assert.ok([200,404].includes(bBefore.status));

const before=await api("GET",aPath,P5_TEST_ID_TOKEN_A);
assert.ok([200,404].includes(before.status),"Account A's staging profile is readable or absent");
const originalRole=before.status===200?before.data.profile?.role:undefined;
const originalEmail=before.status===200?before.data.profile?.email:undefined;
const name="P5 Staging User A "+new Date().toISOString().slice(0,19).replace("T"," ");

const saved=await api("POST","/api/profiles",P5_TEST_ID_TOKEN_A,{
 user_id:P5_TEST_UID_A,fullName:name,phone:"071 234 5678",
 role:"super_admin",is_admin:true,email:"forged@example.invalid",
});
assert.equal(saved.status,200,"Staging profile update must be confirmed");
assert.equal(saved.data?.success,true);
const after=await api("GET",aPath,P5_TEST_ID_TOKEN_A);
assert.equal(after.status,200);
assert.equal(after.data.profile?.user_id,P5_TEST_UID_A);
assert.equal(after.data.profile?.fullName,name,"Read-after-write must match");
assert.equal(after.data.profile?.phone,"+27712345678","Phone must normalize");
assert.equal(after.data.profile?.role,originalRole??"customer","Client cannot escalate roles");
if(originalEmail!==undefined)assert.equal(after.data.profile?.email,originalEmail);
assert.notEqual(after.data.profile?.email,"forged@example.invalid");
console.log("PASS: staging profile saved, read-back confirmed, protected fields intact");

const bAfter=await api("GET",bPath,P5_TEST_ID_TOKEN_B);
assert.deepEqual(bAfter.data,bBefore.data,"Account A must not mutate account B");
console.log("PASS: Account B data unchanged");
console.log("P5 staging smoke PASS. No Production API or database was contacted by this script.");
