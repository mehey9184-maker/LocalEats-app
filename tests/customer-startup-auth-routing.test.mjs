import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const auth=readFileSync(new URL("../src/lib/supabase.ts",import.meta.url),"utf8");

test("Firebase-backed session checks wait for persistence hydration",()=>{
 const getSession=auth.slice(auth.indexOf("getSession: async () =>"),auth.indexOf("getUser: async () =>"));
 assert.match(getSession,/await auth\.authStateReady\(\)/);
 assert.match(getSession,/formatSession\(auth\.currentUser\)/);
 const getUser=auth.slice(auth.indexOf("getUser: async () =>"),auth.indexOf("onAuthStateChange:"));
 assert.match(getUser,/await auth\.authStateReady\(\)/);
 const listener=auth.slice(auth.indexOf("onAuthStateChange: (listener) =>"),auth.indexOf("from: (table)"));
 assert.match(listener,/auth\.authStateReady\(\)\.then\(\(\) => formatSession\(auth\.currentUser\)\)/);
 assert.match(listener,/if \(active\) listener\('INITIAL_SESSION', session\)/);
 assert.match(listener,/active = false/);
});

test("startup does not render the welcome screen or login before Firebase resolves",()=>{
 assert.match(app,/useState<Screen\[\]>\(\["splash"\]\)/);
 assert.match(app,/useState\(true\);\s*const \[authRestoreSlow/);
 const gate=app.indexOf("if (isRestoringSession) {");
 const main=app.indexOf("return (\n    <div className=\"relative w-full max-w-\[100vw\] overflow-x-hidden\">",gate);
 assert.ok(gate>0 && main>gate);
 const skeleton=app.slice(gate,main);
 assert.match(skeleton,/AppSkeletonLoader/);
 assert.doesNotMatch(skeleton,/<SplashScreen|<AuthSkeleton|Continue to App/);
 assert.match(app,/getResilientSession\(3000\)\.then/);
 assert.doesNotMatch(app,/const safetyTimer = setTimeout/);
 assert.doesNotMatch(app,/setIsRestoringSession\(false\);\s*\}, 1500\)/);
});

test("verified returning users navigate Home; signed-out users remain on welcome",()=>{
 const bootstrap=app.slice(app.indexOf("getResilientSession(3000).then"),app.indexOf("const handleJwtExpired"));
 assert.match(bootstrap,/if \(session\) \{/);
 assert.match(bootstrap,/return preLoginScreens\.includes\(prev\) \? "home" : prev;/);
 assert.match(bootstrap,/if \(_event === "SIGNED_OUT"\) \{\s*return "splash";/);
 assert.match(bootstrap,/if \(!active\) return;/);
 assert.match(bootstrap,/clearTimeout\(slowTimer\)/);
 assert.match(bootstrap,/Startup gate is resolved by the Firebase-backed getSession/);
 assert.match(app,/currentScreen === "splash" &&/);
 assert.match(app,/currentScreen === "login" &&/);
 assert.match(app,/currentScreen === "home" &&/);
});

test("slow auth shows Retry instead of guessing or bypassing authentication",()=>{
 const gate=app.slice(app.indexOf("if (isRestoringSession) {"),app.indexOf("if (isRestoringSession) {")+1300);
 assert.match(gate,/authRestoreSlow &&/);
 assert.match(gate,/window\.location\.reload\(\)/);
 assert.doesNotMatch(gate,/setIsRestoringSession\(false\)/);
 assert.match(gate,/userProfile=\{\{fullName:"",city:"",address:""\}\}/);
});
