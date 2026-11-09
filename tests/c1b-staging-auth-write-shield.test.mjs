/**
 * C1B — Guard isolated hosted staging against automatic login-side writes.
 * All runtime imports use esbuild in-memory stubs; no secrets, Firebase projects,
 * HTTP requests, Firestore writes or local database are needed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const read = relative => readFileSync(new URL("../" + relative, import.meta.url), "utf8");
const profileSource = read("src/lib/profileService.ts");
const firebaseSource = read("src/lib/firebase.ts");
const appSource = read("src/App.tsx");

const stubPlugin = {
  name: "c1b-no-service-stubs",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^(\.\/firebase|\.\/offlineQueue|\.\/apiAuth|\.\.\/utils)$/ }, ({path}) => ({path,namespace:"c1b-stub"}));
    buildContext.onLoad({filter:/.*/,namespace:"c1b-stub"}, ({path}) => {
      if (path === "../utils") return {contents:"export const toDBPhone = x => x || null;",loader:"js"};
      if (path === "./firebase") return {contents:"export const FirestoreService={saveProfile:async()=>{globalThis.__c1bWrites.push('firestore');}};",loader:"js"};
      if (path === "./apiAuth") return {contents:"export async function getApiAuthHeaders(){globalThis.__c1bWrites.push('auth-headers');return {}};",loader:"js"};
      return {contents:`
        export function queueProfileSync(){globalThis.__c1bWrites.push('queue');}
        export function getProfileSyncQueue(){globalThis.__c1bWrites.push('read-queue');return [];}
        export function clearProfileFromQueue(){globalThis.__c1bWrites.push('clear-queue');}
        export function incrementProfileRetry(){globalThis.__c1bWrites.push('retry-queue');}
      `,loader:"js"};
    });
  },
};

async function compileProfileService(configSource) {
  const result=await build({
    entryPoints:["src/lib/profileService.ts"],
    bundle:true,platform:"node",format:"esm",write:false,
    define:{"import.meta.env.VITE_FIREBASE_CONFIG_SOURCE":JSON.stringify(configSource)},
    plugins:[stubPlugin],
  });
  const encoded=Buffer.from(result.outputFiles[0].text).toString("base64");
  return import("data:text/javascript;base64,"+encoded);
}

test("C1B: hosted staging login refuses profile sync before any network, queue or offline retry",async()=>{
  globalThis.__c1bWrites=[];
  const originalFetch=globalThis.fetch;
  const originalNavigator=globalThis.navigator;
  globalThis.fetch=async()=>{globalThis.__c1bWrites.push("fetch");throw Error("NO_NETWORK_ALLOWED")};
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{onLine:true}});
  try{
    const service=await compileProfileService("environment");
    const result=await service.upsertProfileWithRPC({user_id:"synthetic-A",fullName:"A"});
    assert.match(result.error.message,/C1B_STAGING_PROFILE_WRITES_DISABLED/);
    assert.equal(result.data,null);
    service.scheduleProfileRetry({user_id:"synthetic-A"});
    await service.processOfflineProfileQueue();
    assert.deepEqual(globalThis.__c1bWrites,[]);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalNavigator===undefined)delete globalThis.navigator;
    else Object.defineProperty(globalThis,"navigator",{configurable:true,value:originalNavigator});
    delete globalThis.__c1bWrites;
  }
});

test("C1B: non-staging app retains historical offline-queue handling",async()=>{
  globalThis.__c1bWrites=[];
  const originalNavigator=globalThis.navigator;
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{onLine:false}});
  try{
    const service=await compileProfileService("bundled");
    const response=await service.upsertProfileWithRPC({user_id:"synthetic-normal",fullName:"Normal"});
    assert.equal(response.error,null);
    assert.equal(response.data.offline,true);
    assert.deepEqual(globalThis.__c1bWrites,["queue"]);
  }finally{
    if(originalNavigator===undefined)delete globalThis.navigator;
    else Object.defineProperty(globalThis,"navigator",{configurable:true,value:originalNavigator});
    delete globalThis.__c1bWrites;
  }
});

test("C1B: staging directly blocks legacy Firestore profile and push-token writes",()=>{
  assert.match(firebaseSource,/async saveProfile\([^]*?\{\s*if \(strictStagingFirebase\) throw new Error\("C1B_STAGING_FIRESTORE_PROFILE_WRITES_DISABLED"\)/);
  assert.match(firebaseSource,/async savePushToken\([^]*?\{\s*if \(strictStagingFirebase\) throw new Error\("C1B_STAGING_PUSH_WRITES_DISABLED"\)/);
  assert.match(firebaseSource,/function syncPushTokenToSupabase\([^]*?\{\s*if \(strictStagingFirebase\) return false;/);
  assert.match(firebaseSource,/function registerAndSyncPushToken\([^]*?\{\s*if \(strictStagingFirebase\) return null;/);
  assert.match(appSource,/const requestNotificationPermission = useCallback\(async \(\) => \{\s*\/\/ C1B:[^\n]*\n\s*if \(import\.meta\.env\.VITE_FIREBASE_CONFIG_SOURCE === "environment"\) return;/);
});

test("C1B: profile sync blocks retries and queue processing even for previously cached account A",()=>{
  assert.match(profileSource,/stagingIdentityReadOnly = import\.meta\.env\.VITE_FIREBASE_CONFIG_SOURCE === "environment"/);
  assert.match(profileSource,/scheduleProfileRetry\([^]*?\{\s*if \(stagingIdentityReadOnly\) return;/);
  assert.match(profileSource,/syncProfileDirect\([^]*?\{\s*if \(stagingIdentityReadOnly\) return/);
  assert.match(profileSource,/upsertProfileWithRPC\([^]*?\{\s*\/\/ Must precede[^]*?if \(stagingIdentityReadOnly\) return/);
  assert.match(profileSource,/processOfflineProfileQueue\(\) \{\s*\/\/ Old queued[^]*?if \(stagingIdentityReadOnly\) return;/);
});
