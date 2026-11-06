import test from "node:test";
import assert from "node:assert/strict";
import {GET,POST} from "../api/profile";
import {normalizeProfileInput,ownerMatches,ProfileInputError} from "../api/_lib/profilePolicy";
import {stagingProfileConfig} from "../api/_lib/profileRuntimeConfig";
import {validateSecurityPreviewConfig} from "../scripts/securityPreviewGuard";

const SAFE={
  VERCEL_ENV:"preview",PROFILE_API_STAGING_ENABLED:"false",PROFILE_API_STAGING_WRITES_ENABLED:"false",
  VITE_FIREBASE_PROJECT_ID:"demo-localeats-preview-disabled-20261106",
  VITE_FIREBASE_AUTH_DOMAIN:"demo-localeats-preview-disabled-20261106.firebaseapp.com",
  VITE_FIREBASE_API_KEY:"AIzaSyDemoPreviewDisabledNoRealFirebase1234",
  VITE_FIREBASE_APP_ID:"1:123456789:web:previewdisabled20261106",
  VITE_FIREBASE_STORAGE_BUCKET:"demo-localeats-preview-disabled-20261106.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID:"123456789",VITE_FIREBASE_FIRESTORE_DATABASE_ID:"(default)",
  VITE_LOCALEATS_API_URL:"https://example.invalid",VITE_PICKUP_ORDERING_ENABLED:"false",
  VITE_SUPABASE_URL:"https://rgpbdajhlrwfmhopzgzk.supabase.co",
  VITE_SUPABASE_ANON_KEY:"preview-disabled-no-direct-data-access",
};

test("Preview accepts only deliberately isolated browser configuration",()=>{
  assert.doesNotThrow(()=>validateSecurityPreviewConfig(SAFE));
  for(const [key,value] of [["VITE_FIREBASE_PROJECT_ID","localeats-5e26e"],["VITE_PICKUP_ORDERING_ENABLED","true"],["PROFILE_API_STAGING_ENABLED","true"],["VITE_LOCALEATS_API_URL","https://localeats-api.vercel.app"]]){
    assert.throws(()=>validateSecurityPreviewConfig({...SAFE,[key]:value}),/SECURITY REVIEW PREVIEW BLOCKED/);
  }
  assert.throws(()=>validateSecurityPreviewConfig({...SAFE,VERCEL_ENV:"production"}),/RELEASE STOP/);
  assert.throws(()=>validateSecurityPreviewConfig({...SAFE,VITE_FIREBASE_API_KEY:""}),/BLOCKED/);
});
test("Staging profile API rejects real Firebase and missing separate credentials",()=>{
  assert.equal(stagingProfileConfig(SAFE),null);
  const bad={...SAFE,PROFILE_API_STAGING_ENABLED:"true",
    PROFILE_API_STAGING_SUPABASE_REF:"rgpbdajhlrwfmhopzgzk",
    PROFILE_API_STAGING_SUPABASE_URL:"https://rgpbdajhlrwfmhopzgzk.supabase.co",
    PROFILE_API_STAGING_SUPABASE_SECRET_KEY:"test-dummy",
    PROFILE_API_STAGING_FIREBASE_PROJECT_ID:"localeats-5e26e",
    PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL:"test@localeats-5e26e.iam.gserviceaccount.com",
    PROFILE_API_STAGING_FIREBASE_PRIVATE_KEY:"-----BEGIN PRIVATE KEY-----TEST"
  };
  assert.equal(stagingProfileConfig(bad),null);
});
test("Unsigned profile routes return JSON 401, not SPA HTML",async()=>{
  const get=await GET(new Request("https://preview.invalid/api/profile?uid=test-customer"));
  assert.equal(get.status,401);
  assert.match(get.headers.get("content-type")??"",/application\/json/);
  assert.equal((await get.json()).success,false);
  const post=await POST(new Request("https://preview.invalid/api/profile",{method:"POST",
    headers:{"content-type":"application/json"},body:JSON.stringify({user_id:"test-customer"})}));
  assert.equal(post.status,401);
  assert.match(post.headers.get("content-type")??"",/application\/json/);
});
test("Missing staging test credentials fail closed on signed-looking requests",async()=>{
  const r=await GET(new Request("https://preview.invalid/api/profile?uid=test-customer",{
    headers:{authorization:"Bearer fb-demo-token-not-real"}
  }));
  assert.equal(r.status,503);
  assert.equal((await r.json()).success,false);
});
test("Server enforces profile ownership and strips client privileges",()=>{
  assert.equal(ownerMatches("alice","alice"),true);
  assert.equal(ownerMatches("bob","alice"),false);
  assert.throws(()=>normalizeProfileInput({user_id:"bob",fullName:"Fake"},"alice"),ProfileInputError);
  const result=normalizeProfileInput({user_id:"alice",fullName:"Safe",role:"admin",
    email:"forged@example.invalid",balance:900000,is_admin:true},"alice","verified@example.invalid");
  assert.equal(result.user_id,"alice");
  assert.equal(result.email,"verified@example.invalid");
  for(const key of ["role","balance","is_admin"])assert.equal(Object.hasOwn(result,key),false);
});
