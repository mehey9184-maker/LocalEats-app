import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pickupHistoryIdentityMatches,pickupHistoryNeedsSignIn} from '../src/services/pickupHistoryAuth.ts';
import {createPickupApi,PickupApiError} from '../src/pickup/client.ts';

const app=()=>readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const history=()=>readFileSync(new URL('../src/screens/OrderHistoryScreen.tsx',import.meta.url),'utf8');
const tracker=()=>readFileSync(new URL('../src/screens/PickupTrackingScreen.tsx',import.meta.url),'utf8');
const helper=()=>readFileSync(new URL('../src/services/pickupHistoryAuth.ts',import.meta.url),'utf8');
const success=(orders=[])=>new Response(JSON.stringify({success:true,orders}),{status:200});
const failure=(status,code='REQUEST_FAILED')=>new Response(
 JSON.stringify({success:false,error:status===401?'Unauthorized':'Service unavailable',code}),{status});

test('R5.0 accepts only matching, non-anonymous Firebase and Supabase account UIDs',()=>{
 for(const uid of [null,undefined,'','uid-b',' uid-a ']){
  assert.equal(pickupHistoryIdentityMatches('uid-a',uid?{uid,isAnonymous:false}:null),false);
 }
 assert.equal(pickupHistoryIdentityMatches('uid-a',{uid:'uid-a',isAnonymous:true}),false);
 assert.equal(pickupHistoryIdentityMatches('uid-a',{uid:'uid-a',isAnonymous:false}),true);
 assert.equal(pickupHistoryIdentityMatches(undefined,{uid:'uid-a'}),false);
 assert.equal(pickupHistoryIdentityMatches('uid-a',null),false);
});
test('R5.0 Firebase 401/disabled/revoked are classified as sign-in required, never as empty history',()=>{
 assert.equal(pickupHistoryNeedsSignIn(new PickupApiError(401,'UNAUTHORIZED','Unauthorized')),true);
 assert.equal(pickupHistoryNeedsSignIn({status:401}),true);
 for(const code of ['auth/user-token-expired','auth/id-token-revoked','auth/user-disabled',
  'auth/invalid-user-token','auth/user-not-found']){
  assert.equal(pickupHistoryNeedsSignIn({code}),true,code);
 }
});
test('R5.0 offline, slow server, generic 503, missing malformed server data are retryable NOT forced sign-out',()=>{
 for(const error of [null,undefined,new Error('offline'),{code:'auth/network-request-failed'},
  new PickupApiError(0,'CONNECTION_LOST','Connection lost'),
  new PickupApiError(503,'DATABASE_UNAVAILABLE','Database offline'),
  new PickupApiError(504,'TIMEOUT','Timeout'),{status:403},'Unauthorized']){
   assert.equal(pickupHistoryNeedsSignIn(error),false,String(error));
 }
});
test('R5.0 real API client still rejects 401 rather than inventing an empty list or auto-create',async()=>{
 let calls=0;
 const api=createPickupApi('http://127.0.0.1:9999',async()=>'mock-token-'+(++calls),
   async(_url,opts)=>{assert.equal(opts.method,'GET');return failure(401,'UNAUTHORIZED')});
 await assert.rejects(()=>api.orders(),e=>e.status===401&&e.code==='UNAUTHORIZED');
 assert.equal(calls,1);
});
test('R5.0 actual API client remains recoverable on a new auth token without storing old account data',async()=>{
 let token='stale';const used=[];
 const api=createPickupApi('http://127.0.0.1:9999',async()=>token,
  async(_url,opts)=>{
   used.push(opts.headers.Authorization);
   return token==='stale'?failure(401,'UNAUTHORIZED'):success([{id:'new',user_id:'new-user'}]);
  });
 await assert.rejects(()=>api.orders(),e=>e.status===401);
 token='fresh';
 const res=await api.orders();
 assert.deepEqual(res.orders,[{id:'new',user_id:'new-user'}]);
 assert.deepEqual(used,['Bearer fb-stale','Bearer fb-fresh']);
});
test('R5.0 history effect waits for Firebase hydration, rechecks identity, aborts stale reads and stops after a 401',()=>{
 const s=app();
 assert.match(s,/onAuthStateChanged\(auth, user =>/);
 assert.match(s,/pickupHistoryIdentityMatches\(historyUserId,user\)/);
 assert.match(s,/requestedFirebaseUid !== auth\.currentUser\?\.uid/);
 assert.match(s,/if \(!active \|\| inFlight \|\| authBlocked\) return/);
 assert.match(s,/if \(pickupHistoryNeedsSignIn\(error\)/);
 assert.match(s,/feedRequest\?\.abort\(\)/);
 assert.match(s,/setOrders\(\[\]\)/);
 assert.match(s,/setNotifications\(\[\]\)/);
 assert.match(s,/authRequired: true/);
 assert.doesNotMatch(s,/void refresh\(\);\n    const timer = setInterval\(refresh, 30000\)/);
});
test('R5.0 original history and tracker cards retain generic Retry only for non-auth errors',()=>{
 const h=history(),t=tracker();
 assert.match(h,/authRequired \? \(/);
 assert.match(h,/onClick=\{onSignIn\}/);
 assert.match(h,/Open sign in/);
 assert.match(h,/onClick=\{onRetry\} disabled=\{refreshing\}/);
 assert.match(t,/authRequired\?<button type="button" onClick=\{onSignIn\}/);
 assert.match(t,/disabled=\{!signedIn\|\|refreshing\|\|authRequired\}/);
 assert.match(t,/onRetry\} disabled=\{refreshing\}/);
});
test('R5.0 explicit safety boundary: no simulated checkout, global signout or Firebase/Supabase account linkage',()=>{
 const s=app(),h=helper();
 assert.match(s,/setPickupHistory\(\{\s*userId: historyUserId, orders: null, error: true/);
 assert.match(s,/if \(!active \|\| authBlocked \|\| inboxInFlight \|\| !pickupOrderingEnabled\(\)\) return/);
 assert.doesNotMatch(h,/signOut|signInWith|localStorage|PICKUP_WRITES_ENABLED|createOrder/);
 const source=readFileSync(new URL('../src/services/customerPickup.ts',import.meta.url),'utf8');
 assert.match(source,/if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
});
