import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canManageCustomerProfile,profileDestination} from "../src/lib/profileAccess.ts";
import {isConfirmedProfileSave} from "../src/lib/profileConfirmation.ts";
const src=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=src("../src/App.tsx");
const profile=src("../src/lib/profileService.ts");
const settings=src("../src/screens/SettingsScreen.tsx");
const contact=src("../src/screens/ContactScreen.tsx");
const photo=src("../src/screens/auth/CompleteProfileScreen.tsx");
const getSection=(text,start,end)=>{
 const a=text.indexOf(start);const b=text.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"Expected boundaries: "+start);
 return text.slice(a,b);
};

test("guest and anonymous identities route Profile directly to Login",()=>{
 assert.equal(profileDestination(null,null,"profile"),"login");
 assert.equal(profileDestination({uid:"demo-guest",isAnonymous:true},"demo-guest","profile"),"login");
 assert.equal(profileDestination({uid:"alice",isAnonymous:false},"bob","profile"),"login");
 assert.equal(profileDestination({uid:"alice",isAnonymous:false},"alice","profile"),"profile");
 assert.match(app,/if \(targetScreen === "profile"\) \{\s*navigateToProfile\("profile"\);\s*return;/);
});

test("both Settings and Profile buttons invoke real Firebase logout; failed logout does not navigate",()=>{
 const logout=getSection(app,"  const logoutCustomer = async () => {","  const handleUpdateProfile");
 assert.match(logout,/await supabase\.auth\.signOut\(\)/);
 assert.ok(logout.indexOf("if (error)")<logout.indexOf('setCurrentScreen("splash")'));
 assert.match(logout,/setSession\(null\)/);
 assert.match(logout,/setUserProfile\(emptyCustomerProfile\(\)\)/);
 for(const key of ["userProfile","cached_orders","app_notifications","favorites","pending_review","localeats_saved_cards"]){
   assert.ok(logout.includes('"'+key+'"'),"clear "+key);
 }
 assert.match(app,/onLogout=\{\(\) => \{ void logoutCustomer\(\); \}\}/);
 assert.match(app,/onLogout=\{logoutCustomer\}/);
});

test("cached private identities cannot masquerade as current users or admin staff",()=>{
 assert.doesNotMatch(app,/useState<UserProfile>\(\(\) => \{\s*return safeLocalStorageGet\("userProfile"/);
 assert.match(app,/useState<UserProfile>\(emptyCustomerProfile\)/);
 assert.match(app,/userProfile\.id === session\?\.user\?\.id/);
 assert.match(app,/setPendingReview\(null\)/);
 assert.match(settings,/const isAdmin = verifiedStaffRole === "admin"/);
 assert.match(settings,/const isMerchant = verifiedStaffRole === "merchant" \|\| isAdmin/);
 assert.match(settings,/\{isMerchant && onShopDashboard && \(/);
 assert.match(app,/userProfile=\{canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)/);
});

test("favorites require the current registered UID and ack before changing UI",()=>{
 const toggle=getSection(app,"  const toggleFavorite = useCallback(","  useEffect(() => {\n    // Handle review reminder");
 assert.match(toggle,/if \(!canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)\)/);
 assert.doesNotMatch(toggle,/userProfile\?\.id/);
 assert.ok(toggle.indexOf("await FirestoreService.followShop")<toggle.indexOf("setFavorites(prev =>"));
 assert.ok(toggle.indexOf("await FirestoreService.unfollowShop")<toggle.indexOf("setFavorites(prev =>"));
 assert.match(toggle,/showAlert\("Could not save"/);
});

test("anonymous sessions do not unlock pickup history or personal push tokens",()=>{
 assert.match(app,/const historyUserId = canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)/);
 assert.match(app,/if \(!canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)\s*\|\|\s*targetUserId !== session\?\.user\?\.id\) return;/);
 assert.equal(canManageCustomerProfile({uid:"fake-anonymous",isAnonymous:true},"fake-anonymous"),false);
});

test("support failures do not fabricate delivery of the request",()=>{
 const section=getSection(contact,"  const handleSubmit = async","  return (");
 assert.match(section,/await FirestoreService\.submitContactMessage/);
 const failure=getSection(section,"    } catch (err: any) {","    } finally {");
 assert.match(failure,/Message Not Sent/);
 assert.match(failure,/setSent\(false\)/);
 assert.doesNotMatch(failure,/Message Received|setSent\(true\)/);
});

test("profiles are successful only with an HTTP JSON owner receipt",()=>{
 const valid={success:true,profile:{user_id:"alice"}};
 assert.equal(isConfirmedProfileSave(200,"application/json; charset=utf-8",valid,"alice"),true);
 assert.equal(isConfirmedProfileSave(200,"text/html",valid,"alice"),false);
 assert.equal(isConfirmedProfileSave(200,"application/json",{success:true},"alice"),false);
 assert.equal(isConfirmedProfileSave(200,"application/json",{success:true,profile:{user_id:"bob"}},"alice"),false);
 assert.equal(isConfirmedProfileSave(503,"application/json",valid,"alice"),false);
 assert.match(profile,/isConfirmedProfileSave\(response.status,contentType,result,profileData.user_id\)/);
 assert.doesNotMatch(profile,/FirestoreService\.saveProfile/);
 assert.doesNotMatch(profile,/cached: true, offline: true, retryScheduled: true \}, error: null/);
 const save=getSection(app,"  const handleUpdateProfile = async (","  useEffect(() => {");
 assert.ok(save.indexOf("if (error) throw error")<save.indexOf("setUserProfile(updated)"));
});

test("profile photo completion awaits confirmed profile update",()=>{
 assert.match(photo,/await onSave\(\{ photoURL: publicUrl \}\)/);
 assert.match(photo,/await onSave\(\{ photoURL: "" \}\)/);
 assert.doesNotMatch(photo,/uploaded & saved to Supabase/);
});

test("review UI cannot create fake successful reviews via a mock facade",()=>{
 const review=getSection(app,'                  onSubmit={async () => {','                />\n              )}\n              {currentScreen === "discover"');
 assert.match(review,/Reviews unavailable/);
 assert.doesNotMatch(review,/\.from\("reviews"\)|Feedback Submitted|rider_profiles/);
 const direct=getSection(app,"  const handleSubmitReview = async () => {","\n  return (");
 assert.match(direct,/canManageCustomerProfile\(auth.currentUser, session\?\.user\?\.id\)/);
 assert.match(direct,/Reviews unavailable/);
 assert.doesNotMatch(direct,/FirestoreService\.addReview|Thank you for your review!/);
});

test("legacy checkout cannot submit an order while pickup ordering is disabled",()=>{
 const checkout=src("../src/screens/CheckoutScreen.tsx");
 assert.match(checkout,/await handlePickupAction\(\); return; \/\/ No legacy checkout/);
 assert.match(checkout,/if \(!pickupOrderingEnabled\(\) \|\| quoteLock\.current\) return/);
});
