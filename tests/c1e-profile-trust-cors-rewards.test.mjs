import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  c1dStagingEnabled,
  C1D_STAGING_API,
  runC1DReadOnlyChecks,
} from "../src/services/c1dIdentityRead.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("src/App.tsx");
const diagnostic=read("src/components/C1DIdentityPanel.tsx");
const service=read("src/services/c1dIdentityRead.ts");

const parent=app.slice(app.indexOf("const handleUpdateProfile = async (\n    data: any,"),app.indexOf("getResilientSession(3000).then"));
const profile=app.slice(app.indexOf("function ProfileScreen({"),app.indexOf("function ProfileScreen({")+52000);
const gating="import.meta.env.VITE_FIREBASE_CONFIG_SOURCE === \"environment\"";

test("C1E: staging profile update stops before optimistic UI or Firebase metadata write",()=>{
  assert.ok(parent.startsWith("const handleUpdateProfile = async ("));
  const guard=parent.indexOf("if ("+gating+")");
  const optimistic=parent.indexOf("setUserProfile(updated)");
  const cloud=parent.indexOf("supabase.auth.updateUser");
  assert.ok(guard>0&&guard<optimistic&&optimistic<cloud);
  assert.match(parent,/throw new Error\("Profile saving is unavailable in Customer Preview\. No changes were saved\."\)/);
  assert.match(profile,/const stagingProfileReadOnly = import\.meta\.env\.VITE_FIREBASE_CONFIG_SOURCE === "environment";/);
  assert.match(profile,/const handleUpdateProfile = async \(\) => \{\s*if \(stagingProfileReadOnly\) \{/);
  assert.match(profile,/disabled=\{isSaving \|\| uploading \|\| stagingProfileReadOnly\}/);
  assert.match(profile,/Profile saving unavailable in Preview/);
});

test("C1E: original profile banner layout stays but staging does not claim cloud sync",()=>{
  assert.match(profile,/\{stagingProfileReadOnly \? \(\s*<motion\.div\s*key="preview-only"/);
  assert.match(profile,/Account signed in · profile saving disabled/);
  assert.match(profile,/Changes in this form are not saved to the cloud/);
  assert.match(profile,/\) : justSaved \? \(/);
  assert.match(profile,/\) : isDirty \? \(/);
  assert.match(profile,/All details verified & saved/); // older non-staging path preserved, unreachable on strict staging
  assert.match(profile,/Synced to cloud/);
  assert.match(profile,/stagingProfileReadOnly \? "From sign-in" : "Saved"/);
  assert.match(profile,/stagingProfileReadOnly \? "Format valid" : "Verified"/);
});

test("C1E: staging prevents avatar upload/delete and does not show the upload success modal",()=>{
  assert.match(profile,/const handleConfirmUploadAndSave = async \(\) => \{\s*if \(stagingProfileReadOnly\)/);
  assert.match(profile,/const handleDeletePhoto = async \(\) => \{\s*if \(stagingProfileReadOnly\)/);
  assert.match(profile,/disabled=\{uploading \|\| stagingProfileReadOnly\}/);
  assert.match(profile,/\{!stagingProfileReadOnly && showConfirmModal && croppedPreviewUrlToConfirm && \(/);
  assert.match(profile,/const publicUrl = await uploadAvatar/);
});

test("C1E: staging does not advertise obsolete reward tiers or earning progress",()=>{
  assert.match(profile,/\{stagingProfileReadOnly \? \(\s*<div className="flex flex-col items-center w-full">/);
  assert.match(profile,/Rewards coming later/);
  assert.match(profile,/Rewards are not active in Preview\. No purchases earn prizes yet\./);
  assert.match(profile,/Rewards progress is not active/);
  assert.match(profile,/\) : completedOrdersCount >= 10 \? \(/);
  assert.match(profile,/5 - completedOrdersCount/); // older reward display available only in the non-staging branch
});

test("C1E: successful readable response does not depend on hidden CORS response header",async()=>{
  const caller=()=>({uid:"test-uid",isAnonymous:false,getIdToken:async()=>"synthetic-never-log"});
  const requested=[];
  const response=(path)=>new Response(JSON.stringify(path.endsWith("/profiles/me")
    ? {success:false,code:"PROFILE_NOT_FOUND"}
    : {success:false,code:"DATABASE_UNAVAILABLE"}),{
    status:path.endsWith("/profiles/me")?404:503,
    headers:{"Cache-Control":"no-store","Content-Type":"application/json"}
    // No exposed Access-Control-Allow-Origin header, as in a real browser.
  });
  const r=await runC1DReadOnlyChecks(caller,"https://localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app",async(url,options)=>{
    requested.push({url,method:options.method});
    return response(url);
  });
  assert.deepEqual(r.results.map(x=>x.browserReadable),[true,true]);
  assert.deepEqual(r.results.map(x=>x.noStore),[true,true]);
  assert.deepEqual(r.results.map(x=>x.ownership),["unverified","unverified"]);
  assert.deepEqual(requested.map(x=>x.method),["GET","GET"]);
  assert.doesNotMatch(service,/response\.headers\.get\("access-control-allow-origin"\)/);
  assert.match(diagnostic,/Browser API read: \{result\.browserReadable \? "allowed" : "blocked"\}/);
  assert.doesNotMatch(diagnostic,/CORS: not confirmed/);
});

test("C1E: diagnostic remains restricted to read-only staging and profile writes do not get enabled",()=>{
  const env={
    VITE_FIREBASE_CONFIG_SOURCE:"environment",
    VITE_PICKUP_ORDERING_ENABLED:"false",
    VITE_PROFILE_WRITES_ENABLED:"false",
    VITE_LOCALEATS_API_URL:C1D_STAGING_API,
  };
  assert.equal(c1dStagingEnabled(env,"localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app","?c1d=1"),true);
  assert.equal(c1dStagingEnabled({...env,VITE_PROFILE_WRITES_ENABLED:"true"},"localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app","?c1d=1"),false);
  assert.doesNotMatch(service,/method: "(POST|PUT|PATCH|DELETE)"/);
});
