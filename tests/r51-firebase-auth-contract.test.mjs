/**
 * R5.1 read-only customer auth architecture and recovery contract.
 * No services, secrets, orders, browser or financial writes are used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pickupHistoryIdentityMatches,pickupHistoryNeedsSignIn} from '../src/services/pickupHistoryAuth.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const adapter=source('src/lib/supabase.ts');
const login=source('src/screens/auth/LoginScreen.tsx');
const app=source('src/App.tsx');
const tokenClient=source('src/services/customerPickup.ts');
const api=source('src/pickup/client.ts');
const apiAuth=source('src/lib/apiAuth.ts');
const helper=source('src/services/pickupHistoryAuth.ts');

test('R5.1 legacy Supabase-named customer auth adapter uses a single actual Firebase identity',()=>{
 assert.match(adapter,/from "firebase\/auth"/);
 assert.match(adapter,/signInWithPassword: async[\s\S]*?signInWithEmailAndPassword\(auth, email, password\)/);
 assert.match(adapter,/signOut: async[\s\S]*?await signOut\(auth\)/);
 assert.match(adapter,/getSession: async[\s\S]*?await auth\.authStateReady\(\)/);
 assert.match(adapter,/user:\s*\{\s*id:\s*user\.uid/);
 assert.match(adapter,/access_token:\s*await user\.getIdToken\(\)/);
 assert.doesNotMatch(adapter,/\bcreateClient\s*\(/);
 assert.doesNotMatch(adapter,/signInWithPassword:\s*async[\s\S]*?supabase\.auth\.signInWithPassword\s*\(/);
 assert.match(login,/await supabase\.auth\.signInWithPassword\(/);
});

test('R5.1 same-user fresh Firebase sign-in can re-trigger history after token change',()=>{
 assert.match(app,/import \{onIdTokenChanged\} from 'firebase\/auth'/);
 assert.match(app,/const stopListening = onIdTokenChanged\(auth, user =>/);
 assert.match(app,/authBlocked = false;\s*void refresh\(\)/);
 assert.match(app,/if \(!active \|\| inFlight \|\| authBlocked\) return/);
 assert.match(app,/feedRequest\?\.abort\(\)/);
 assert.match(app,/requestedFirebaseUid !== auth\.currentUser\?\.uid/);
 assert.match(app,/if \(pickupHistoryNeedsSignIn\(error\)/);
 assert.match(app,/authRequired: true/);
 assert.doesNotMatch(app,/const stopListening = onAuthStateChanged\(auth, user =>/);
});

test('R5.1 API still uses server-verified Firebase bearer token, not an email or browser UID',()=>{
 assert.match(tokenClient,/return user\.getIdToken\(\)/);
 assert.match(api,/Authorization:"Bearer fb-"\+bearer/);
 assert.match(apiAuth,/auth\.currentUser\.getIdToken\(\)/);
 assert.match(helper,/firebaseUser\?\.uid === sessionUid && !firebaseUser\.isAnonymous/);
 for(const candidate of [null,undefined,{uid:'other'}, {uid:'same',isAnonymous:true}]){
  assert.equal(pickupHistoryIdentityMatches('same',candidate),false);
 }
 assert.equal(pickupHistoryIdentityMatches('same',{uid:'same',isAnonymous:false}),true);
});

test('R5.1 rejected Firebase session remains fail-closed; offline/403 are distinct',()=>{
 assert.equal(pickupHistoryNeedsSignIn({status:401}),true);
 assert.equal(pickupHistoryNeedsSignIn({code:'auth/id-token-revoked'}),true);
 assert.equal(pickupHistoryNeedsSignIn({code:'auth/user-disabled'}),true);
 assert.equal(pickupHistoryNeedsSignIn({status:403}),false);
 assert.equal(pickupHistoryNeedsSignIn({code:'auth/network-request-failed'}),false);
 assert.equal(pickupHistoryNeedsSignIn({status:503}),false);
});
