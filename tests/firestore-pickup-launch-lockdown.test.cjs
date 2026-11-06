const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {initializeTestEnvironment,assertFails,assertSucceeds}=require("@firebase/rules-unit-testing");
const {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc,query,where}=require("firebase/firestore");

// Run only through the Firebase Firestore emulator, with a demo-* project.
// The shared live Firebase project and named Firestore database are not used.
test("pickup-only review rules isolate accounts and deny browser mutation",async()=>{
  const env=await initializeTestEnvironment({
    projectId:"demo-pickup-lockdown",
    firestore:{host:"127.0.0.1",port:8080,
      rules:readFileSync("security/review/firestore-pickup-launch-candidate_REVIEW_ONLY.rules","utf8")}
  });
  try {
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore();
      await Promise.all([
        setDoc(doc(db,"shops/shop-a"),{owner_id:"merchant-a",name:"Demo shop"}),
        setDoc(doc(db,"menu_items/item-a"),{shop_id:"shop-a",name:"Demo meal",price:25}),
        setDoc(doc(db,"profiles/customer-a"),{user_id:"customer-a",role:"customer",phone:"synthetic"}),
        setDoc(doc(db,"users/customer-a"),{role:"customer",name:"Demo customer"}),
        setDoc(doc(db,"orders/order-a"),{user_id:"customer-a",shop_id:"shop-a",status:"pending",total_price:25}),
        setDoc(doc(db,"orders/order-b"),{user_id:"customer-b",shop_id:"shop-b",status:"pending",total_price:75}),
        setDoc(doc(db,"rider_locations/rider-a"),{rider_id:"rider-a",latitude:-26}),
        setDoc(doc(db,"user_push_tokens/token-a"),{user_id:"customer-a",token:"synthetic-token"}),
        setDoc(doc(db,"chat_messages/message-a"),{order_id:"order-a",content:"synthetic"}),
        setDoc(doc(db,"reviews/review-a"),{shop_id:"shop-a",rating:5}),
      ]);
    });
    const guest=env.unauthenticatedContext().firestore();
    const customer=env.authenticatedContext("customer-a").firestore();
    const stranger=env.authenticatedContext("customer-b").firestore();
    const merchant=env.authenticatedContext("merchant-a").firestore();

    // Anonymous browsing works for public catalog, not account/private data.
    await assertSucceeds(getDoc(doc(guest,"shops/shop-a")));
    await assertSucceeds(getDoc(doc(guest,"menu_items/item-a")));
    await assertSucceeds(getDoc(doc(guest,"reviews/review-a")));
    await assertFails(getDoc(doc(guest,"profiles/customer-a")));
    await assertFails(getDoc(doc(guest,"orders/order-a")));
    await assertFails(getDoc(doc(guest,"user_push_tokens/token-a")));

    // Account A sees its own saved profile/order, but B cannot read or change it.
    await assertSucceeds(getDoc(doc(customer,"profiles/customer-a")));
    await assertSucceeds(getDoc(doc(customer,"users/customer-a")));
    await assertSucceeds(getDoc(doc(customer,"orders/order-a")));
    await assertSucceeds(getDoc(doc(merchant,"orders/order-a")));
    await assertFails(getDoc(doc(stranger,"profiles/customer-a")));
    await assertFails(getDoc(doc(stranger,"users/customer-a")));
    await assertFails(getDoc(doc(stranger,"orders/order-a")));
    await assertFails(getDoc(doc(customer,"orders/order-b")));

    // Rules are not filters: broad private collection queries must be denied.
    await assertFails(getDocs(collection(customer,"profiles")));
    await assertFails(getDocs(collection(customer,"orders")));
    await assertSucceeds(getDocs(query(collection(customer,"orders"),where("user_id","==","customer-a"))));

    // The browser cannot self-grant a role, forge a receipt or edit order facts.
    await assertFails(setDoc(doc(customer,"profiles/customer-a"),{role:"admin"}));
    await assertFails(updateDoc(doc(customer,"users/customer-a"),{role:"merchant"}));
    await assertFails(setDoc(doc(customer,"orders/forged"),{user_id:"customer-a",total_price:0}));
    await assertFails(updateDoc(doc(customer,"orders/order-a"),{status:"collected"}));
    await assertFails(updateDoc(doc(merchant,"orders/order-a"),{status:"ready"}));
    await assertFails(updateDoc(doc(customer,"orders/order-a"),{total_price:0}));
    await assertFails(setDoc(doc(merchant,"shops/new"),{owner_id:"merchant-a"}));
    await assertFails(updateDoc(doc(merchant,"menu_items/item-a"),{price:0}));

    // Dormant rider, push-token and chat access are not public.
    await assertFails(getDoc(doc(customer,"rider_locations/rider-a")));
    await assertFails(getDoc(doc(merchant,"rider_locations/rider-a")));
    await assertFails(setDoc(doc(customer,"rider_locations/rider-a"),{latitude:0}));
    await assertFails(getDoc(doc(stranger,"user_push_tokens/token-a")));
    await assertFails(setDoc(doc(customer,"user_push_tokens/token-b"),{user_id:"customer-a"}));
    await assertFails(getDoc(doc(customer,"chat_messages/message-a")));
    await assertFails(setDoc(doc(customer,"chat_messages/message-b"),{order_id:"order-a"}));
    await assertFails(setDoc(doc(guest,"reviews/new"),{rating:5}));

    // Preserves a narrow Customer follows feature, but never cross-account.
    await assertSucceeds(setDoc(doc(customer,"follows/customer-a_shop-a"),{
      user_id:"customer-a",shop_id:"shop-a",created_at:"synthetic"
    }));
    await assertSucceeds(getDoc(doc(customer,"follows/customer-a_shop-a")));
    await assertFails(getDoc(doc(stranger,"follows/customer-a_shop-a")));
    await assertFails(setDoc(doc(stranger,"follows/customer-a_shop-a"),{
      user_id:"customer-a",shop_id:"shop-a"
    }));
    await assertFails(setDoc(doc(customer,"follows/forged-id"),{
      user_id:"customer-b",shop_id:"shop-a"
    }));
    await assertFails(updateDoc(doc(customer,"follows/customer-a_shop-a"),{shop_id:"shop-b"}));
    await assertFails(deleteDoc(doc(stranger,"follows/customer-a_shop-a")));
    await assertSucceeds(deleteDoc(doc(customer,"follows/customer-a_shop-a")));

    assert.ok(true,"all supported and prohibited operations checked");
  } finally {
    await env.clearFirestore();
    await env.cleanup();
  }
});
