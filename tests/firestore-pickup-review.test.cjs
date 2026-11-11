const {test}=require("node:test");
const {readFileSync}=require("node:fs");
const assert=require("node:assert/strict");
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing");
const {doc,getDoc,setDoc,updateDoc,deleteField}=require("firebase/firestore");

test("deployed baseline demonstrates direct order changes and broad rider visibility; candidate blocks them",async()=>{
 for(const [name,baseline] of [["firestore-deployed-baseline.rules",true],["firestore-pickup-phase1.rules",false],["firestore.rules",false]]){
  const env=await initializeTestEnvironment({
   projectId:"demo-pickup-rules",firestore:{host:"127.0.0.1",port:8080,
    rules:readFileSync(name==="firestore.rules"?name:"security/review/"+name,"utf8")}
  });
  try{
   await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();
    await Promise.all([
     setDoc(doc(db,"shops/shop"),{owner_id:"merchant",name:"Synthetic shop"}),
     setDoc(doc(db,"menu_items/item"),{shop_id:"shop",name:"Synthetic item",price:25}),
     setDoc(doc(db,"orders/order"),{user_id:"customer",shop_id:"shop",rider_id:"rider",delivery_status:"none",status:"pending",total_price:25,subtotal:25,delivery_fee:0,service_fee:0,payment_status:"unpaid",payment_method:"cash"}),
     setDoc(doc(db,"orders/pool"),{user_id:"another-customer",shop_id:"another-shop",rider_id:null,delivery_status:"finding_rider"}),
     setDoc(doc(db,"rider_profiles/rider"),{id:"rider",phone:"synthetic",current_latitude:-26}),
     setDoc(doc(db,"users/customer"),{name:"Synthetic customer"})
    ]);
   });
   const customer=env.authenticatedContext("customer").firestore();
   const merchant=env.authenticatedContext("merchant").firestore();
   const stranger=env.authenticatedContext("stranger").firestore();
   const rider=env.authenticatedContext("rider").firestore();
   const guest=env.unauthenticatedContext().firestore();
   await assertSucceeds(getDoc(doc(guest,"shops/shop")));
   await assertSucceeds(getDoc(doc(guest,"menu_items/item")));
   await assertSucceeds(getDoc(doc(customer,"orders/order")));
   await assertSucceeds(getDoc(doc(merchant,"orders/order")));
   await assertSucceeds(getDoc(doc(customer,"users/customer")));
   await assertSucceeds(getDoc(doc(rider,"rider_profiles/rider")));
   await assertFails(getDoc(doc(stranger,"users/customer")));
   await assertFails(getDoc(doc(stranger,"orders/order")));
   await assertFails(getDoc(doc(guest,"orders/order")));
   const check=baseline?assertSucceeds:assertFails;
   await check(updateDoc(doc(customer,"orders/order"),{status:"collected"}));
   await check(updateDoc(doc(merchant,"orders/order"),{status:"ready_for_pickup"}));
   await check(updateDoc(doc(customer,"orders/order"),{total_price:deleteField()}));
   await check(getDoc(doc(stranger,"orders/pool")));
   await check(getDoc(doc(stranger,"rider_profiles/rider")));
   if(!baseline){
    const order=await getDoc(doc(customer,"orders/order"));
    assert.equal(order.data().status,"pending");
    assert.equal(order.data().total_price,25);
   }
  }finally{await env.clearFirestore();await env.cleanup();}
 }
});
