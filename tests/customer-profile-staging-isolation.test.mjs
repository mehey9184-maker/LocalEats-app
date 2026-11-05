import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stagingProfileConfig,PROFILE_STAGING_REF,LIVE_FIREBASE_PROJECT_ID} from "../api/_lib/profileRuntimeConfig.ts";
const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const valid={
  VERCEL_ENV:"preview",
  PROFILE_API_STAGING_ENABLED:"true",
  PROFILE_API_STAGING_SUPABASE_REF:PROFILE_STAGING_REF,
  PROFILE_API_STAGING_SUPABASE_URL:"https://"+PROFILE_STAGING_REF+".supabase.co",
  PROFILE_API_STAGING_SUPABASE_SECRET_KEY:"unit-test-not-a-real-credential",
  PROFILE_API_STAGING_FIREBASE_PROJECT_ID:"localeats-customer-isolated-test",
  VITE_FIREBASE_PROJECT_ID:"localeats-customer-isolated-test",
  PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL:"unit-test@localeats-customer-isolated-test.iam.gserviceaccount.com",
  PROFILE_API_STAGING_FIREBASE_PRIVATE_KEY:"-----BEGIN PRIVATE KEY-----\\nFAKE_TEST_ONLY\\n-----END PRIVATE KEY-----",
};
test("Production, development and unapproved environments can never reach profile staging",()=>{
 for(const mode of ["production","development","",undefined])
   assert.equal(stagingProfileConfig({...valid,VERCEL_ENV:mode}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_ENABLED:"false"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_ENABLED:undefined}),null);
});
test("Database must be the exact independent staging Supabase project",()=>{
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_SUPABASE_REF:"phdjumtqkooyppxozqsi"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_SUPABASE_URL:"https://phdjumtqkooyppxozqsi.supabase.co"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_SUPABASE_URL:"http://rgpbdajhlrwfmhopzgzk.supabase.co"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_SUPABASE_SECRET_KEY:""}),null);
});
test("Firebase authentication must not use the existing live project",()=>{
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_FIREBASE_PROJECT_ID:LIVE_FIREBASE_PROJECT_ID}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_FIREBASE_PROJECT_ID:undefined}),null);
 assert.equal(stagingProfileConfig({...valid,VITE_FIREBASE_PROJECT_ID:undefined}),null);
 assert.equal(stagingProfileConfig({...valid,VITE_FIREBASE_PROJECT_ID:LIVE_FIREBASE_PROJECT_ID}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL:"unit-test@localeats-5e26e.iam.gserviceaccount.com"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL:"not-service-account"}),null);
 assert.equal(stagingProfileConfig({...valid,PROFILE_API_STAGING_FIREBASE_PRIVATE_KEY:"invalid"}),null);
});
test("Valid staging is read-only unless a second exact write switch is set",()=>{
 const cfg=stagingProfileConfig(valid);
 assert.ok(cfg);
 assert.equal(cfg.writesEnabled,false);
 assert.equal(cfg.supabaseUrl,"https://"+PROFILE_STAGING_REF+".supabase.co");
 const enabled=stagingProfileConfig({...valid,PROFILE_API_STAGING_WRITES_ENABLED:"true"});
 assert.equal(enabled?.writesEnabled,true);
 assert.equal(stagingProfileConfig({...valid,VERCEL_ENV:"production",PROFILE_API_STAGING_WRITES_ENABLED:"true"}),null);
});
test("Client profile uses authenticated API only, without Firestore reads or silent mirror writes",()=>{
 const app=src("../src/App.tsx");
 const profile=src("../src/lib/profileService.ts");
 assert.match(app,/encodeURIComponent\(userId\)/);
 assert.match(app,/auth\.currentUser\?\.uid !== userId/);
 assert.doesNotMatch(app,/FirestoreService\.getProfile\(userId\)/);
 assert.doesNotMatch(app,/Profile Auto-Upsert Notice/);
 assert.doesNotMatch(profile,/FirestoreService\.saveProfile/);
 assert.match(app,/Profile service returned an invalid response/);
});
