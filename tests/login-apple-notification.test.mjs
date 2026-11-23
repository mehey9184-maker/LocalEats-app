import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(p,"utf8");
const login=source("src/screens/auth/LoginScreen.tsx");
const brand=source("src/components/AppleBrandIcon.tsx");
const toast=source("src/components/AppNotificationToast.tsx");
const app=source("src/App.tsx");
const auth=source("src/lib/supabase.ts");

test("Apple button shows proper Apple brand mark, not fruit and not a fake OAuth attempt",()=>{
 assert.match(brand,/M12\.152 6\.896/);
 assert.match(brand,/viewBox="0 0 24 24"/);
 assert.match(login,/AppleBrandIcon/);
 assert.doesNotMatch(login,/<Apple className=/);
 const start=login.indexOf('id="apple-oauth-btn"');
 assert.ok(start>=0,"Apple button preserved");
 const block=login.slice(start,login.indexOf("</button>",start));
 assert.match(block,/\bdisabled\b/);
 assert.match(block,/Coming soon/);
 assert.match(block,/aria-describedby="apple-oauth-status"/);
 assert.doesNotMatch(block,/signInWithOAuth/);
 assert.doesNotMatch(block,/onClick=/);
 assert.match(auth,/if \(provider === 'google'\)/);
 assert.match(auth,/OAuth provider not supported/);
});
test("Sign-in controls and inline error feedback remain intact",()=>{
 assert.match(login,/id="google-oauth-btn"/);
 assert.match(login,/supabase\.auth\.signInWithPassword/);
 assert.match(login,/id="auth-inline-error-card"/);
 assert.match(login,/forgotError/);
 assert.match(login,/onGuestBrowse/);
 assert.doesNotMatch(login,/fixed bottom-0 left-0 right-0 h-1 bg-primary/);
});
test("Transient in-app notifications are top anchored and dismissible",()=>{
 assert.match(toast,/top-\[calc\(env\(safe-area-inset-top,0px\)\+0\.75rem\)\]/);
 assert.match(toast,/sm:top-4/);
 assert.doesNotMatch(toast,/bottom-\[calc\(6\.5rem/);
 assert.match(toast,/aria-atomic="true"/);
 assert.match(toast,/role=\{notification\.persistent \? "alertdialog" : notification\.type==="error"\?"alert":"status"\}/);
 assert.match(toast,/aria-modal=\{notification\.persistent/);
 assert.match(toast,/onDragEnd/);
 assert.match(toast,/onDismiss\(\)/);
 assert.match(app,/<AppNotificationToast/);
 assert.match(app,/<Toaster position="top-center"/);
});
test("Persistent in-app prompts remain centered and have working actions",()=>{
 assert.match(toast,/fixed inset-0 z-\[110\] flex items-center justify-center/);
 assert.match(toast,/action\.onClick\(\);onDismiss\(\)/);
 assert.match(app,/notification=\{notification\}/);
});
