/** C1C: synthetic identity tests only; no Firebase, browser, API or database access. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  activeCustomerIdentityMatches,
  emptyCustomerProfile,
  ownCustomerProfileBase,
} from "../src/services/customerProfileIsolation.ts";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");

test("C1C stale account A cannot overwrite account B's profile or favorites",async()=>{
  let activeUid="tester-A";
  let profile=ownCustomerProfileBase(emptyCustomerProfile(),"tester-B");
  const oldA={id:"tester-A",fullName:"Tester A",email:"a@example.invalid",phone:"000-111",favorites:["private-A"]};
  let resolveFetch;
  const fetchGate=new Promise(resolve=>{resolveFetch=resolve;});
  const staleA=(async()=>{
    await fetchGate;
    if(activeCustomerIdentityMatches(oldA.id,activeUid)) {
      profile={...ownCustomerProfileBase(profile,oldA.id),...oldA};
    }
  })();
  activeUid="tester-B";
  resolveFetch();
  await staleA;
  assert.equal(profile.id,"tester-B");
  assert.equal(profile.fullName,"");
  assert.notEqual(profile.email,oldA.email);
  assert.notEqual(profile.phone,oldA.phone);
  assert.equal(activeCustomerIdentityMatches("tester-A",activeUid),false);
  assert.equal(activeCustomerIdentityMatches("tester-B",activeUid),true);
  assert.equal(activeCustomerIdentityMatches("tester-A",null),false);
});

test("C1C switching profiles removes A's private properties but preserves B on same-UID refresh",()=>{
  const previous={...emptyCustomerProfile("tester-A"),fullName:"Tester A",email:"a@example.invalid",
    phone:"A PRIVATE PHONE",address:"A PRIVATE ADDRESS",photoURL:"A_IMAGE",language:"en",
    latitude:51,longitude:0,is_admin:true};
  const b=ownCustomerProfileBase(previous,"tester-B");
  assert.equal(b.id,"tester-B");
  assert.equal(b.fullName,"");
  assert.equal(b.email,"");
  assert.equal(b.phone,"");
  assert.equal(b.address,"");
  assert.equal(b.photoURL,undefined);
  assert.equal(b.is_admin,undefined);
  assert.equal(b.latitude,undefined);
  assert.equal(ownCustomerProfileBase(previous,"tester-A"),previous);
});

test("C1C App checks live Firebase UID around every asynchronous profile read and state commit",()=>{
  const start=app.indexOf("const fetchUserProfile = useCallback(async (userId");
  const end=app.indexOf("// Sync FCM Web Push Token",start);
  assert.ok(start>0 && end>start);
  const profile=app.slice(start,end);
  assert.match(profile,/const requestStillOwned = \(\) => activeCustomerIdentityMatches\(userId, auth\.currentUser\?\.uid\)/);
  assert.match(profile,/await FirestoreService\.getProfile\(userId\);\s*if \(!requestStillOwned\(\)\) return;/);
  assert.match(profile,/const headers = await getApiAuthHeaders\(\);\s*if \(!requestStillOwned\(\)\) return;/);
  assert.match(profile,/const result = await response\.json\(\);\s*if \(!requestStillOwned\(\)\) return;/);
  assert.match(profile,/if \(\(data\.user_id && data\.user_id !== userId\) \|\|/);
  assert.match(profile,/setUserProfile\(\(prev\) => \{\s*if \(!requestStillOwned\(\)\) return prev;/);
  assert.match(profile,/const base = ownCustomerProfileBase\(prev, userId\)/);
  assert.match(profile,/setFavorites\(\(previous\) => requestStillOwned\(\) \? data\.favorites : previous\)/);
  assert.match(profile,/if \(isNetworkError && retries > 0 && requestStillOwned\(\)\)/);
  assert.match(profile,/if \(requestStillOwned\(\)\) void fetchUserProfile\(userId, retries - 1\)/);
});

test("C1C Firebase restoration and sign-out do not revive another account's data",()=>{
  const bootstrap=app.slice(app.indexOf("getResilientSession(3000).then"),app.indexOf("const handleJwtExpired"));
  assert.match(bootstrap,/if \(!activeCustomerIdentityMatches\(session\.user\.id, auth\.currentUser\?\.uid\)\)/);
  assert.match(bootstrap,/ownCustomerProfileBase\(prev, session\.user\.id\)/);
  assert.match(bootstrap,/verifiedProfileUidRef\.current !== session\.user\.id\) \{\s*\/\/ A stored guest\/local cart/);
  assert.match(bootstrap,/if \(_event === "SIGNED_OUT"\) \{\s*verifiedProfileUidRef\.current = null;/);
  assert.match(bootstrap,/setUserProfile\(emptyCustomerProfile\(\)\)/);
  assert.match(bootstrap,/setCart\(\[\]\);\s*setFavorites\(\[\]\);\s*setOrders\(\[\]\);/);
});

test("C1C never copies the Firebase ID token into browser localStorage",()=>{
  assert.doesNotMatch(app,/localStorage\.setItem\(["']remember_me_secure_token["'],\s*session\.access_token/);
  assert.doesNotMatch(app,/localStorage\.setItem\(["']remember_me_secure_token["'],\s*userProfile\.id/);
  assert.match(app,/localStorage\.setItem\("remember_me_secure_token", "true"\)/);
  assert.match(app,/if \(import\.meta\.env\.VITE_FIREBASE_CONFIG_SOURCE === "environment"\) \{\s*\/\/ Delete any raw ID token/);
  assert.match(app,/localStorage\.removeItem\("remember_me_secure_token"\)/);
});
