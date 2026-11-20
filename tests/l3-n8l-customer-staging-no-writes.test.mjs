import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 isCustomerStageLegacyWriteBlocked,assertCustomerLegacyWriteAllowed,
 CUSTOMER_STAGING_LEGACY_WRITE_DISABLED,
} from "../src/services/customerStagingNoDirectWrites.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("N8L isolated staging Firebase always disables legacy customer direct writes",()=>{
 const stage={VITE_FIREBASE_PROJECT_ID:"localeats-staging"};
 assert.equal(isCustomerStageLegacyWriteBlocked(stage),true);
 assert.throws(()=>assertCustomerLegacyWriteAllowed(stage),/Customer staging is read-only/);
 assert.equal(isCustomerStageLegacyWriteBlocked({VITE_FIREBASE_PROJECT_ID:"localeats-5e26e"}),false);
 assert.equal(isCustomerStageLegacyWriteBlocked({}),false);
 assert.equal(isCustomerStageLegacyWriteBlocked(null),false);
 assert.ok(CUSTOMER_STAGING_LEGACY_WRITE_DISABLED.includes("was not saved"));
});
test("N8L Customer legacy Firestore review, follow, chat, push, shop mutations block first",()=>{
 const s=read("src/lib/firebase.ts");
 const names=["addReview","followShop","unfollowShop","submitContactMessage",
  "updateRiderLocation","sendMessage","markMessagesAsRead","saveProfile",
  "savePushToken","updateShop","updateMenuItem","addMenuItem","deleteMenuItem"];
 for(const method of names){
  const start=s.indexOf("  async "+method+"(");
  assert.ok(start>=0,method);
  const body=s.slice(start,start+500);
  const guard=body.indexOf("ensureCustomerLegacyWriteAllowed();");
  assert.ok(guard>=0,method+" must guard before Firestore writes");
  const sdk=body.indexOf("setDoc(");
  if(sdk>=0)assert.ok(guard<sdk,method+" must guard before setDoc");
 }
});
test("N8L existing sign-in and server pickup API access remain available",()=>{
 const s=read("src/lib/supabase.ts");
 const login=s.slice(s.indexOf("signInWithPassword:"),s.indexOf("signInWithOAuth:"));
 assert.match(login,/signInWithEmailAndPassword/);
 assert.ok(!login.includes("ensureCustomerLegacyWriteAllowed()"));
 const pickup=read("src/services/customerPickup.ts");
 assert.match(pickup,/readPickupCatalog/);
 assert.match(pickup,/customerPickupApi\.shops/);
});
test("N8L Customer stage Google-first-signup, email signup and password reset blocked",()=>{
 const s=read("src/lib/supabase.ts");
 for(const key of ["signUp","signInWithOAuth","resetPasswordForEmail","updateUser"]){
  const start=s.indexOf(key+": async (");
  assert.ok(start>=0,key);
  const code=s.slice(start,start+350);
  assert.match(code,/ensureCustomerLegacyWriteAllowed\(\)/,key);
 }
});
test("N8L Supabase-compatible mock cannot silently claim stage mutations succeeded",()=>{
 const s=read("src/lib/supabase.ts");
 assert.match(s,/attemptedMutation = false/);
 assert.match(s,/attemptedMutation=true/);
 assert.match(s,/data:null,error:\{message:CUSTOMER_STAGING_LEGACY_WRITE_DISABLED\}/);
 assert.match(s,/isCustomerStageLegacyWriteBlocked\(import\.meta\.env\) \? createChain\(true\)/);
 assert.ok(s.includes("const mockDbChain: any = createChain();"),
  "Production no-op behavior must remain byte-compatible by default");
});
