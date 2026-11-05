import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {initializeTestEnvironment,assertFails,assertSucceeds} from "@firebase/rules-unit-testing";
import {collection,doc,getDoc,getDocs,query,where,setDoc,updateDoc,deleteDoc} from "firebase/firestore";

test("review candidate keeps real pickup reads and denies unauthorized writes",async t=>{
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||"",/^(127\.0\.0\.1|localhost):8080$/);
  assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST||"",/^(127\.0\.0\.1|localhost):9099$/);
  const projectId="demo-localeats-p0";
  assert.match(projectId,/^demo-/);
  const env=await initializeTestEnvironment({
    projectId,firestore:{host:"127.0.0.1",port:8080,
      rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")},
  });
  const id=randomUUID().replace(/-/g,"");
  const alice="fake-alice-"+id,bob="fake-bob-"+id,merchant="fake-merchant-"+id;
  const shopId="shop-"+id,orderId="order-"+id,otherOrder="order-b-"+id;
  try{
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await setDoc(doc(db,"shops",shopId),{name:"Mock Kota",owner_id:merchant,approval_status:"approved"});
      await setDoc(doc(db,"menu_items","item-"+id),{shop_id:shopId,name:"Mock Item",price:25});
      await setDoc(doc(db,"shops",shopId,"menu","embedded-"+id),{name:"Mock Embedded Item",price:25});
      await setDoc(doc(db,"shops",shopId,"private","internal"),{secret:"demo"});
      await setDoc(doc(db,"profiles",alice),{user_id:alice,fullName:"Alice"});
      await setDoc(doc(db,"profiles",bob),{user_id:bob,fullName:"Bob"});
      await setDoc(doc(db,"orders",orderId),{user_id:alice,shop_id:shopId,delivery_type:"collection",total_price:25,status:"pending"});
      await setDoc(doc(db,"orders",otherOrder),{user_id:bob,shop_id:"another-shop",delivery_type:"collection",total_price:25});
      await setDoc(doc(db,"reviews","review-"+id),{shop_id:shopId,rating:5});
    });
    const anon=env.unauthenticatedContext().firestore();
    const a=env.authenticatedContext(alice).firestore();
    const b=env.authenticatedContext(bob).firestore();
    const m=env.authenticatedContext(merchant).firestore();
    await t.test("public shop and menu browsing stays available",async()=>{
      await assertSucceeds(getDocs(collection(anon,"shops")));
      await assertSucceeds(getDoc(doc(anon,"shops",shopId)));
      await assertSucceeds(getDocs(collection(anon,"menu_items")));
      await assertSucceeds(getDocs(collection(anon,"shops",shopId,"menu")));
      await assertSucceeds(getDocs(query(collection(anon,"reviews"),where("shop_id","==",shopId))));
      await assertFails(getDoc(doc(anon,"shops",shopId,"private","internal")));
    });
    await t.test("customer can read only their own profile and pickup history",async()=>{
      await assertSucceeds(getDoc(doc(a,"profiles",alice)));
      await assertFails(getDoc(doc(a,"profiles",bob)));
      await assertFails(getDoc(doc(anon,"profiles",alice)));
      await assertFails(getDocs(collection(a,"profiles")));
      await assertSucceeds(getDoc(doc(a,"orders",orderId)));
      await assertSucceeds(getDocs(query(collection(a,"orders"),where("user_id","==",alice))));
      await assertFails(getDoc(doc(b,"orders",orderId)));
      await assertFails(getDoc(doc(anon,"orders",orderId)));
      await assertFails(getDocs(collection(a,"orders")));
    });
    await t.test("API-verified shop owner may view order but cannot forge financial changes",async()=>{
      await assertSucceeds(getDoc(doc(m,"orders",orderId)));
      // Important Merchant compatibility: shop-scoped list must be authorized,
      // while unbounded cross-shop scans must remain denied.
      await assertSucceeds(getDocs(query(collection(m,"orders"),where("shop_id","==",shopId))));
      await assertFails(getDocs(collection(m,"orders")));
      await assertFails(getDoc(doc(m,"orders",otherOrder)));
      await assertFails(updateDoc(doc(m,"orders",orderId),{payment_status:"paid"}));
      await assertFails(updateDoc(doc(a,"orders",orderId),{total_price:1}));
      await assertFails(setDoc(doc(a,"orders","forged-"+id),{user_id:alice,shop_id:shopId,total_price:1}));
      await assertFails(deleteDoc(doc(m,"orders",orderId)));
    });
    await t.test("shop/menu and private support/rider records are API-only",async()=>{
      await assertFails(setDoc(doc(m,"shops",shopId),{owner_id:merchant,name:"Changed"}));
      await assertFails(updateDoc(doc(m,"menu_items","item-"+id),{price:1}));
      await assertFails(setDoc(doc(a,"reviews","fake-"+id),{shop_id:shopId,rating:5}));
      await assertFails(setDoc(doc(anon,"contact_messages","msg-"+id),{content:"Fake"}));
      await assertFails(setDoc(doc(a,"rider_locations","loc-"+id),{latitude:0,longitude:0}));
      await assertFails(getDocs(collection(a,"promo_codes")));
    });
    await t.test("follow records are owner-scoped; push tokens are private",async()=>{
      const followId=alice+"_"+shopId;
      await assertSucceeds(setDoc(doc(a,"follows",followId),{user_id:alice,shop_id:shopId,created_at:"demo"}));
      await assertSucceeds(getDocs(query(collection(a,"follows"),where("user_id","==",alice))));
      await assertFails(getDoc(doc(b,"follows",followId)));
      await assertFails(setDoc(doc(b,"follows",alice+"_wrong"),{user_id:alice,shop_id:"wrong",created_at:"demo"}));
      await assertSucceeds(deleteDoc(doc(a,"follows",followId)));
      const tokenId=alice+"_1234567890";
      await assertSucceeds(setDoc(doc(a,"user_push_tokens",tokenId),{user_id:alice,token:"fake-token-1",last_updated:"demo"}));
      await assertSucceeds(updateDoc(doc(a,"user_push_tokens",tokenId),{token:"fake-token-2"}));
      await assertFails(getDoc(doc(b,"user_push_tokens",tokenId)));
      await assertFails(setDoc(doc(b,"user_push_tokens",alice+"_123"),{user_id:alice,token:"forged",last_updated:"demo"}));
    });
  }finally{
    await env.cleanup();
  }
});
