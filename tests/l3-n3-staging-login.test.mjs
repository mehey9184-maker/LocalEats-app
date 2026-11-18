import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isVerifiedStagingLogin,classifyStagingFirebaseLoginFailure} from "../src/services/stagingFirebaseAuthErrors.ts";

const stage={
 origin:"https://localeats-customer-staging-r52d-mejyo1nm2.vercel.app",
 projectId:"localeats-staging",
 configSource:"environment",
 orderingEnabled:"false"
};

test("only LocalEats isolated Firebase staging Customer hosts receive diagnostics",()=>{
 assert.equal(isVerifiedStagingLogin(stage),true);
 assert.equal(isVerifiedStagingLogin({...stage,origin:"https://localeats-customer-staging-r52d.vercel.app"}),true);
 const invalid=[
  {...stage,origin:"https://localeatssa.co.za"},
  {...stage,origin:"https://project-x7cvt.vercel.app"},
  {...stage,origin:"https://localeats-customer-staging-r52d.evil.example"},
  {...stage,origin:"http://localeats-customer-staging-r52d.vercel.app"},
  {...stage,projectId:"localeats-5e26e"},
  {...stage,configSource:"bundle"},
  {...stage,orderingEnabled:"true"},
 ];
 for(const candidate of invalid)assert.equal(isVerifiedStagingLogin(candidate),false,JSON.stringify(candidate));
});
test("credential failures are distinguished without user enumeration",()=>{
 const codes=["auth/invalid-credential","auth/invalid-email","auth/wrong-password","auth/user-not-found"];
 for(const code of codes){
  const r=classifyStagingFirebaseLoginFailure({code,message:"private email or token"});
  assert.equal(r.category,"credentials");
  assert.ok(!r.message.includes("private"));
  assert.ok(!r.message.includes("User not found"));
  assert.ok(!r.message.includes("user exists"));
 }
});
test("staging provider, key, and domain errors are clearly service configuration",()=>{
 for(const code of ["auth/operation-not-allowed","auth/api-key-not-valid","auth/invalid-api-key","auth/app-not-authorized","auth/configuration-not-found","auth/unauthorized-domain"]){
  const r=classifyStagingFirebaseLoginFailure({code});
  assert.equal(r.category,"service",code);
  assert.match(r.message,/sign-in|authentication/i);
 }
});
test("network, disabled, and rate-limited errors have distinct safe messages",()=>{
 assert.equal(classifyStagingFirebaseLoginFailure({code:"auth/network-request-failed"}).category,"network");
 assert.equal(classifyStagingFirebaseLoginFailure({code:"auth/too-many-requests"}).category,"rate_limited");
 assert.equal(classifyStagingFirebaseLoginFailure({code:"auth/user-disabled"}).category,"disabled");
});
test("unrecognized errors and injected SDK strings cannot disclose credentials",()=>{
 for(const error of [
  {code:"auth/private-secret",message:"user@example.com token"},
  {code:"auth/invalid-credential\nsecret",message:"password"},
  {message:"Bearer secret token"},
  null
 ]){
  const r=classifyStagingFirebaseLoginFailure(error);
  assert.equal(r.category,"other");
  assert.ok(!r.message.includes("Bearer"));
  assert.ok(!r.message.includes("password"));
  assert.ok(!r.message.includes("user@example"));
 }
});
test("auth compatibility layer still uses Firebase and only exposes diagnostics for staging",()=>{
 const shim=readFileSync(new URL("../src/lib/supabase.ts",import.meta.url),"utf8");
 const login=readFileSync(new URL("../src/screens/auth/LoginScreen.tsx",import.meta.url),"utf8");
 assert.match(shim,/signInWithEmailAndPassword\(auth, email, password\)/);
 assert.match(shim,/if\(typeof window!=="undefined" && isVerifiedStagingLogin/);
 assert.match(shim,/classifyStagingFirebaseLoginFailure\(e\)/);
 assert.match(shim,/let msg = "Invalid email or password";/);
 assert.match(login,/stageCategory === "service"/);
 assert.match(login,/stageCategory === "credentials"/);
 assert.match(login,/stageCategory === "network"/);
 assert.match(login,/stageCategory === "rate_limited"/);
 assert.doesNotMatch(login,/authError\.code \|\| password/);
});
