/**
 * R5.1 disposable, REAL Firebase SDK + Admin SDK Auth Emulator check.
 * This may only run against demo-localeats-r51 on 127.0.0.1:9099.
 * It never imports application Firebase configuration or contacts live services.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp as initClient,deleteApp as deleteClient} from 'firebase/app';
import {
 initializeAuth,connectAuthEmulator,inMemoryPersistence,
 createUserWithEmailAndPassword,signInWithEmailAndPassword,
 signInAnonymously,signOut,onIdTokenChanged
} from 'firebase/auth';
import {initializeApp as initAdmin,deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {pickupHistoryIdentityMatches} from '../../src/services/pickupHistoryAuth.ts';

const project='demo-localeats-r51';
const env=process.env;
if(env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099' ||
 env.GCLOUD_PROJECT!==project ||
 env.FIREBASE_PROJECT_ID || env.FIREBASE_PRIVATE_KEY ||
 env.FIREBASE_SERVICE_ACCOUNT || env.GOOGLE_APPLICATION_CREDENTIALS ||
 env.SUPABASE_URL || env.DATABASE_URL || env.DIRECT_URL ||
 env.VITE_FIREBASE_PROJECT_ID || env.VITE_LOCALEATS_API_URL) {
 throw Error('R51_REFUSE_NON_ISOLATED_FIREBASE_ENVIRONMENT');
}
const cApp=initClient({
 projectId:project,apiKey:'synthetic-r51-local-emulator-only',
 authDomain:project+'.firebaseapp.com',appId:'synthetic-r51'
},'r51-customer-sdk-fixture');
const cAuth=initializeAuth(cApp,{persistence:inMemoryPersistence});
connectAuthEmulator(cAuth,'http://127.0.0.1:9099',{disableWarnings:true});
const aApp=initAdmin({projectId:project},'r51-admin-sdk-fixture');
const aAuth=getAdminAuth(aApp);
const password='Test-Only-Never-Real-Passphrase-123!';
let sequence=0;
const email=label=>label+'-'+(++sequence)+'@example.invalid';

test('R5.1 revoked old token is rejected, same Firebase UID can sign in afresh and receive a valid token',async()=>{
 const accountEmail=email('revoke-relogin');
 const first=await createUserWithEmailAndPassword(cAuth,accountEmail,password);
 const uid=first.user.uid;
 const staleToken=await first.user.getIdToken();
 assert.equal((await aAuth.verifyIdToken(staleToken,true)).uid,uid);
 let sameUidEvents=0;
 const unsubscribe=onIdTokenChanged(cAuth,user=>{
  if(user?.uid===uid)sameUidEvents++;
 });
 try{
  // Admin compares seconds, so prove revocation was later than old auth_time.
  await new Promise(resolve=>setTimeout(resolve,1800));
  await aAuth.revokeRefreshTokens(uid);
  await assert.rejects(
   aAuth.verifyIdToken(staleToken,true),
   err=>err?.code==='auth/id-token-revoked'
  );
  const next=await signInWithEmailAndPassword(cAuth,accountEmail,password);
  assert.equal(next.user.uid,uid);
  const renewedToken=await next.user.getIdToken();
  assert.notEqual(renewedToken,staleToken);
  assert.equal((await aAuth.verifyIdToken(renewedToken,true)).uid,uid);
  assert.equal(pickupHistoryIdentityMatches(uid,next.user),true);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(sameUidEvents>=2,'a new same-UID sign-in should notify token observers');
 }finally{unsubscribe();}
});

test('R5.1 disabled Firebase account is rejected and cannot log in again',async()=>{
 const accountEmail=email('disabled');
 const original=await createUserWithEmailAndPassword(cAuth,accountEmail,password);
 const old=await original.user.getIdToken();
 await aAuth.updateUser(original.user.uid,{disabled:true});
 await assert.rejects(aAuth.verifyIdToken(old,true),err=>err?.code==='auth/user-disabled');
 await signOut(cAuth);
 await assert.rejects(signInWithEmailAndPassword(cAuth,accountEmail,password),err=>err?.code==='auth/user-disabled');
 assert.equal(cAuth.currentUser,null);
});

test('R5.1 switching Customer A to B rejects stale A-owned history even with another valid Firebase session',async()=>{
 const accountA=await createUserWithEmailAndPassword(cAuth,email('a'),password);
 const oldUid=accountA.user.uid;
 const accountB=await createUserWithEmailAndPassword(cAuth,email('b'),password);
 assert.notEqual(accountB.user.uid,oldUid);
 assert.equal((await aAuth.verifyIdToken(await accountB.user.getIdToken(),true)).uid,accountB.user.uid);
 assert.equal(pickupHistoryIdentityMatches(oldUid,cAuth.currentUser),false);
 assert.equal(pickupHistoryIdentityMatches(accountB.user.uid,cAuth.currentUser),true);
});

test('R5.1 anonymous Firebase account never gains registered-customer history eligibility',async()=>{
 await signOut(cAuth);
 const guest=await signInAnonymously(cAuth);
 const verified=await aAuth.verifyIdToken(await guest.user.getIdToken(),true);
 assert.equal(verified.firebase.sign_in_provider,'anonymous');
 assert.equal(pickupHistoryIdentityMatches(guest.user.uid,guest.user),false);
});

test('R5.1 local sign-out clears the SDK user; invalid non-emulator tokens fail verification',async()=>{
 await signOut(cAuth);
 assert.equal(cAuth.currentUser,null);
 assert.equal(pickupHistoryIdentityMatches('someone',cAuth.currentUser),false);
 await assert.rejects(aAuth.verifyIdToken('forged-browser-token',true));
});

test.after(async()=>{
 await signOut(cAuth).catch(()=>{});
 await deleteClient(cApp);
 await deleteAdmin(aApp);
});
