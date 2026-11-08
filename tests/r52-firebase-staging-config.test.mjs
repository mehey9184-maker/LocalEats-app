/** R5.2: pure offline safety tests. No Firebase SDK, remote endpoint or keys. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolveCustomerFirebaseConfig} from "../src/lib/firebaseConfigPolicy.ts";

const bundled={
 apiKey:"bundled-client-key",authDomain:"localeats-5e26e.firebaseapp.com",
 projectId:"localeats-5e26e",storageBucket:"localeats-5e26e.firebasestorage.app",
 messagingSenderId:"281496568360",appId:"bundled-app",
 firestoreDatabaseId:"(default)"
};
const staging={
 VITE_FIREBASE_CONFIG_SOURCE:"environment",
 VITE_FIREBASE_API_KEY:"fake-staging-only-key",
 VITE_FIREBASE_AUTH_DOMAIN:"r52c-staging-only-fixture.firebaseapp.com",
 VITE_FIREBASE_PROJECT_ID:"r52c-staging-only-fixture",
 VITE_FIREBASE_STORAGE_BUCKET:"r52c-staging-only-fixture.appspot.com",
 VITE_FIREBASE_MESSAGING_SENDER_ID:"123456789",
 VITE_FIREBASE_APP_ID:"fake-staging-app-id",
 VITE_FIREBASE_FIRESTORE_DATABASE_ID:"(default)",
};

test("R5.2 unchanged normal Firebase selection preserves existing Production/Preview behavior",()=>{
 const r=resolveCustomerFirebaseConfig({},bundled);
 assert.equal(r.config.projectId,bundled.projectId);
 assert.equal(r.config.authDomain,bundled.authDomain);
 assert.equal(r.firestoreDatabaseId,bundled.firestoreDatabaseId);
 const override=resolveCustomerFirebaseConfig({VITE_FIREBASE_PROJECT_ID:"legacy-dev-override"},bundled);
 assert.equal(override.config.projectId,"legacy-dev-override");
 assert.equal(override.config.apiKey,bundled.apiKey);
});

test("R5.2 explicit staging uses only provided environment values, not production bundle",()=>{
 const r=resolveCustomerFirebaseConfig(staging,bundled);
 assert.equal(r.config.projectId,"r52c-staging-only-fixture");
 assert.equal(r.config.apiKey,"fake-staging-only-key");
 assert.equal(r.config.authDomain,"r52c-staging-only-fixture.firebaseapp.com");
 assert.equal(r.firestoreDatabaseId,"(default)");
 assert.notEqual(r.config.projectId,bundled.projectId);
});

test("R5.2 strict staging refuses every missing/blank Firebase web field and database identifier",()=>{
 for(const key of Object.keys(staging).filter(k=>k!=="VITE_FIREBASE_CONFIG_SOURCE")){
  const invalid={...staging,[key]:" "};
  assert.throws(()=>resolveCustomerFirebaseConfig(invalid,bundled),/R52_STAGING_FIREBASE_CONFIG_INVALID/,key);
  const missing={...staging};delete missing[key];
  assert.throws(()=>resolveCustomerFirebaseConfig(missing,bundled),/R52_STAGING_FIREBASE_CONFIG_INVALID/,key);
 }
});

test("R5.2 strict staging refuses bundled legacy Firebase project even with complete fields",()=>{
 assert.throws(
  ()=>resolveCustomerFirebaseConfig({...staging,VITE_FIREBASE_PROJECT_ID:"localeats-5e26e"},bundled),
  /R52_STAGING_FIREBASE_CONFIG_INVALID/
 );
 assert.throws(
  ()=>resolveCustomerFirebaseConfig({...staging,VITE_FIREBASE_PROJECT_ID:"localeats-5e26e"}, {projectId:"new-bundled-project"}),
  /R52_STAGING_FIREBASE_CONFIG_INVALID/
 );
});

test("R5.2C hosted staging refuses Firebase demo emulator project IDs",()=>{
 assert.throws(
  ()=>resolveCustomerFirebaseConfig({...staging,VITE_FIREBASE_PROJECT_ID:"demo-r52c-emulator"},bundled),
  /R52_STAGING_FIREBASE_CONFIG_INVALID/
 );
});

test("R5.2C staging rejects any mixed-in production Firebase web field",()=>{
 const fields={
  VITE_FIREBASE_API_KEY:"apiKey",
  VITE_FIREBASE_AUTH_DOMAIN:"authDomain",
  VITE_FIREBASE_STORAGE_BUCKET:"storageBucket",
  VITE_FIREBASE_MESSAGING_SENDER_ID:"messagingSenderId",
  VITE_FIREBASE_APP_ID:"appId"
 };
 for(const [envName,bundledName] of Object.entries(fields)){
  assert.throws(
   ()=>resolveCustomerFirebaseConfig({...staging,[envName]:bundled[bundledName]},bundled),
   /R52_STAGING_FIREBASE_CONFIG_INVALID/,
   "unexpected Production value accepted in staging: "+envName
  );
 }
});

test("R5.2 production code uses opt-in resolver, not implicit environment fallback in staging",()=>{
 const src=readFileSync(new URL("../src/lib/firebase.ts",import.meta.url),"utf8");
 assert.match(src,/resolveCustomerFirebaseConfig\(import\.meta\.env, firebaseConfigJson\)/);
 assert.match(src,/firebaseConfig = customerFirebaseSettings\.config/);
 assert.match(src,/firestoreDatabaseId = customerFirebaseSettings\.firestoreDatabaseId/);
 assert.match(src,/strictStagingFirebase && appInstance\.options\.projectId !== firebaseConfig\.projectId/);
 assert.match(src,/R52_STAGING_FIREBASE_APP_PROJECT_MISMATCH/);
 assert.match(src,/R52_STAGING_FIRESTORE_INIT_FAILED/);
 assert.match(src,/R52_STAGING_FIREBASE_APP_INIT_FAILED/);
 assert.doesNotMatch(src,/export const firebaseConfig = \{\s*apiKey: import\.meta\.env/);
});
