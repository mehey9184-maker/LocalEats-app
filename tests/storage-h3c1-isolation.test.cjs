const {test}=require("node:test");
const {readFileSync}=require("node:fs");
const assert=require("node:assert/strict");
const {initializeTestEnvironment,assertFails}=require("@firebase/rules-unit-testing");
const {ref,uploadBytes,getBytes,deleteObject,updateMetadata}=require("firebase/storage");
test("review-only storage denies all browser media access including same-user and cross-account",async()=>{
 const env=await initializeTestEnvironment({projectId:"demo-pickup-rules",storage:{host:"127.0.0.1",port:9199,rules:readFileSync("security/review/storage-h3c1.rules","utf8")}});
 const bucket="gs://demo-pickup-rules.appspot.com";
 try{
   await env.withSecurityRulesDisabled(async ctx=>{await uploadBytes(ref(ctx.storage(bucket),"avatars/customer/photo.jpg"),new Uint8Array([1,2,3]),{contentType:"image/jpeg"});});
   for(const actor of [env.unauthenticatedContext(),env.authenticatedContext("customer"),env.authenticatedContext("merchant"),env.authenticatedContext("stranger")]){
     const storage=actor.storage(bucket);
     for(const path of ["avatars/customer/photo.jpg","shop-assets/shop/logo.jpg","menu-items/shop/item.jpg"]){
       const target=ref(storage,path);
       await assertFails(uploadBytes(target,new Uint8Array([1,2,3]),{contentType:"image/jpeg"}));
     }
     const old=ref(storage,"avatars/customer/photo.jpg");
     await assertFails(getBytes(old));await assertFails(deleteObject(old));await assertFails(updateMetadata(old,{contentType:"text/html"}));
   }
   await env.withSecurityRulesDisabled(async ctx=>{assert.equal((await getBytes(ref(ctx.storage(bucket),"avatars/customer/photo.jpg"))).byteLength,3);});
 }finally{await env.clearStorage();await env.cleanup();}
 console.log("H3C1_STORAGE_DENIAL_PASS");
});
