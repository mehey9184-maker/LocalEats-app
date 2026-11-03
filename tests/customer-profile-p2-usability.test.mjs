import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const profile=source.slice(source.indexOf("function ProfileScreen({"),source.indexOf("const QuantityModal ="));

test("P2 removes unreachable photo uploads, camera and fabricated device gallery",()=>{
 assert.doesNotMatch(profile,/getUserMedia|uploadAvatar|uploadClientAvatar|handleFileSelect|<Cropper|Mock recent images|showGalleryModal|<input\s+type="file"/);
 assert.match(profile,/No profile picture set/);
 assert.match(profile,/Photo changes are unavailable in this Preview/);
 assert.match(profile,/Remove Photo/);
 assert.match(profile,/Remove existing profile picture/);
});

test("P2 saves only changed fields and does not make an unrelated saved address compulsory",()=>{
 assert.match(profile,/if\(isFullNameDirty\)updateData\.fullName=fullName\.trim\(\)/);
 assert.match(profile,/if\(isPhoneDirty\)updateData\.phone=phone\.trim\(\)/);
 assert.match(profile,/if\(isAddressDirty\)updateData\.address=address\.trim\(\)/);
 assert.match(profile,/if\(isLocationDirty && typeof latitude==="number"/);
 assert.doesNotMatch(profile,/Delivery address cannot be empty/);
 assert.doesNotMatch(profile,/const updateData: Partial<UserProfile> = \{/);
 assert.doesNotMatch(profile,/city: city\.trim\(\) \|\| "Johannesburg"/);
});

test("P2 guards against accidental loss of edited profile data",()=>{
 assert.match(profile,/window\.confirm\("Discard your unsaved profile changes\?"\)/);
 assert.match(profile,/onClick=\{handleBack\}/);
 assert.match(profile,/onClick=\{handleSignOut\}/);
 assert.match(profile,/savedConfirmation=justSaved && !isDirty/);
 assert.match(profile,/disabled=\{isSaving \|\| !isOnline \|\| !isDirty\}/);
 assert.match(profile,/You are offline\. View your profile/);
});

test("P2 phone and name are accessible and report local validation errors",()=>{
 assert.match(profile,/htmlFor="customer-profile-full-name"/);
 assert.match(profile,/htmlFor="customer-profile-phone"/);
 assert.match(profile,/htmlFor="customer-profile-email"/);
 assert.match(profile,/autoComplete="tel"/);
 assert.match(profile,/autoComplete="name"/);
 assert.match(profile,/aria-invalid=\{Boolean\(formErrors\.phone\)\}/);
 assert.match(profile,/id="profile-phone-error" role="alert"/);
 assert.match(profile,/id="profile-full-name-error" role="alert"/);
 assert.match(profile,/if\(isPhoneDirty && !validateSAPhone\(phone\)\)/);
});

test("P2 avoids false status, location, or rewards assertions",()=>{
 assert.doesNotMatch(profile,/WhatsApp Style/);
 assert.doesNotMatch(profile,/Gold VIP Tier|Silver Tier|Bronze Tier/);
 assert.match(profile,/Loyalty rewards are not active/);
 assert.match(profile,/Optional\. Choose an address suggestion/);
 assert.match(profile,/No pin selected/);
 assert.doesNotMatch(profile,/Pin Set \(\{/);
 assert.match(source,/saveConfirmedCustomerProfile\(uid,firebaseAuth\.currentUser,data\)/);
});
