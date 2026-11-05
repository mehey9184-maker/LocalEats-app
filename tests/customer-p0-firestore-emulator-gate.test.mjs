import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {initializeTestEnvironment,assertFails} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc} from "firebase/firestore";

const PROJECT_ID="demo-localeats-p0";
test("Release blocker: checked-in rules deny anonymous and cross-account private data access",async t=>{
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||"",/^(?:127\.0\.0\.1|localhost):8080$/);
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST||"",/^(?:127\.0\.0\.1|localhost):9099$/);
  assert.ok(PROJECT_ID.startsWith("demo-"));
  const env=await initializeTestEnvironment({
    projectId:PROJECT_ID,
    firestore:{host:"127.0.0.1",port:8080,rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")},
  });
  const id=randomUUID().replace(/-/g,""),uidA="fake-a-"+id,uidB="fake-b-"+id;
  try{
    await env.withSecurityRulesDisabled(async context=>{
      await setDoc(doc(context.firestore(),"profiles",uidA),{user_id:uidA,fullName:"Demo Only"});
      await setDoc(doc(context.firestore(),"orders","fake-order-"+id),{user_id:uidA,shop_id:"fake-shop",status:"pending"});
    });
    const anonymous=env.unauthenticatedContext().firestore();
    const wrongUser=env.authenticatedContext(uidB).firestore();
    await t.test("anonymous cannot read a private profile",async()=>{
      await assertFails(getDoc(doc(anonymous,"profiles",uidA)));
    });
    await t.test("customer B cannot overwrite customer A profile",async()=>{
      await assertFails(setDoc(doc(wrongUser,"profiles",uidA),{user_id:uidA,fullName:"Forged"}));
    });
    await t.test("anonymous cannot read customer A order",async()=>{
      await assertFails(getDoc(doc(anonymous,"orders","fake-order-"+id)));
    });
    await t.test("customer B cannot change customer A order",async()=>{
      await assertFails(setDoc(doc(wrongUser,"orders","fake-order-"+id),{user_id:uidA,status:"paid"}));
    });
  }finally{
    await env.cleanup();
  }
});
