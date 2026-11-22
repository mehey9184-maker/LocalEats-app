import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';

async function loadFirebaseCompatibilityMock({mailFails=false,creationFails=false}={}){
 const actions={create:0,mail:0,login:0};
 const firebaseUser={uid:'synthetic-firebase-uid-1',email:'fixture@example.com',displayName:'',isAnonymous:false,
  getIdToken:async()=> 'synthetic-firebase-id-token'};
 const auth={currentUser:null,authStateReady:async()=>{},onAuthStateChanged(){return()=>{}}};
 const api={auth,actions,firebaseUser};
 globalThis.__LOCALEATS_AUTH_TEST__=api;
 const mocks={
  'firebase/auth':`
   const s=globalThis.__LOCALEATS_AUTH_TEST__;
   export async function createUserWithEmailAndPassword(a,email,password){
    s.actions.create++;
    if(${creationFails})throw Object.assign(Error('auth/email-already-in-use'),{code:'auth/email-already-in-use'});
    a.currentUser=s.firebaseUser;
    return {user:s.firebaseUser};
   }
   export async function sendEmailVerification(user){
    s.actions.mail++;
    if(${mailFails})throw Error('simulated-mail-outage');
   }
   export async function signInWithEmailAndPassword(a,email,password){
    s.actions.login++;
    a.currentUser=s.firebaseUser;
    return {user:s.firebaseUser};
   }
   export async function updateProfile(user,details){user.displayName=details.displayName;}
   export async function signOut(a){a.currentUser=null;}
   export function onAuthStateChanged(){return()=>{};}
   export async function updatePassword(){}
   export async function sendPasswordResetEmail(){}
   export class GoogleAuthProvider {}
   export async function signInWithPopup(){return {user:s.firebaseUser};}
  `,
  './firebase': `export const auth=globalThis.__LOCALEATS_AUTH_TEST__.auth;`
 };
 const result=await build({entryPoints:['src/lib/supabase.ts'],platform:'node',format:'esm',bundle:true,write:false,logLevel:'silent',
  plugins:[{name:'mock-firebase-contract',setup(engine){
   engine.onResolve({filter:new RegExp('^firebase/auth()=>({path:'firebase/auth',namespace:'auth-contract'}));
   engine.onResolve({filter:new RegExp('^\\.\\/firebase()=>({path:'./firebase',namespace:'auth-contract'}));
   engine.onLoad({filter:/.*/,namespace:'auth-contract'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
 const mod=await import('data:text/javascript;base64,'+
  Buffer.from(result.outputFiles[0].contents).toString('base64')+'#'+Math.random());
 return {supabase:mod.supabase,auth,actions,firebaseUser};
}

test('new Firebase email/password signup returns matching session UID and token for pickup API',async()=>{
 const {supabase,auth,actions}=await loadFirebaseCompatibilityMock();
 const result=await supabase.auth.signUp({email:'fixture@example.com',password:'safe-fixture-password',
  options:{data:{full_name:'Test Customer'},emailRedirectTo:'https://preview.example.test'}});
 assert.equal(result.error,null);
 assert.equal(result.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(result.data.verificationEmailSent,true);
 assert.deepEqual(actions,{create:1,mail:1,login:0});
 const active=await supabase.auth.getSession();
 assert.equal(active.data.session.user.id,result.data.user.id);
 assert.equal(active.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(auth.currentUser.uid,active.data.session.user.id);
});

test('verification delivery failure preserves created Firebase identity and honest UI flag',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({mailFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password',
  options:{data:{full_name:'Test Customer'}}});
 assert.equal(r.error,null);
 assert.equal(r.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.verificationEmailSent,false);
 assert.equal(actions.create,1);
 assert.equal(actions.mail,1);
 assert.equal((await supabase.auth.getSession()).data.session.user.id,r.data.user.id);
});

test('a duplicate Firebase signup does not falsely return a user or send verification',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({creationFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.data.user,null);
 assert.match(r.error.message,/email-already-in-use/);
 assert.deepEqual(actions,{create:1,mail:0,login:0});
});

test('Firebase email/password login preserves same UID and usable ID token',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock();
 const r=await supabase.auth.signInWithPassword({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.error,null);
 assert.equal(r.data.session.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(actions.login,1);
});

test('the customer ordering client and server both use Firebase identity, not Supabase JWT',()=>{
 const client=readFileSync('src/services/customerPickup.ts','utf8');
 const server=readFileSync('src/lib/supabase.ts','utf8');
 const app=readFileSync('src/App.tsx','utf8');
 const password=readFileSync('src/screens/auth/SetupPasswordScreen.tsx','utf8');
 assert.match(client,/return user\.getIdToken\(\)/);
 assert.match(client,/if\(!user \|\| user\.isAnonymous\)/);
 assert.match(server,/createUserWithEmailAndPassword/);
 assert.match(server,/signInWithEmailAndPassword/);
 assert.match(server,/sendEmailVerification\(userCredential\.user\)/);
 assert.match(password,/onNext\(data\.verificationEmailSent === true\)/);
 assert.match(app,/if \(prev === "setup-password" \|\| prev === "success"\) return prev/);
 assert.match(app,/verificationEmailSent=\{signupVerificationEmailSent\}/);
});
)},()=>({path:'firebase/auth',namespace:'auth-contract'}));
   engine.onResolve({filter:/^\\.\\/firebase$/},()=>({path:'./firebase',namespace:'auth-contract'}));
   engine.onLoad({filter:/.*/,namespace:'auth-contract'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
 const mod=await import('data:text/javascript;base64,'+
  Buffer.from(result.outputFiles[0].contents).toString('base64')+'#'+Math.random());
 return {supabase:mod.supabase,auth,actions,firebaseUser};
}

test('new Firebase email/password signup returns matching session UID and token for pickup API',async()=>{
 const {supabase,auth,actions}=await loadFirebaseCompatibilityMock();
 const result=await supabase.auth.signUp({email:'fixture@example.com',password:'safe-fixture-password',
  options:{data:{full_name:'Test Customer'},emailRedirectTo:'https://preview.example.test'}});
 assert.equal(result.error,null);
 assert.equal(result.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(result.data.verificationEmailSent,true);
 assert.deepEqual(actions,{create:1,mail:1,login:0});
 const active=await supabase.auth.getSession();
 assert.equal(active.data.session.user.id,result.data.user.id);
 assert.equal(active.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(auth.currentUser.uid,active.data.session.user.id);
});

test('verification delivery failure preserves created Firebase identity and honest UI flag',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({mailFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password',
  options:{data:{full_name:'Test Customer'}}});
 assert.equal(r.error,null);
 assert.equal(r.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.verificationEmailSent,false);
 assert.equal(actions.create,1);
 assert.equal(actions.mail,1);
 assert.equal((await supabase.auth.getSession()).data.session.user.id,r.data.user.id);
});

test('a duplicate Firebase signup does not falsely return a user or send verification',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({creationFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.data.user,null);
 assert.match(r.error.message,/email-already-in-use/);
 assert.deepEqual(actions,{create:1,mail:0,login:0});
});

test('Firebase email/password login preserves same UID and usable ID token',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock();
 const r=await supabase.auth.signInWithPassword({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.error,null);
 assert.equal(r.data.session.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(actions.login,1);
});

test('the customer ordering client and server both use Firebase identity, not Supabase JWT',()=>{
 const client=readFileSync('src/services/customerPickup.ts','utf8');
 const server=readFileSync('src/lib/supabase.ts','utf8');
 const app=readFileSync('src/App.tsx','utf8');
 const password=readFileSync('src/screens/auth/SetupPasswordScreen.tsx','utf8');
 assert.match(client,/return user\.getIdToken\(\)/);
 assert.match(client,/if\(!user \|\| user\.isAnonymous\)/);
 assert.match(server,/createUserWithEmailAndPassword/);
 assert.match(server,/signInWithEmailAndPassword/);
 assert.match(server,/sendEmailVerification\(userCredential\.user\)/);
 assert.match(password,/onNext\(data\.verificationEmailSent === true\)/);
 assert.match(app,/if \(prev === "setup-password" \|\| prev === "success"\) return prev/);
 assert.match(app,/verificationEmailSent=\{signupVerificationEmailSent\}/);
});
)},()=>({path:'./firebase',namespace:'auth-contract'}));
   engine.onLoad({filter:/.*/,namespace:'auth-contract'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
 const mod=await import('data:text/javascript;base64,'+
  Buffer.from(result.outputFiles[0].contents).toString('base64')+'#'+Math.random());
 return {supabase:mod.supabase,auth,actions,firebaseUser};
}

test('new Firebase email/password signup returns matching session UID and token for pickup API',async()=>{
 const {supabase,auth,actions}=await loadFirebaseCompatibilityMock();
 const result=await supabase.auth.signUp({email:'fixture@example.com',password:'safe-fixture-password',
  options:{data:{full_name:'Test Customer'},emailRedirectTo:'https://preview.example.test'}});
 assert.equal(result.error,null);
 assert.equal(result.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(result.data.verificationEmailSent,true);
 assert.deepEqual(actions,{create:1,mail:1,login:0});
 const active=await supabase.auth.getSession();
 assert.equal(active.data.session.user.id,result.data.user.id);
 assert.equal(active.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(auth.currentUser.uid,active.data.session.user.id);
});

test('verification delivery failure preserves created Firebase identity and honest UI flag',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({mailFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password',
  options:{data:{full_name:'Test Customer'}}});
 assert.equal(r.error,null);
 assert.equal(r.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.verificationEmailSent,false);
 assert.equal(actions.create,1);
 assert.equal(actions.mail,1);
 assert.equal((await supabase.auth.getSession()).data.session.user.id,r.data.user.id);
});

test('a duplicate Firebase signup does not falsely return a user or send verification',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({creationFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.data.user,null);
 assert.match(r.error.message,/email-already-in-use/);
 assert.deepEqual(actions,{create:1,mail:0,login:0});
});

test('Firebase email/password login preserves same UID and usable ID token',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock();
 const r=await supabase.auth.signInWithPassword({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.error,null);
 assert.equal(r.data.session.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(actions.login,1);
});

test('the customer ordering client and server both use Firebase identity, not Supabase JWT',()=>{
 const client=readFileSync('src/services/customerPickup.ts','utf8');
 const server=readFileSync('src/lib/supabase.ts','utf8');
 const app=readFileSync('src/App.tsx','utf8');
 const password=readFileSync('src/screens/auth/SetupPasswordScreen.tsx','utf8');
 assert.match(client,/return user\.getIdToken\(\)/);
 assert.match(client,/if\(!user \|\| user\.isAnonymous\)/);
 assert.match(server,/createUserWithEmailAndPassword/);
 assert.match(server,/signInWithEmailAndPassword/);
 assert.match(server,/sendEmailVerification\(userCredential\.user\)/);
 assert.match(password,/onNext\(data\.verificationEmailSent === true\)/);
 assert.match(app,/if \(prev === "setup-password" \|\| prev === "success"\) return prev/);
 assert.match(app,/verificationEmailSent=\{signupVerificationEmailSent\}/);
});
)},()=>({path:'firebase/auth',namespace:'auth-contract'}));
   engine.onResolve({filter:/^\\.\\/firebase$/},()=>({path:'./firebase',namespace:'auth-contract'}));
   engine.onLoad({filter:/.*/,namespace:'auth-contract'},args=>({contents:mocks[args.path],loader:'js'}));
  }}]});
 const mod=await import('data:text/javascript;base64,'+
  Buffer.from(result.outputFiles[0].contents).toString('base64')+'#'+Math.random());
 return {supabase:mod.supabase,auth,actions,firebaseUser};
}

test('new Firebase email/password signup returns matching session UID and token for pickup API',async()=>{
 const {supabase,auth,actions}=await loadFirebaseCompatibilityMock();
 const result=await supabase.auth.signUp({email:'fixture@example.com',password:'safe-fixture-password',
  options:{data:{full_name:'Test Customer'},emailRedirectTo:'https://preview.example.test'}});
 assert.equal(result.error,null);
 assert.equal(result.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(result.data.verificationEmailSent,true);
 assert.deepEqual(actions,{create:1,mail:1,login:0});
 const active=await supabase.auth.getSession();
 assert.equal(active.data.session.user.id,result.data.user.id);
 assert.equal(active.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(auth.currentUser.uid,active.data.session.user.id);
});

test('verification delivery failure preserves created Firebase identity and honest UI flag',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({mailFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password',
  options:{data:{full_name:'Test Customer'}}});
 assert.equal(r.error,null);
 assert.equal(r.data.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.verificationEmailSent,false);
 assert.equal(actions.create,1);
 assert.equal(actions.mail,1);
 assert.equal((await supabase.auth.getSession()).data.session.user.id,r.data.user.id);
});

test('a duplicate Firebase signup does not falsely return a user or send verification',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock({creationFails:true});
 const r=await supabase.auth.signUp({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.data.user,null);
 assert.match(r.error.message,/email-already-in-use/);
 assert.deepEqual(actions,{create:1,mail:0,login:0});
});

test('Firebase email/password login preserves same UID and usable ID token',async()=>{
 const {supabase,actions}=await loadFirebaseCompatibilityMock();
 const r=await supabase.auth.signInWithPassword({email:'fixture@example.com',password:'test-long-password'});
 assert.equal(r.error,null);
 assert.equal(r.data.session.user.id,'synthetic-firebase-uid-1');
 assert.equal(r.data.session.access_token,'synthetic-firebase-id-token');
 assert.equal(actions.login,1);
});

test('the customer ordering client and server both use Firebase identity, not Supabase JWT',()=>{
 const client=readFileSync('src/services/customerPickup.ts','utf8');
 const server=readFileSync('src/lib/supabase.ts','utf8');
 const app=readFileSync('src/App.tsx','utf8');
 const password=readFileSync('src/screens/auth/SetupPasswordScreen.tsx','utf8');
 assert.match(client,/return user\.getIdToken\(\)/);
 assert.match(client,/if\(!user \|\| user\.isAnonymous\)/);
 assert.match(server,/createUserWithEmailAndPassword/);
 assert.match(server,/signInWithEmailAndPassword/);
 assert.match(server,/sendEmailVerification\(userCredential\.user\)/);
 assert.match(password,/onNext\(data\.verificationEmailSent === true\)/);
 assert.match(app,/if \(prev === "setup-password" \|\| prev === "success"\) return prev/);
 assert.match(app,/verificationEmailSent=\{signupVerificationEmailSent\}/);
});
