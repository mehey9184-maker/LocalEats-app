import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canManageCustomerProfile, profileDestination} from "../src/lib/profileAccess.ts";

const src=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=src("../src/App.tsx");
const service=src("../src/lib/profileService.ts");

test("guest and anonymous Firebase identities cannot manage stored profile",()=>{
  assert.equal(canManageCustomerProfile(null,null),false);
  assert.equal(canManageCustomerProfile(null,"fake-uid"),false);
  assert.equal(canManageCustomerProfile({uid:"guest-1",isAnonymous:true},"guest-1"),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},"customer-2"),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},null),false);
  assert.equal(canManageCustomerProfile({uid:"customer-1",isAnonymous:false},"customer-1"),true);
});

test("guest Profile and Complete Profile navigate straight to Login",()=>{
  const guest={uid:"anonymous-uid",isAnonymous:true};
  const account={uid:"registered-uid",isAnonymous:false};
  for(const screen of ["profile","complete-profile"]){
    assert.equal(profileDestination(null,null,screen),"login");
    assert.equal(profileDestination(guest,guest.uid,screen),"login");
    assert.equal(profileDestination(account,"different-account",screen),"login");
    assert.equal(profileDestination(account,account.uid,screen),screen);
  }
  // All six navigation entry points (including bottom Profile) use the same immediate guard.
  assert.match(app,/const navigateToProfile = useCallback/);
  assert.equal((app.match(/navigateToProfile\("profile"\)/g)||[]).length,4);
  assert.equal((app.match(/navigateToProfile\("complete-profile"\)/g)||[]).length,2);
  assert.match(app,/setCurrentScreen\(profileDestination\(auth.currentUser, session\?\.user\?\.id, requested\)\)/);
  // If sign-in state expires while on Profile, redirect and never mount the editor.
  assert.match(app,/currentScreen === "profile" && canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\) && \(\s*<ProfileScreen/);
  assert.match(app,/currentScreen === "complete-profile" && canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\) && \(\s*<CompleteProfileScreen/);
  assert.match(app,/setCurrentScreen\("login"\);\s*\}\s*\}, \[currentScreen, session\?\.user\?\.id, setCurrentScreen\]\)/);
  assert.doesNotMatch(app,/GuestProfileGate/);
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
