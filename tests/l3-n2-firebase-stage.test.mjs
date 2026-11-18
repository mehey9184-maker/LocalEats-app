import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {isolatedStagingFirebaseConfig,injectIsolatedStagingWorker} from "../scripts/l3-n2-staging-fcm.mjs";
const staging=()=>({
 LOCALEATS_STAGING_ONLY:"true",VERCEL_ENV:"preview",VITE_FIREBASE_CONFIG_SOURCE:"environment",
 VITE_FIREBASE_API_KEY:"test-public-key",
 VITE_FIREBASE_AUTH_DOMAIN:"localeats-staging.firebaseapp.com",
 VITE_FIREBASE_PROJECT_ID:"localeats-staging",
 VITE_FIREBASE_STORAGE_BUCKET:"localeats-staging.appspot.com",
 VITE_FIREBASE_APP_ID:"1:987654321:web:fixture",
 VITE_FIREBASE_MESSAGING_SENDER_ID:"987654321",
 VITE_FIREBASE_VAPID_KEY:"test-staging-vapid-public-key",
 VITE_PICKUP_ORDERING_ENABLED:"false",
 VITE_LOCALEATS_API_URL:"https://localeats-api-staging-r52d.vercel.app",
 VITE_CUSTOMER_PUSH_STAGING_ORIGIN:"https://localeats-customer-staging-r52d.vercel.app"
});
test("ordinary production builds are unchanged and do not inject a worker",()=>{
 assert.equal(isolatedStagingFirebaseConfig({}),null);
});
test("staging rejects Firebase Production fallback, missing VAPID, incorrect API, or enabled ordering",()=>{
 const ok=staging();assert.equal(isolatedStagingFirebaseConfig(ok).projectId,ok.VITE_FIREBASE_PROJECT_ID);
 assert.equal(isolatedStagingFirebaseConfig({...ok,VITE_LOCALEATS_API_URL:"https://localeats-api-staging-r52d-git-112955-mehey9184-makers-projects.vercel.app"}).projectId,"localeats-staging");
 for(const k of ["VITE_FIREBASE_API_KEY","VITE_FIREBASE_AUTH_DOMAIN","VITE_FIREBASE_PROJECT_ID",
                   "VITE_FIREBASE_STORAGE_BUCKET","VITE_FIREBASE_APP_ID",
                   "VITE_FIREBASE_MESSAGING_SENDER_ID","VITE_FIREBASE_VAPID_KEY"]){
  assert.throws(()=>isolatedStagingFirebaseConfig({...ok,[k]:""}),undefined,k);
 }
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_FIREBASE_PROJECT_ID:"localeats-5e26e"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_FIREBASE_CONFIG_SOURCE:"bundle"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_PICKUP_ORDERING_ENABLED:"true"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_LOCALEATS_API_URL:"https://localeats-api.vercel.app"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VERCEL_ENV:"production"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_FIREBASE_PROJECT_ID:"different-project",VITE_FIREBASE_AUTH_DOMAIN:"different-project.firebaseapp.com"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_LOCALEATS_API_URL:"https://production-other-domain.vercel.app"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_CUSTOMER_PUSH_STAGING_ORIGIN:"https://other-project.vercel.app"}));

 assert.throws(()=>isolatedStagingFirebaseConfig({...ok,VITE_LOCALEATS_API_URL:"https://localeats-api-staging-r52d.vercel.app/path"}));
});
test("actual Vercel Preview URL takes priority and unknown Vercel project fails closed",()=>{
 const livePreview="localeats-customer-staging-r52d-q4t5tjjgt.vercel.app";
 assert.equal(isolatedStagingFirebaseConfig({...staging(),VERCEL_URL:livePreview,
   VITE_CUSTOMER_PUSH_STAGING_ORIGIN:"https://unrelated-preview.vercel.app"}).projectId,"localeats-staging");
 assert.throws(()=>isolatedStagingFirebaseConfig({...staging(),VERCEL_URL:"project-x7cvt-customer.vercel.app"}));
 assert.throws(()=>isolatedStagingFirebaseConfig({...staging(),VERCEL_URL:"localeats-customer-staging-r52d.attacker.example"}));
});
test("only compiled custom worker is repointed, never the source",()=>{
 const dir=mkdtempSync(join(tmpdir(),"local-fcm-stage-"));
 const worker=join(dir,"firebase-messaging-sw.js");
 const original="firebase.initializeApp("+JSON.stringify({projectId:"localeats-5e26e"})+");\nself.addEventListener('notificationclick',()=>{});";
 try {
  writeFileSync(worker,original);
  assert.equal(injectIsolatedStagingWorker(staging(),worker),true);
  const compiled=readFileSync(worker,"utf8");
  assert.match(compiled,/"projectId":"localeats-staging"/);
  assert.doesNotMatch(compiled,/"projectId":"localeats-5e26e"/);
  assert.match(compiled,/notificationclick/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("no worker emitted on failed staging configuration",()=>{
 const dir=mkdtempSync(join(tmpdir(),"local-fcm-fail-")),worker=join(dir,"firebase-messaging-sw.js");
 const original='firebase.initializeApp({"projectId":"localeats-5e26e"});';
 try {
  writeFileSync(worker,original);
  assert.throws(()=>injectIsolatedStagingWorker({...staging(),VITE_FIREBASE_VAPID_KEY:""},worker));
  assert.equal(readFileSync(worker,"utf8"),original);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
