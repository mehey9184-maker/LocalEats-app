#!/usr/bin/env node
/**
 * Isolated staging-only authenticated Client profile contract check.
 * Uses DUMMY Firebase test accounts; never accept real customer credentials.
 * Read-only unless P0_EXECUTE_STAGING_WRITES=YES_STAGING_ONLY explicitly set.
 */
import assert from "node:assert/strict";

const preview=process.env.P0_CUSTOMER_PREVIEW_URL??"";
const uidA=process.env.P0_TEST_UID_A??"";
const uidB=process.env.P0_TEST_UID_B??"";
const tokenA=process.env.P0_TEST_FIREBASE_TOKEN_A??"";
const tokenB=process.env.P0_TEST_FIREBASE_TOKEN_B??"";
const write=process.env.P0_EXECUTE_STAGING_WRITES==="YES_STAGING_ONLY";
const url=new URL(preview||"https://invalid.example");
assert.equal(url.protocol,"https:","Use HTTPS");
assert.match(url.hostname,/^project-x7cvt-[a-z0-9-]+-mehey9184-makers-projects\.vercel\.app$/,
  "Only exact LocalEats Customer Vercel Preview domains may be tested");
assert.ok(!preview.includes("@") && !url.username && !url.password,"No credentials in the URL");
assert.ok(uidA && uidB && uidA!==uidB && uidA.length<128 && uidB.length<128,
  "Use two distinct Firebase dummy test-account UIDs");
assert.ok(tokenA && tokenB && tokenA!==tokenB,"Provide separate short-lived staging Firebase ID tokens via secrets");
const request=async(method,path,token,body)=>{
  const response=await fetch(new URL(path,url),{
    method,
    headers:{
      Accept:"application/json",
      ...(token?{Authorization:"Bearer fb-"+token}:{}),
      ...(body?{"Content-Type":"application/json"}:{}),
    },
    ...(body?{body:JSON.stringify(body)}:{}),
    redirect:"error",
    cache:"no-store",
    signal:AbortSignal.timeout(20000),
  });
  const type=response.headers.get("content-type")??"";
  assert.match(type,/application\/json/,"Profile endpoint must return JSON, not SPA fallback");
  const data=await response.json();
  assert.equal(typeof data.success,"boolean");
  return {status:response.status,data};
};
const pathA="/api/profiles/"+encodeURIComponent(uidA);
const pathB="/api/profiles/"+encodeURIComponent(uidB);
const anonymous=await request("GET",pathA);
assert.equal(anonymous.status,401,"Unsigned request must be rejected");
const wrong=await request("GET",pathB,tokenA);
assert.equal(wrong.status,403,"User A must not read user B's profile");
const ownA=await request("GET",pathA,tokenA);
assert.ok([200,404].includes(ownA.status),"A may see own profile or missing test row");
const ownB=await request("GET",pathB,tokenB);
assert.ok([200,404].includes(ownB.status),"B may see own profile or missing test row");
if(ownA.status===200)assert.equal(ownA.data.profile?.user_id,uidA);
if(ownB.status===200)assert.equal(ownB.data.profile?.user_id,uidB);
console.log("PASS staging: unsigned=401, cross-account=403, own-account read authenticated (200/404)");

if(!write){
 console.log("READ-ONLY PASS: no POST, database write, or real order was attempted.");
 process.exit(0);
}
const time=new Date().toISOString();
const aName="P0 Staging Test A "+time,bName="P0 Staging Test B "+time;
for(const [uid,token,name] of [[uidA,tokenA,aName],[uidB,tokenB,bName]]){
 const saved=await request("POST","/api/profiles",token,{
  user_id:uid,fullName:name,city:"Test Only",role:"admin",
 });
 assert.equal(saved.status,200,"Staging-only dummy profile POST must succeed");
 assert.equal(saved.data.profile?.user_id,uid);
 assert.ok(!Object.hasOwn(saved.data.profile??{},"role"),"Admin/role fields must not leak");
 const read=await request("GET","/api/profiles/"+encodeURIComponent(uid),token);
 assert.equal(read.status,200,"Read after dummy write");
 assert.equal(read.data.profile?.fullName,name);
}
const forged=await request("POST","/api/profiles",tokenA,{user_id:uidB,fullName:"forged"});
assert.equal(forged.status,400,"User A cannot change user B's profile");
const bAfter=await request("GET",pathB,tokenB);
assert.equal(bAfter.data.profile?.fullName,bName,"Forged attempt must not alter B's data");
console.log("STAGING WRITE PASS: own-account writes, read-after-write, role stripping and account isolation.");
