import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyStagingFirebaseToken,previewProfileEnabled} from "../src/server/previewProfileApi.ts";

const project="localeats-p5-staging-test";
const token=(claims={})=>{
 const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url");
 const header={alg:"RS256",kid:"fake-kid-for-mocked-lookup-only"};
 const body={
  aud:project,
  iss:"https://securetoken.google.com/"+project,
  sub:"staging-owner-a",
  auth_time:1793500000,
  exp:1793700000,
  ...claims,
 };
 return [enc(header),enc(body),"fake-signature"].join(".");
};
const lookup=(users,opts={})=>{
 const calls=[];
 const fakeFetch=async(url,request)=>{
  calls.push({url,request});
  if(opts.throwError)throw new Error("network failure");
  return Response.json(users===null?{error:"INVALID_ID_TOKEN"}:{users}, {status:users===null?401:200});
 };
 return {calls,fakeFetch};
};

test("P5 rejects a JWT for the wrong Firebase project without calling Google",async()=>{
 const f=lookup([{localId:"staging-owner-a"}]);
 assert.equal(await verifyStagingFirebaseToken(token({aud:"localeats-5e26e"}),project,"test-key",f.fakeFetch),null);
 assert.equal(await verifyStagingFirebaseToken(token({iss:"https://securetoken.google.com/production-project"}),project,"test-key",f.fakeFetch),null);
 assert.equal(await verifyStagingFirebaseToken("garbage",project,"test-key",f.fakeFetch),null);
 assert.equal(f.calls.length,0);
});

test("P5 requires Firebase's own staging account lookup to succeed before trusting user identity",async()=>{
 const f=lookup([{localId:"staging-owner-a",email:"a@example.test",disabled:false,validSince:"1793400000"}]);
 const actual=await verifyStagingFirebaseToken(token(),project,"test-key",f.fakeFetch);
 assert.deepEqual(actual,{uid:"staging-owner-a",email:"a@example.test"});
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].url,"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key");
 assert.equal(f.calls[0].request.method,"POST");
 assert.equal(JSON.parse(f.calls[0].request.body).idToken,token());
 assert.equal(f.calls[0].request.cache,"no-store");
});

test("P5 rejects invalid, disabled, revoked, mismatched and unavailable Firebase accounts",async()=>{
 const cases=[
  null,
  [],
  [{localId:"staging-owner-b"}],
  [{localId:"staging-owner-a",disabled:true}],
  [{localId:"staging-owner-a",validSince:"1793500001"}],
  [{localId:"staging-owner-a"},{localId:"staging-owner-b"}],
 ];
 for(const response of cases){
  const f=lookup(response);
  assert.equal(await verifyStagingFirebaseToken(token(),project,"test-key",f.fakeFetch),null);
 }
 const failed=lookup([], {throwError:true});
 assert.equal(await verifyStagingFirebaseToken(token(),project,"test-key",failed.fakeFetch),null);
});

test("P5 gate requires a branch-specific enable flag plus two distinct staging projects and Firebase API key",()=>{
 const env={
  VERCEL_ENV:"preview",
  VERCEL_GIT_COMMIT_REF:"repair/customer-profile-p5-staging-auth-readiness-01",
  PROFILE_P5_ENABLE_STAGING_WRITES:"true",
  PROFILE_P5_STAGING_SUPABASE_REF:"p5staging12345",
  PROFILE_P5_STAGING_SUPABASE_URL:"https://p5staging12345.supabase.co",
  PROFILE_P5_STAGING_SUPABASE_SECRET_KEY:"test-only-not-real",
  PROFILE_P5_STAGING_FIREBASE_PROJECT_ID:project,
  PROFILE_P5_STAGING_FIREBASE_WEB_API_KEY:"test-only-web-api-key",
 };
 assert.equal(previewProfileEnabled(env),true);
 assert.equal(previewProfileEnabled({...env,VERCEL_ENV:"production"}),false);
 assert.equal(previewProfileEnabled({...env,VERCEL_GIT_COMMIT_REF:"repair/customer-profile-p4-safe-api-preview-01"}),false);
 assert.equal(previewProfileEnabled({...env,PROFILE_P5_ENABLE_STAGING_WRITES:"false"}),false);
 assert.equal(previewProfileEnabled({...env,PROFILE_P5_STAGING_FIREBASE_WEB_API_KEY:""}),false);
 assert.equal(previewProfileEnabled({...env,PROFILE_P5_STAGING_FIREBASE_PROJECT_ID:"localeats-5e26e"}),false);
 assert.equal(previewProfileEnabled({...env,PROFILE_P5_STAGING_SUPABASE_REF:"phdjumtqkooyppxozqsi",
  PROFILE_P5_STAGING_SUPABASE_URL:"https://phdjumtqkooyppxozqsi.supabase.co"}),false);
});

test("P5 staging server uses Firebase REST lookup, not a missing firebase-admin dependency or production API keys",()=>{
 const src=readFileSync(new URL("../src/server/previewProfileApi.ts",import.meta.url),"utf8");
 assert.match(src,/identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/);
 assert.match(src,/PROFILE_P5_STAGING_FIREBASE_WEB_API_KEY/);
 assert.match(src,/PROFILE_P5_STAGING_SUPABASE_SECRET_KEY/);
 assert.doesNotMatch(src,/import\("firebase-admin/);
 assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY|FIREBASE_ADMIN_PRIVATE_KEY|FIREBASE_SERVICE_ACCOUNT/);
 assert.match(src,/getStagingProfileServices/);
});
