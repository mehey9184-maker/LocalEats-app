import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {startDeferredSubscription} from "../src/lib/deferredSubscription.ts";
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test("unmount before lazy module resolves never creates a listener",async()=>{
 let resolveLoad,starts=0;
 const load=new Promise(resolve=>resolveLoad=resolve);
 const stop=startDeferredSubscription(()=>load,()=>{starts++;return ()=>{};},()=>true);
 await turn();stop();resolveLoad({});await turn();assert.equal(starts,0);
});
test("account change before lazy load prevents stale subscription",async()=>{
 let uid="alice",resolveLoad,starts=0;
 const load=new Promise(resolve=>resolveLoad=resolve);
 const stop=startDeferredSubscription(()=>load,()=>{starts++;return ()=>{};},()=>uid==="alice");
 await turn();uid="bob";resolveLoad({});await turn();assert.equal(starts,0);stop();
});
test("active subscription delivers once, rejects stale callbacks, cleans up exactly once",async()=>{
 let uid="alice",deliver,received=0,cleanups=0;
 const stop=startDeferredSubscription(async()=>({}),(_module,active)=>{deliver=()=>{if(active())received++;};return ()=>{cleanups++;};},()=>uid==="alice");
 await turn();deliver();uid="bob";deliver();uid="alice";stop();stop();deliver();
 assert.equal(received,1);assert.equal(cleanups,1);
});
test("optional module load failure does not create subscription or unhandled rejection",async()=>{
 let failures=0,starts=0;
 const stop=startDeferredSubscription(async()=>{throw Error("synthetic load failure");},()=>{starts++;return ()=>{};},()=>true,()=>{failures++;});
 await turn();stop();assert.equal(starts,0);assert.equal(failures,1);
});
test("startup uses catalog state, not Firestore diagnostic or courier listener for pickup",()=>{
 const read=p=>readFileSync(p,"utf8");
 const fb=read("src/lib/firebase.ts"),legacy=read("src/lib/legacyFirestoreReads.ts"),app=read("src/App.tsx"),status=read("src/components/SystemStatusIndicator.tsx"),chat=read("src/components/GlobalChatListener.tsx");
 assert.doesNotMatch(fb,/import\s+(?!type\s)[^;]*from ["']firebase\/firestore["']/);
 assert.match(fb,/await import\("\.\/legacyFirestoreReads"\)/);
 assert.match(legacy,/getFirestore\(app,firestoreDatabaseId\)/);
 assert.doesNotMatch(legacy,/getFirestore\(app\)|setDoc\(|updateDoc\(|deleteDoc\(|addDoc\(|writeBatch\(/);
 assert.doesNotMatch(status,/FirestoreService|setInterval\(|fetch\(/);
 assert.match(app,/<SystemStatusIndicator catalogStatus=/);
 assert.doesNotMatch(app,/import.*FirestoreDiagnosticComponent/);
 assert.match(chat,/o\.user_id===uid/);
 assert.match(chat,/o\.delivery_type!=="collection"/);
 assert.match(chat,/startDeferredSubscription/);
 assert.match(chat,/if\(!active\(\)\)return/);
 assert.match(fb,/customerPickupApi\.subscribe\(installationId, fcmToken\)/);
});
