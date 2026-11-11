const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {resolve}=require("node:path");
const {verifyFirestoreRelease}=require("../scripts/verify-firestore-deploy.cjs");
const root=resolve(__dirname,"..");
const current=readFileSync(resolve(root,"firestore.rules"),"utf8");
const candidate=readFileSync(resolve(root,"security/review/firestore-pickup-phase1.rules"),"utf8");
const hash=x=>createHash("sha256").update(x).digest("hex");

test("unsafe current root rules are blocked even with a matching hash",()=>{
  assert.throws(()=>verifyFirestoreRelease(current,hash(current)),/FIRESTORE_RULES_UNRESTRICTED_ACCESS_BLOCKED/);
});
test("a reviewed default-deny candidate with public catalog reads may be approved explicitly",()=>{
  assert.equal(verifyFirestoreRelease(candidate,hash(candidate)),hash(candidate));
  assert.throws(()=>verifyFirestoreRelease(candidate,""),/FIRESTORE_RULES_RELEASE_HASH_NOT_APPROVED/);
  assert.throws(()=>verifyFirestoreRelease(candidate,"0".repeat(64)),/FIRESTORE_RULES_RELEASE_HASH_NOT_APPROVED/);
});
test("unconditional writes are blocked even if source hash matches",()=>{
  const dangerous=candidate.replace("allow create: if false;","allow create: if true;");
  assert.throws(()=>verifyFirestoreRelease(dangerous,hash(dangerous)),/FIRESTORE_RULES_UNRESTRICTED_ACCESS_BLOCKED/);
});
test("default deny is mandatory",()=>{
  const missing=candidate.replace("allow read, write: if false;","allow read, write: if request.auth != null;");
  assert.throws(()=>verifyFirestoreRelease(missing,hash(missing)),/FIRESTORE_RULES_DEFAULT_DENY_REQUIRED/);
});
