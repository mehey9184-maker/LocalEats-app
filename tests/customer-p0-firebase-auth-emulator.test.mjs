import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {initializeApp,deleteApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {normalizeProfileInput,ownerMatches} from "../api/_lib/profilePolicy.ts";
import {isConfirmedProfileSave} from "../src/lib/profileConfirmation.ts";

const PROJECT_ID="demo-localeats-p0";
const HOST="127.0.0.1:9099";
function checkEmulatorOnly(){
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST||"",/^(?:127\.0\.0\.1|localhost):9099$/);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||"",/^(?:127\.0\.0\.1|localhost):8080$/);
  assert.ok(PROJECT_ID.startsWith("demo-"));
}
async function authRequest(operation,body){
  const response=await fetch("http://"+HOST+"/identitytoolkit.googleapis.com/v1/accounts:"+operation+"?key=local-emulator-only",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000),
  });
  const payload=await response.json();
  assert.equal(response.status,200,"Firebase Auth emulator "+operation+": "+JSON.stringify(payload.error||{}));
  return payload;
}
test("Two fake Firebase accounts: emulator tokens, in-memory profile save and account isolation",async()=>{
  checkEmulatorOnly();
  const suffix=randomUUID().replace(/-/g,"");
  const emailA="p0-test-a-"+suffix+"@example.test",emailB="p0-test-b-"+suffix+"@example.test";
  const password="FakeOnlyP0-"+suffix;
  const adminApp=initializeApp({projectId:PROJECT_ID},"p0-local-"+suffix);
  const admin=getAuth(adminApp);
  // This is a test-only Map, NOT Supabase or a production database.
  const fakeProfiles=new Map();
  const simulatedProfileRequest=async(method,idToken,uid,raw)=>{
    const verified=await admin.verifyIdToken(idToken,true);
    if(!ownerMatches(uid,verified.uid))
      return {status:403,data:{success:false,error:"Cross-account access denied"}};
    if(method==="GET")
      return fakeProfiles.has(uid)
        ? {status:200,data:{success:true,profile:fakeProfiles.get(uid)}}
        : {status:404,data:{success:false,error:"Missing demo profile"}};
    if(method!=="POST")return {status:405,data:{success:false}};
    const input=normalizeProfileInput(raw,verified.uid,verified.email);
    const profile={...input,user_id:verified.uid};
    fakeProfiles.set(verified.uid,profile);
    return {status:200,data:{success:true,profile}};
  };
  try{
    const a=await authRequest("signUp",{email:emailA,password,returnSecureToken:true});
    const b=await authRequest("signUp",{email:emailB,password,returnSecureToken:true});
    assert.ok(a.localId&&b.localId&&a.localId!==b.localId);
    const decodedA=await admin.verifyIdToken(a.idToken,true);
    const decodedB=await admin.verifyIdToken(b.idToken,true);
    assert.equal(decodedA.uid,a.localId);
    assert.equal(decodedB.uid,b.localId);
    assert.ok(ownerMatches(a.localId,decodedA.uid));
    assert.equal(ownerMatches(b.localId,decodedA.uid),false);
    assert.equal((await simulatedProfileRequest("GET",a.idToken,a.localId)).status,404);
    const savedA=await simulatedProfileRequest("POST",a.idToken,a.localId,{
      user_id:a.localId,fullName:"Dummy A",city:"Testing",role:"admin",balance:999,
    });
    assert.equal(savedA.status,200);
    assert.equal(isConfirmedProfileSave(savedA.status,"application/json",savedA.data,a.localId),true);
    assert.equal("role" in savedA.data.profile,false);
    assert.equal("balance" in savedA.data.profile,false);
    assert.equal((await simulatedProfileRequest("GET",a.idToken,a.localId)).data.profile.fullName,"Dummy A");
    assert.equal((await simulatedProfileRequest("GET",a.idToken,b.localId)).status,403);
    assert.equal((await simulatedProfileRequest("POST",a.idToken,b.localId,{user_id:b.localId,fullName:"Intruder"})).status,403);
    assert.equal((await simulatedProfileRequest("GET",b.idToken,a.localId)).status,403);
    assert.equal((await simulatedProfileRequest("GET",b.idToken,b.localId)).status,404);
    const savedB=await simulatedProfileRequest("POST",b.idToken,b.localId,{user_id:b.localId,fullName:"Dummy B"});
    assert.equal(savedB.status,200);
    assert.equal(fakeProfiles.size,2);
    assert.equal(fakeProfiles.get(a.localId).fullName,"Dummy A");
    assert.equal(fakeProfiles.get(b.localId).fullName,"Dummy B");
    const loginA=await authRequest("signInWithPassword",{email:emailA,password,returnSecureToken:true});
    assert.equal((await admin.verifyIdToken(loginA.idToken,true)).uid,a.localId);
    assert.equal((await simulatedProfileRequest("GET",loginA.idToken,a.localId)).data.profile.fullName,"Dummy A");
  }finally{
    await deleteApp(adminApp);
  }
});
