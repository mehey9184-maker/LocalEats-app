const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {createHash}=require("node:crypto");
const {resolve}=require("node:path");
const {verifyFirestoreRelease,verifyFirestoreTarget}=require("../scripts/verify-firestore-deploy.cjs");
const root=resolve(__dirname,"..");
const current=readFileSync(resolve(root,"firestore.rules"),"utf8");
const candidate=readFileSync(resolve(root,"security/review/firestore-pickup-phase1.rules"),"utf8");
const previous=readFileSync(resolve(root,"security/review/firestore-deployed-baseline.rules"),"utf8");
const cfg=JSON.parse(readFileSync(resolve(root,"firebase.json"),"utf8"));
const hash=x=>createHash("sha256").update(x).digest("hex");

test("root deployment file matches locally emulated pickup-only candidate",()=>{
 assert.equal(current,candidate,"Do not let review and live deployment sources diverge");
 assert.equal(verifyFirestoreRelease(current,hash(current)),hash(current));
});
test("previous deployed baseline is not safe to re-publish even with matching hash",()=>{
 assert.throws(()=>verifyFirestoreRelease(previous,hash(previous)),/FIRESTORE_RULES_PICKUP_API_AUTHORITY_REQUIRED/);
});
test("deployment requires exact independent source-hash approval",()=>{
 assert.throws(()=>verifyFirestoreRelease(current,""),/FIRESTORE_RULES_RELEASE_HASH_NOT_APPROVED/);
 assert.throws(()=>verifyFirestoreRelease(current,"0".repeat(64)),/FIRESTORE_RULES_RELEASE_HASH_NOT_APPROVED/);
});
test("unconditional create, update or delete is blocked even with matching hash",()=>{
 const dangerous=current.replace("allow create: if false;","allow create: if true;");
 assert.throws(()=>verifyFirestoreRelease(dangerous,hash(dangerous)),/FIRESTORE_RULES_UNRESTRICTED_ACCESS_BLOCKED/);
});
test("default deny is mandatory",()=>{
 const missing=current.replace("allow read, write: if false;","allow read, write: if request.auth != null;");
 assert.throws(()=>verifyFirestoreRelease(missing,hash(missing)),/FIRESTORE_RULES_DEFAULT_DENY_REQUIRED/);
});
test("Firestore CLI targets the exact named database and Firebase project",()=>{
 assert.equal(verifyFirestoreTarget(cfg,"localeats-5e26e"),"ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");
 assert.throws(()=>verifyFirestoreTarget(cfg,"wrong-project"),/FIRESTORE_DEPLOY_WRONG_FIREBASE_PROJECT/);
 assert.throws(()=>verifyFirestoreTarget(cfg,undefined),/FIRESTORE_DEPLOY_WRONG_FIREBASE_PROJECT/);
 const wrongDB=JSON.parse(JSON.stringify(cfg));
 wrongDB.firestore.database="(default)";
 assert.throws(()=>verifyFirestoreTarget(wrongDB,"localeats-5e26e"),/FIRESTORE_DEPLOY_WRONG_DATABASE_OR_RULES_SOURCE/);
 const wrongSource=JSON.parse(JSON.stringify(cfg));
 wrongSource.firestore.rules="firestore-unreviewed.rules";
 assert.throws(()=>verifyFirestoreTarget(wrongSource,"localeats-5e26e"),/FIRESTORE_DEPLOY_WRONG_DATABASE_OR_RULES_SOURCE/);
 const noGuard=JSON.parse(JSON.stringify(cfg));
 noGuard.firestore.predeploy=[];
 assert.throws(()=>verifyFirestoreTarget(noGuard,"localeats-5e26e"),/FIRESTORE_DEPLOY_GUARD_NOT_CONFIGURED/);
});
