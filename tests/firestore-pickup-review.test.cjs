const {test}=require("node:test");
const {readFileSync}=require("node:fs");
const assert=require("node:assert/strict");
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing");
const {doc,getDoc,setDoc,updateDoc,deleteDoc,deleteField}=require("firebase/firestore");

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


test("deployable root rules are deny-by-default, not the old public read/write file",()=>{
 const root=readFileSync("firestore.rules","utf8");
 const candidate=readFileSync("security/review/firestore-pickup-phase1.rules","utf8");
 assert.equal(root,candidate,"Root firebase.json MUST deploy the isolated pickup-reviewed rules, not permissive legacy rules.");
 assert.match(root,/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
 assert.match(root,/match \/orders\/\{orderId} \{[\s\S]*?allow create: if false;[\s\S]*?allow update: if false;[\s\S]*?allow delete: if false;/);
 assert.match(root,/match \/payments\/\{paymentId} \{[\s\S]*?allow write: if false;/);
 const bad=[...root.matchAll(/allow\s+(?:read,\s*write|write|create|update|delete)\s*:\s*if\s+true\s*;/g)];
 assert.equal(bad.length,0,"No unconditional private writes in deployment rules.");
 assert.match(readFileSync("firebase.json","utf8"),/"rules":\s*"firestore.rules"/);
});


test("L2C: reviewed and deployable rules enforce sender identity, shop authority and rider ownership",async()=>{
 for(const file of ["firestore.rules","security/review/firestore-pickup-phase1.rules"]){
  const env=await initializeTestEnvironment({
    projectId:"demo-pickup-rules",
    firestore:{host:"127.0.0.1",port:8080,rules:readFileSync(file,"utf8")}
  });
  try{
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await Promise.all([
        setDoc(doc(db,"shops/shop"),{owner_id:"merchant",name:"My synthetic shop",approval_status:"approved"}),
        setDoc(doc(db,"orders/order"),{user_id:"customer",shop_id:"shop",rider_id:"rider",delivery_status:"none",status:"pending"}),
        setDoc(doc(db,"rider_profiles/rider"),{id:"rider",total_earnings:0,verification_status:"pending"}),
        setDoc(doc(db,"shop_followers/follower"),{user_id:"customer",shop_id:"shop"})
      ]);
    });
    const customer=env.authenticatedContext("customer").firestore();
    const merchant=env.authenticatedContext("merchant").firestore();
    const rider=env.authenticatedContext("rider").firestore();
    const stranger=env.authenticatedContext("stranger").firestore();
    await assertSucceeds(updateDoc(doc(merchant,"shops/shop"),{name:"Updated my shop"}));
    await assertFails(setDoc(doc(customer,"shops/fake-shop"),{owner_id:"customer",approval_status:"approved"}));
    await assertFails(updateDoc(doc(merchant,"shops/shop"),{owner_id:"stranger"}));
    await assertFails(updateDoc(doc(merchant,"shops/shop"),{owner_id:deleteField()}));
    await assertFails(updateDoc(doc(merchant,"shops/shop"),{approval_status:"pending"}));
    await assertFails(updateDoc(doc(merchant,"shops/shop"),{archived_at:"2099-01-01"}));
    await assertFails(deleteDoc(doc(merchant,"shops/shop")));
    await assertFails(getDoc(doc(stranger,"rider_profiles/rider")));
    await assertSucceeds(getDoc(doc(rider,"rider_profiles/rider")));
    await assertFails(setDoc(doc(rider,"rider_profiles/another-rider"),{id:"rider"}));
    await assertFails(updateDoc(doc(rider,"rider_profiles/rider"),{id:deleteField()}));
    await assertFails(updateDoc(doc(rider,"rider_profiles/rider"),{verification_status:"approved"}));
    await assertFails(updateDoc(doc(customer,"shop_followers/follower"),{shop_id:"fake"}));
    await assertFails(updateDoc(doc(customer,"shop_followers/follower"),{user_id:"stranger"}));

    await assertSucceeds(setDoc(doc(merchant,"chat_messages/merchant-msg"),{
       order_id:"order",shop_id:"shop",sender_id:"shop",sender_type:"shop",content:"Ready!"
    }));
    await assertSucceeds(setDoc(doc(customer,"chat_messages/customer-msg"),{
       order_id:"order",shop_id:"shop",sender_id:"customer",sender_type:"customer",content:"Thank you"
    }));
    await assertFails(setDoc(doc(customer,"chat_messages/impersonate-shop"),{
       order_id:"order",shop_id:"shop",sender_id:"shop",sender_type:"shop",content:"Fake!"
    }));
    await assertFails(setDoc(doc(customer,"chat_messages/impersonate-user"),{
       order_id:"order",shop_id:"shop",sender_id:"merchant",sender_type:"customer",content:"Fake!"
    }));
    await assertFails(setDoc(doc(stranger,"chat_messages/not-a-participant"),{
       order_id:"order",shop_id:"shop",sender_id:"stranger",sender_type:"customer",content:"Fake!"
    }));
    await assertFails(getDoc(doc(stranger,"chat_messages/customer-msg")));
    await assertSucceeds(getDoc(doc(customer,"chat_messages/merchant-msg")));
    await assertFails(updateDoc(doc(customer,"chat_messages/merchant-msg"),{content:"Changed"}));
    await assertFails(updateDoc(doc(customer,"chat_messages/merchant-msg"),{sender_id:deleteField()}));
    await assertSucceeds(updateDoc(doc(customer,"chat_messages/merchant-msg"),{is_read:true}));
  }finally{
    await env.clearFirestore();
    await env.cleanup();
  }
 }
});


test("L2C: signed-in users cannot mint admin roles, wallet credit or approved rider profiles",async()=>{
 for(const file of ["firestore.rules","security/review/firestore-pickup-phase1.rules"]){
  const env=await initializeTestEnvironment({
   projectId:"demo-pickup-rules",
   firestore:{host:"127.0.0.1",port:8080,rules:readFileSync(file,"utf8")}
  });
  try{
   await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),"users/customer"),{name:"Before",role:"customer",is_admin:false});
   });
   const customer=env.authenticatedContext("customer").firestore();
   const stranger=env.authenticatedContext("stranger").firestore();
   const newUser=env.authenticatedContext("new-user").firestore();
   const rider=env.authenticatedContext("new-rider").firestore();
   await assertSucceeds(updateDoc(doc(customer,"users/customer"),{name:"After"}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{role:"admin"}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{role:deleteField()}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{is_admin:true}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{is_admin:deleteField()}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{shop_id:"shop"}));
   await assertFails(updateDoc(doc(customer,"users/customer"),{wallet_balance:100000}));
   await assertFails(updateDoc(doc(stranger,"users/customer"),{name:"Hacked"}));
   await assertFails(setDoc(doc(newUser,"users/new-user"),{role:"admin",is_admin:true}));
   await assertFails(setDoc(doc(newUser,"users/new-user"),{role:"merchant",is_vendor:true}));
   await assertSucceeds(setDoc(doc(newUser,"users/new-user"),{role:"customer",name:"Legit"}));
   await assertFails(setDoc(doc(rider,"rider_profiles/new-rider"),{id:"new-rider",verification_status:"approved",total_earnings:100}));
   await assertSucceeds(setDoc(doc(rider,"rider_profiles/new-rider"),{id:"new-rider",verification_status:"pending",total_earnings:0,full_name:"Test only"}));
  }finally{await env.clearFirestore();await env.cleanup();}
 }
});
