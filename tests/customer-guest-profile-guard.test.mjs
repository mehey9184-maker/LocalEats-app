import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canManageCustomerProfile} from "../src/lib/profileAccess.ts";

const src=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=src("../src/App.tsx");
const service=src("../src/lib/profileService.ts");
const guestGate=src("../src/components/GuestProfileGate.tsx");

test("guest and anonymous Firebase identities cannot manage stored profile",()=>{
  assert.equal(canManageCustomerProfile(null,null),false);
  assert.equal(canManageCustomerProfile(null,"fake-uid"),false);
  assert.equal(canManageCustomerProfile({uid:"guest-1",isAnonymous:true},"guest-1"),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},"customer-2"),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},null),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},"customer-1"),true);
});

test("guest Profile and Complete Profile routes hide the editable forms",()=>{
  assert.match(app,/currentScreen === "profile" && \(\s*canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\) \? \(\s*<ProfileScreen/);
  assert.match(app,/currentScreen === "complete-profile" && \(\s*canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\) \? \(\s*<CompleteProfileScreen/);
  assert.match(guestGate,/saving personal details requires an account/);
  assert.match(guestGate,/Sign In/);
  assert.match(guestGate,/Create Account/);
  assert.match(guestGate,/Continue browsing as guest/);
  assert.doesNotMatch(guestGate,/onSave|setUserProfile|upsertProfileWithRPC/);
});

test("guest profile save refuses success before modifying local state",()=>{
  const handler=app.slice(app.indexOf("  const handleUpdateProfile = async ("),app.indexOf("  useEffect(() => {",app.indexOf("  const handleUpdateProfile = async (")));
  assert.match(handler,/if \(!canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)\)/);
  assert.ok(handler.indexOf("if (!canManageCustomerProfile")<handler.indexOf("setUserProfile(updated)"));
  assert.match(handler,/throw new Error\(message\)/);
  assert.doesNotMatch(handler,/else \{\s*if \(successCallback\) successCallback\(\)/);
});

test("guest/profile queue and delayed sync paths require the active registered UID",()=>{
  const sync=service.slice(service.indexOf("async function syncProfileDirect"),service.indexOf("export async function upsertProfileWithRPC"));
  const upsert=service.slice(service.indexOf("export async function upsertProfileWithRPC"));
  assert.ok(sync.indexOf("!canManageCustomerProfile")<sync.indexOf("fetch('/api/profiles'"));
  assert.ok(upsert.indexOf("!canManageCustomerProfile")<upsert.indexOf('localStorage.getItem("userProfile")'));
  assert.match(service,/if \(!canManageCustomerProfile\(auth.currentUser, userId\)\) return;/);
  assert.match(service,/if \(!canManageCustomerProfile\(auth.currentUser, userId\)\) continue;/);
  assert.match(app,/if \(canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)\)/);
  assert.match(app,/if \(!canManageCustomerProfile\(auth.currentUser, userId\)\) return;/);
});
