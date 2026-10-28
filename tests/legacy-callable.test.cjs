const test=require("node:test");const assert=require("node:assert/strict");
const {createOrder}=require("../functions/lib/index.js");
const {getFirestore}=require("firebase-admin/firestore");
test("published callable rejects both signed-in and unsigned legacy requests before transactions",async()=>{
 const db=getFirestore("ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");
 const original=db.runTransaction;let calls=0;db.runTransaction=()=>{calls++;throw Error("must not write");};
 try{
  await assert.rejects(()=>createOrder.run({data:{}}),error=>error.code==="unauthenticated");
  await assert.rejects(()=>createOrder.run({data:{},auth:{uid:"test-customer"}}),
   error=>error.code==="failed-precondition"&&error.details.code==="PICKUP_CONTRACT_REQUIRED");
  assert.equal(calls,0);
 }finally{db.runTransaction=original;}
});
