#!/usr/bin/env node
"use strict";
// Fail-closed guard before ANY Firebase CLI publish of Firestore rules.
// This is a release gate, NOT evidence of what is already deployed.
// Never read a rules path supplied by a caller; firebase.json must publish root rules.
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {resolve}=require("node:path");
const ROOT=resolve(__dirname,"..");
const path=resolve(ROOT,"firestore.rules");

// Prevent a deployment to (default), to another Firebase project, or from a
// different local rules file. The in-app SDK uses a named Firestore database.
function verifyFirestoreTarget(config, activeProject) {
  const expectedProject="localeats-5e26e";
  const expectedDb="ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe";
  const f=config?.firestore;
  if(!f || Array.isArray(f) || f.database!==expectedDb || f.rules!=="firestore.rules") {
    throw new Error("FIRESTORE_DEPLOY_WRONG_DATABASE_OR_RULES_SOURCE");
  }
  if(activeProject!==expectedProject) {
    throw new Error("FIRESTORE_DEPLOY_WRONG_FIREBASE_PROJECT");
  }
  if(!Array.isArray(f.predeploy) || !f.predeploy.includes("node scripts/verify-firestore-deploy.cjs")) {
    throw new Error("FIRESTORE_DEPLOY_GUARD_NOT_CONFIGURED");
  }
  return expectedDb;
}

function verifyFirestoreRelease(source, approvedSha256) {
  if(typeof source!=="string"||!source.startsWith("rules_version = '2';")) {
    throw new Error("FIRESTORE_RULES_SOURCE_MISSING_OR_UNEXPECTED");
  }
  // Unconditional writes are forbidden. Public shop/menu reads may be allowed
  // only after the exact reviewed ruleset hash has been independently approved.
  if(/\ballow\s+[^:;]*\b(?:write|create|update|delete)\b[^:;]*:\s*if\s+true\s*;/m.test(source)) {
    throw new Error("FIRESTORE_RULES_UNRESTRICTED_ACCESS_BLOCKED");
  }
  if(!source.includes("match /{document=**}") || !/allow\s+read,\s*write:\s*if\s+false\s*;/.test(source)) {
    throw new Error("FIRESTORE_RULES_DEFAULT_DENY_REQUIRED");
  }
  const orderRules=source.split("match /orders/{orderId} {")[1]?.split("match /users/{userId} {")[0]||"";
  const riderRules=source.split("match /rider_profiles/{riderId} {")[1]?.split("match /rider_connections/{connId} {")[0]||"";
  if(!orderRules.includes("allow create: if false;") ||
     !orderRules.includes("allow update: if false;") ||
     !orderRules.includes("allow delete: if false;") ||
     /delivery_status\\s*==\\s*[\\\"']finding_rider[\\\"']/.test(orderRules) ||
     !riderRules.includes("request.auth.uid == riderId")) {
    throw new Error("FIRESTORE_RULES_PICKUP_API_AUTHORITY_REQUIRED");
  }
  const actual=createHash("sha256").update(source,"utf8").digest("hex");
  if(!/^[0-9a-f]{64}$/.test(approvedSha256||"") || approvedSha256!==actual) {
    throw new Error("FIRESTORE_RULES_RELEASE_HASH_NOT_APPROVED");
  }
  return actual;
}
if(require.main===module){
  try {
    verifyFirestoreTarget(JSON.parse(readFileSync(resolve(ROOT,"firebase.json"),"utf8")),process.env.GCLOUD_PROJECT);
    verifyFirestoreRelease(readFileSync(path,"utf8"),process.env.LOCALEATS_FIRESTORE_RELEASE_APPROVED_SHA256);
    console.log("FIRESTORE_DEPLOY_GUARD_APPROVED");
  } catch (e) {
    console.error("FIRESTORE_DEPLOY_BLOCKED:",e.message);
    process.exitCode=1;
  }
}
module.exports={verifyFirestoreRelease,verifyFirestoreTarget};
