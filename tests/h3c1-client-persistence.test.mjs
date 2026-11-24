import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("customer legacy Firestore writes fail before provider access; protected profile and push API preserved",()=>{
 const f=read("src/lib/firebase.ts");
 for(const name of ["addReview","followShop","unfollowShop","submitContactMessage","updateRiderLocation","sendMessage","markMessagesAsRead","saveProfile","savePushToken","updateShop","updateMenuItem","addMenuItem","deleteMenuItem"]){
  const body=f.split("async "+name+"(")[1].split("  },")[0];
  assert.match(body,/No changes were saved/);
  assert.doesNotMatch(body,/await (setDoc|addDoc|deleteDoc|updateDoc|writeBatch)|await import/);
 }
 assert.match(f,/async seedDemoShopsIfEmpty\(\): Promise<boolean> \{[\s\S]*?return false/);
 assert.match(f,/customerPickupApi\.subscribe\(/);
 assert.match(read("src/lib/profileService.ts"),/hostedProfileRequest\(/);
 assert.doesNotMatch(read("src/App.tsx"),/FirestoreService\.(followShop|unfollowShop)\(/);
});
test("legacy privileged callable stays unconditionally disabled",()=>{
 const f=read("functions/src/index.ts");
 const published=f.split("export const createOrder = onCall")[1];
 assert.ok(published);
 assert.match(published,/unauthenticated/);
 assert.match(published,/PICKUP_CONTRACT_REQUIRED/);
 assert.doesNotMatch(published,/retainedLegacyCreateOrder\(|runTransaction\(|\.set\(/);
 assert.equal((f.match(/export const \w+ = onCall/g)||[]).length,1);
});
