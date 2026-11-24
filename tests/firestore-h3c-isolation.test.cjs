const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing");
const {doc,getDoc,setDoc,updateDoc,deleteDoc,deleteField,collection,getDocs,query,where}=require("firebase/firestore");

const files=[
 ["merchant-legacy","security/review/firestore-h3c-merchant-legacy.rules"],
 ["customer-phase1","security/review/firestore-pickup-phase1.rules"],
 ["h3c","firestore.rules"]
];
test("H3C source vulnerabilities reproduced and corrected under actual emulator rules",async()=>{
 for(const [label,file] of files){
  const env=await initializeTestEnvironment({projectId:"demo-pickup-rules",firestore:{host:"127.0.0.1",port:8080,rules:readFileSync(file,"utf8")}});
  try{
   await env.withSecurityRulesDisabled(async ctx=>{
    const d=ctx.firestore();
    for(const [path,value] of Object.entries({
     "shops/a":{owner_id:"merchant",name:"Own",approval_status:"approved",approval_reason:"private",is_active:true},
     "shops/b":{owner_id:"other-merchant",name:"Other",approval_status:"pending",is_active:false},
     "menu_items/a":{shop_id:"a",name:"Meal",price:25},
     "menu_items/b":{shop_id:"b",name:"Other meal",price:30},
     "orders/a":{shop_id:"a",user_id:"customer",rider_id:"rider",delivery_status:"none",status:"pending",total_price:25,subtotal:25,delivery_fee:0,service_fee:0,payment_status:"unpaid",payment_method:"cash"},
     "orders/pool":{shop_id:"b",user_id:"other-customer",rider_id:null,delivery_status:"finding_rider"},
     "users/customer":{name:"Before",role:"customer",admin_roles:[],wallet_balance:0},
     "users/merchant":{uid:"merchant",full_name:"Before",phone:"0",created_at:"2026-01-01"},
     "rider_profiles/rider":{id:"rider",phone:"synthetic",current_latitude:-26,total_earnings:0,verification_status:"pending"},
     "rider_connections/a":{shop_id:"a",rider_id:"rider",status:"active"},
     "chat_messages/a":{order_id:"a",sender_id:"customer",sender_type:"customer",content:"Synthetic"},
     "shop_followers/a":{shop_id:"a",user_id:"customer"},
     "payments/a":{shop_id:"a",amount:25}
    }))await setDoc(doc(d,path),value);
   });
   const db=uid=>env.authenticatedContext(uid).firestore();
   const c=db("customer"),m=db("merchant"),other=db("stranger"),r=db("rider"),guest=env.unauthenticatedContext().firestore(),newUser=db("new-user");
   const old=label==="merchant-legacy",h=label==="h3c";
   const check=(allowed,p)=>allowed?assertSucceeds(p):assertFails(p);
   await check(!h,getDoc(doc(guest,"shops/b")));
   await check(!h,getDoc(doc(guest,"menu_items/b")));
   await assertSucceeds(getDoc(doc(m,"shops/a")));
   await assertSucceeds(getDoc(doc(m,"menu_items/a")));
   await check(!h,getDoc(doc(m,"shops/b")));
   await check(!h,getDoc(doc(c,"menu_items/a")));
   await check(!h,updateDoc(doc(m,"shops/a"),{is_active:false}));
   await check(!h,updateDoc(doc(m,"menu_items/a"),{price:1}));
   await assertFails(updateDoc(doc(other,"menu_items/a"),{price:1}));
   await check(old,setDoc(doc(other,"shops/fake"),{owner_id:"stranger",approval_status:"approved"}));
   await check(old,updateDoc(doc(c,"orders/a"),{status:"collected"}));
   await check(old,updateDoc(doc(c,"orders/a"),{total_price:deleteField()}));
   await check(old,getDoc(doc(other,"orders/pool")));
   await check(old,getDoc(doc(other,"rider_profiles/rider")));
   await assertSucceeds(getDoc(doc(c,"orders/a")));
   await assertSucceeds(getDoc(doc(m,"orders/a")));
   await assertFails(getDoc(doc(other,"orders/a")));
   await check(!h,getDoc(doc(r,"orders/a")));
   await assertFails(getDoc(doc(guest,"orders/a")));
   await assertSucceeds(updateDoc(doc(c,"users/customer"),{name:"After"}));
   await check(old,updateDoc(doc(c,"users/customer"),{role:"admin"}));
   await check(!h,updateDoc(doc(c,"users/customer"),{admin_roles:["super_admin"]}));
   await check(old,updateDoc(doc(c,"users/customer"),{wallet_balance:999}));
   await assertFails(updateDoc(doc(other,"users/customer"),{name:"Wrong"}));
   await check(!h,setDoc(doc(newUser,"users/new-user"),{role:"customer",wallet_balance:999}));
   await check(!h,updateDoc(doc(m,"rider_connections/a"),{status:"paused"}));
   await check(!h,updateDoc(doc(r,"rider_profiles/rider"),{current_latitude:-25}));
   await check(old,setDoc(doc(c,"chat_messages/spoof"),{order_id:"a",shop_id:"a",sender_id:"merchant",sender_type:"shop",content:"Spoof"}));
   await assertSucceeds(getDoc(doc(c,"chat_messages/a")));
   await assertFails(getDoc(doc(other,"chat_messages/a")));
   await assertSucceeds(getDoc(doc(m,"payments/a")));
   await assertFails(getDoc(doc(c,"payments/a")));
   await assertFails(updateDoc(doc(m,"payments/a"),{amount:1}));
   if(h){
    // Positive own-account compatibility, not simply deny everything.
    await assertSucceeds(setDoc(doc(newUser,"users/new-user"),{uid:"new-user",email:"synthetic@example.invalid",full_name:"New merchant",phone:"0",created_at:"2026-01-01",updated_at:"2026-01-01"}));
    await assertSucceeds(updateDoc(doc(m,"users/merchant"),{full_name:"Updated",phone:"123",updated_at:"2026-01-02"}));
    await assertFails(updateDoc(doc(m,"users/merchant"),{uid:"stranger"}));
    await assertFails(updateDoc(doc(c,"users/customer"),{role:deleteField()}));
    await assertFails(updateDoc(doc(c,"users/customer"),{unknown_permission:true}));
    await assertFails(updateDoc(doc(c,"users/customer"),{full_name:{role:"admin"}}));
    await assertFails(getDocs(collection(other,"shops")));
    await assertSucceeds(getDocs(query(collection(m,"shops"),where("owner_id","==","merchant"))));
    await assertSucceeds(getDocs(query(collection(c,"orders"),where("user_id","==","customer"))));
    await assertFails(getDocs(collection(c,"orders")));
    await assertFails(setDoc(doc(c,"chat_messages/new"),{order_id:"a",sender_id:"customer",sender_type:"customer",content:"new"}));
    await assertFails(updateDoc(doc(c,"chat_messages/a"),{is_read:true}));
    await assertFails(setDoc(doc(c,"reviews/new"),{shop_id:"a",rating:5}));
    await assertFails(setDoc(doc(c,"follows/new"),{user_id:"customer",shop_id:"a"}));
    await assertFails(setDoc(doc(c,"user_push_tokens/new"),{user_id:"customer",token:"synthetic"}));
    await assertFails(setDoc(doc(c,"profiles/customer"),{user_id:"customer",role:"admin"}));
    await assertFails(setDoc(doc(r,"rider_locations/rider"),{lat:-26,lng:28}));
    await assertFails(deleteDoc(doc(m,"shops/a")));
    await assertFails(deleteDoc(doc(m,"menu_items/a")));
    await assertFails(setDoc(doc(c,"orders/new"),{shop_id:"a",user_id:"customer"}));
    await assertFails(setDoc(doc(m,"menu_items/new"),{shop_id:"a",price:25}));
    await assertFails(setDoc(doc(r,"rider_profiles/stranger"),{id:"rider"}));
    await assertFails(setDoc(doc(m,"rider_connections/new"),{shop_id:"a",rider_id:"rider"}));
    const persisted=await getDoc(doc(c,"orders/a"));assert.equal(persisted.data().status,"pending");assert.equal(persisted.data().total_price,25);
   }
   console.log("H3C_RULESET_PASS",label);
  }finally{await env.clearFirestore();await env.cleanup();}
 }
});
test("review and root rules identical, named deployment guard stays separate",()=>{
 assert.equal(readFileSync("firestore.rules","utf8"),readFileSync("security/review/firestore-h3c-pickup.rules","utf8"));
});
