// Local emulator only. Never falls back to a cloud project or Admin credentials.
const {test}=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");
const mode=process.argv[2]||"customer",file=process.argv[3]||"firestore.rules";
if(!["customer","merchant"].includes(mode))throw Error("Choose customer or merchant rules.");
if(process.env.FIRESTORE_EMULATOR_HOST!=="127.0.0.1:8089"){
 console.error("Start the loopback Firestore emulator on 127.0.0.1:8089; no cloud fallback permitted.");process.exit(2);
}
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing");
const {doc,setDoc,getDoc,updateDoc,deleteDoc,writeBatch,runTransaction}=require("firebase/firestore");
test(mode+" rules deny all root order mutations and preserve existing Rider/history access",async()=>{
 const env=await initializeTestEnvironment({projectId:"demo-pickup-rules-"+mode,
  firestore:{host:"127.0.0.1",port:8089,rules:fs.readFileSync(file,"utf8")}});
 try{
  await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   await setDoc(doc(db,"shops/shop"),{owner_id:"merchant"});
   await setDoc(doc(db,"orders/history"),{user_id:"customer",shop_id:"shop",rider_id:"rider",status:"delivered",delivery_status:"delivered",total_price:25,payment_status:"unpaid"});
   await setDoc(doc(db,"rider_profiles/rider"),{id:"rider",verification_status:"approved",total_earnings:0,total_deliveries:0,active_points:0,rating:0});
   await setDoc(doc(db,"rider_connections/pair"),{rider_id:"rider",shop_id:"shop",status:"approved"});
   await setDoc(doc(db,"payments/payment"),{shop_id:"shop",amount:25});
  });
  const customer=env.authenticatedContext("customer").firestore(),merchant=env.authenticatedContext("merchant").firestore();
  const rider=env.authenticatedContext("rider").firestore(),outsider=env.authenticatedContext("outsider").firestore();
  const unauth=env.unauthenticatedContext().firestore();
  for(const db of [customer,merchant,rider,outsider,unauth]){
   await assertFails(setDoc(doc(db,"orders/new"),{user_id:"customer",shop_id:"shop",status:"pending",total_price:1}));
   for(const patch of [{total_price:1},{payment_status:"paid"},{status:"collected"},{delivery_status:"delivered"},{rider_id:"outsider"}])
    await assertFails(updateDoc(doc(db,"orders/history"),patch));
   await assertFails(setDoc(doc(db,"orders/history"),{status:"pending"},{merge:true}));
   await assertFails(deleteDoc(doc(db,"orders/history")));
   await assertFails(setDoc(doc(db,"payments/new"),{shop_id:"shop",amount:1}));
  }
  for(const db of [customer,merchant,rider])await assertSucceeds(getDoc(doc(db,"orders/history")));
  if(mode==="merchant")await assertFails(getDoc(doc(outsider,"orders/history")));
  else await assertSucceeds(getDoc(doc(unauth,"orders/history"))); // Existing Customer read policy is unchanged, not endorsed.
  const batch=writeBatch(customer);batch.update(doc(customer,"orders/history"),{total_price:1});await assertFails(batch.commit());
  await assertFails(runTransaction(customer,async transaction=>{
   await transaction.get(doc(customer,"orders/history"));transaction.update(doc(customer,"orders/history"),{status:"collected"});
  }));
  const registering=env.authenticatedContext("new-rider").firestore();
  await assertSucceeds(setDoc(doc(registering,"rider_profiles/new-rider"),{id:"new-rider",verification_status:"pending"}));
  await assertSucceeds(getDoc(doc(rider,"rider_profiles/rider")));
  await assertSucceeds(updateDoc(doc(rider,"rider_profiles/rider"),{is_online:true}));
  await assertSucceeds(getDoc(doc(rider,"rider_connections/pair")));
  await assertSucceeds(setDoc(doc(merchant,"rider_connections/new-pair"),{rider_id:"rider",shop_id:"shop",status:"pending"}));
  if(mode==="merchant"){
   await assertFails(updateDoc(doc(rider,"rider_profiles/rider"),{verification_status:"approved-new"}));
   await assertSucceeds(getDoc(doc(merchant,"payments/payment")));
  }
  const final=await getDoc(doc(customer,"orders/history"));assert.equal(final.data().total_price,25);assert.equal(final.data().status,"delivered");
 }finally{await env.cleanup();}
});
