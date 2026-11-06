import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const supabase=readFileSync(new URL("../src/lib/supabase.ts",import.meta.url),"utf8");

test("both Settings and Profile use the same real sign-out handler",()=>{
  assert.match(app,/const logoutCustomer = async \(\) => \{/);
  assert.match(app,/onLogout=\{\(\) => \{ void logoutCustomer\(\); \}\}/);
  assert.match(app,/onLogout=\{logoutCustomer\}/);
  assert.doesNotMatch(app,/onLogout=\{\(\) => setCurrentScreen\("splash"\)\}/);
});

test("the logout handler waits for Firebase sign-out confirmation",()=>{
  const start=app.indexOf("const logoutCustomer = async () => {");
  const end=app.indexOf("const handleUpdateProfile = async (",start);
  assert.ok(start>0 && end>start);
  const body=app.slice(start,end);
  const signout=body.indexOf("await supabase.auth.signOut()");
  const error=body.indexOf("if (error)");
  const clear=body.indexOf("setSession(null)");
  const navigate=body.indexOf('setCurrentScreen("splash")');
  assert.ok(signout>=0 && error>signout && clear>error && navigate>clear);
  assert.match(body,/if \(error\) \{\s*setNotification\(\{ type: "error"/);
  assert.match(body,/catch \{\s*setNotification\(\{ type: "error"/);
  assert.equal((body.match(/setCurrentScreen\("splash"\)/g)||[]).length,1);
});

test("Firebase sign-out, not a mock navigation, is behind auth.signOut",()=>{
  assert.match(supabase,/import \{[\s\S]*?signOut,[\s\S]*?\} from "firebase\/auth"/);
  assert.match(supabase,/signOut: async \(\) => \{\s*try \{\s*await signOut\(auth\)/);
  assert.match(supabase,/return \{ error: \{ message: e\.message \} \}/);
});

test("private account state is cleaned only after successful sign-out",()=>{
  const body=app.slice(app.indexOf("const logoutCustomer = async () => {"),app.indexOf("const handleUpdateProfile = async ("));
  for(const state of ["setSession(null)","setOrders([])","setNotifications([])","setCart([])","setFavorites([])","setPendingReview(null)","setUserProfile({"]){
    assert.ok(body.includes(state),state);
  }
  for(const key of ["userProfile","favorites","cached_orders","pending_review","offline_profile_queue","app_notifications"]){
    assert.ok(body.includes('"'+key+'"'),key);
  }
  assert.doesNotMatch(body,/await.*processOfflineSyncQueue/);
  assert.doesNotMatch(body,/createOrder\(/);
});
