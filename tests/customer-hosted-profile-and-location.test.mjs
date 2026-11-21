import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {build} from "esbuild";

// Bundle one pure hosted API adapter: real React/Firebase/SQL/HTTP is NOT used.
const output=await build({
  entryPoints:["src/services/customerProfileApi.ts"],bundle:true,
  write:false,format:"esm",platform:"node",logLevel:"silent",
});
const profile=await import("data:text/javascript;base64,"+
  Buffer.from(output.outputFiles[0].contents).toString("base64"));
const account={uid:"synthetic-user-a",getIdToken:async()=>"synthetic-token"};
const base="https://api.example.test";
const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json; charset=utf-8"},
});
async function fails(fn,code){
  await assert.rejects(fn,e=>e?.code===code);
}

test("profile reads always use the standalone authenticated API and verified account",async()=>{
  let called=0;
  const transport=async(url,options)=>{
    called++;
    assert.equal(url,base+"/api/v1/profiles/me");
    assert.equal(options.method,"GET");
    assert.equal(options.headers.Authorization,"Bearer fb-synthetic-token");
    assert.equal(options.cache,"no-store");
    assert.equal(options.headers.Accept,"application/json");
    return json({success:true,profile:{user_id:"synthetic-user-a",fullName:"Customer A"}});
  };
  const result=await profile.hostedProfileRequest(base,account,"GET",undefined,transport,true);
  assert.equal(called,1);
  assert.equal(result.fullName,"Customer A");
  await fails(()=>profile.hostedProfileRequest(base,null,"GET",undefined,transport,true),"UNAUTHORIZED");
  assert.equal(called,1);
});

test("HTML SPA rewrites, blank responses, and wrong-account payloads never count as a profile",async()=>{
  await fails(()=>profile.hostedProfileRequest(base,account,"GET",undefined,async()=>new Response("<html>",{
    status:200,headers:{"Content-Type":"text/html"}}),true),"PROFILE_API_INVALID_RESPONSE");
  await fails(()=>profile.hostedProfileRequest(base,account,"GET",undefined,async()=>new Response("",{
    status:200,headers:{"Content-Type":"application/json"}}),true),"PROFILE_API_INVALID_RESPONSE");
  await fails(()=>profile.hostedProfileRequest(base,account,"GET",undefined,async()=>json({
    success:true,profile:{user_id:"another-user"}}),true),"PROFILE_OWNER_MISMATCH");
  await fails(()=>profile.hostedProfileRequest(base,account,"GET",undefined,async()=>new Response(
    "<html>",{status:404,headers:{"Content-Type":"text/html"}}),true),"PROFILE_API_INVALID_RESPONSE");
});

test("only signed-in current user may see a genuine JSON 404 absent profile",async()=>{
  const missing=await profile.hostedProfileRequest(base,account,"GET",undefined,
    async()=>json({success:false,code:"PROFILE_NOT_FOUND"},404),true);
  assert.equal(missing,null);
  await fails(()=>profile.hostedProfileRequest(base,account,"GET",undefined,
    async()=>json({success:false,code:"PROFILE_READ_UNAVAILABLE"},503),true),
    "PROFILE_READ_UNAVAILABLE");
});

test("no client-supplied role, user_id or email may appear in hosted profile writes",async()=>{
  let called=0;
  const transport=async(url,options)=>{
    called++;
    assert.deepEqual(JSON.parse(options.body),{fullName:"Customer A"});
    return json({success:true,profile:{user_id:"synthetic-user-a",fullName:"Customer A"}});
  };
  const value=await profile.hostedProfileRequest(base,account,"POST",{fullName:"Customer A"},transport,true);
  assert.equal(value.fullName,"Customer A");
  for(const key of ["user_id","role","email","updated_at","is_admin"]){
    await fails(()=>profile.hostedProfileRequest(base,account,"POST",{[key]:"wrong"},transport,true),
      "PROFILE_FIELDS_FORBIDDEN");
  }
  assert.equal(called,1);
});

test("production profile write-off has no hidden SPA fetch, Firestore mirror or queued fake success",()=>{
  const app=readFileSync("src/App.tsx","utf8");
  const service=readFileSync("src/lib/profileService.ts","utf8");
  const locator=readFileSync("src/services/customerProfileApi.ts","utf8");
  assert.doesNotMatch(app,/fetch\(`\/api\/profiles\/|fetch\(['"]\/api\/profiles/);
  assert.doesNotMatch(service,/fetch\(['"]\/api\/profiles/);
  assert.doesNotMatch(service,/FirestoreService\.saveProfile/);
  assert.match(service,/if\(!customerProfileWritesEnabled\(\)\)\s*return \{data:null,error:new Error\("PROFILE_WRITES_DISABLED"\)/);
  assert.match(app,/hostedProfileRequest\(/);
  assert.match(locator,/PROFILE_API_INVALID_RESPONSE/);
});

test("location timeout requires genuine device/browser position; no competing five-second override",()=>{
  const app=readFileSync("src/App.tsx","utf8");
  assert.match(app,/getCurrentPosition\(/);
  assert.match(app,/timeout: 25000/);
  assert.doesNotMatch(app,/timeout: 5000, enableHighAccuracy: false, maximumAge: 300000/);
  assert.match(app,/Location timed out\. Enable device and browser location services/);
  assert.match(app,/setFetchError/);
});
