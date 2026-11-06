import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  canManageCustomerProfile,
  profileDestination,
  shouldRedirectProtectedProfile
} from "../src/lib/profileAccess.ts";

const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");

test("anonymous browsers and signed-out guests go directly to the existing Login",()=>{
  for(const identity of [null,undefined,{uid:"guest",isAnonymous:true}]){
    for(const requested of ["profile","complete-profile"]){
      assert.equal(profileDestination(identity,"guest",requested),"login");
      assert.equal(canManageCustomerProfile(identity,"guest"),false);
      assert.equal(shouldRedirectProtectedProfile(identity,"guest"),true);
    }
  }
});

test("registered customer only opens a matching account editor",()=>{
  const account={uid:"member-1",isAnonymous:false};
  assert.equal(profileDestination(account,"member-1","profile"),"profile");
  assert.equal(profileDestination(account,"member-1","complete-profile"),"complete-profile");
  assert.equal(canManageCustomerProfile(account,"member-1"),true);
  assert.equal(shouldRedirectProtectedProfile(account,"member-1"),false);
  assert.equal(profileDestination(account,"member-2","profile"),"login");
  assert.equal(canManageCustomerProfile(account,"member-2"),false);
  assert.equal(shouldRedirectProtectedProfile(account,"member-2"),true);
});

test("session restoration must never display a registered editor without matching session",()=>{
  const user={uid:"member-1",isAnonymous:false};
  assert.equal(canManageCustomerProfile(user,null),false);
  assert.equal(shouldRedirectProtectedProfile(user,null),false);
  assert.match(source,/currentScreen === "profile" && canManageCustomerProfile\(auth\.currentUser, session\?\.user\?\.id\)/);
  assert.match(source,/currentScreen === "complete-profile" && canManageCustomerProfile\(auth\.currentUser, session\?\.user\?\.id\)/);
});

test("every known direct Profile/complete-profile route is protected",()=>{
  assert.match(source,/const navigateToProfile = useCallback/);
  assert.match(source,/setCurrentScreen\(profileDestination\(auth\.currentUser, session\?\.user\?\.id, requested\)\)/);
  assert.equal((source.match(/navigateToProfile\("profile"\)/g)||[]).length,3);
  assert.equal((source.match(/navigateToProfile\("complete-profile"\)/g)||[]).length,2);
  assert.doesNotMatch(source,/setCurrentScreen\("profile"\)/);
  assert.doesNotMatch(source,/setCurrentScreen\("complete-profile"\)/);
  assert.match(source,/shouldRedirectProtectedProfile\(auth\.currentUser, session\?\.user\?\.id\)/);
});

test("pickup ordering safety and original cart/shop navigation remain",()=>{
  assert.match(source,/currentScreen === "checkout"/);
  assert.match(source,/currentScreen === "home"/);
  assert.match(source,/currentScreen === "store-info"/);
  assert.match(source,/setCurrentScreen\("login"\)/);
  // This is only a navigation patch. It must not activate any order path.
  assert.doesNotMatch(source,/VITE_PICKUP_ORDERING_ENABLED\s*=\s*["']true["']/);
});
