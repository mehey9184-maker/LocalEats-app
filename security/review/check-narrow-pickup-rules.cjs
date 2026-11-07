const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,deleteField,collection,query,where,getDocs}=require('firebase/firestore');
const fs=require('node:fs');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Run through the dedicated local emulator config');
const rules=fs.readFileSync(__dirname+'/production-pickup-rules-narrow-REVIEW_ONLY.rules','utf8');
(async()=>{const env=await initializeTestEnvironment({projectId:'demo-localeats-rules-diff',firestore:{host:'127.0.0.1',port:8080,rules}});
try{
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await Promise.all([
  setDoc(doc(db,'shops/shop-a'),{owner_id:'merchant-a',name:'Synthetic shop'}),setDoc(doc(db,'menu_items/menu-a'),{shop_id:'shop-a',price:25}),
  setDoc(doc(db,'rider_profiles/rider-a'),{id:'rider-a',phone:'synthetic'}),
  setDoc(doc(db,'orders/order-a'),{user_id:'customer-a',shop_id:'shop-a',rider_id:null,delivery_status:'finding_rider',total_price:25,status:'pending'}),
  setDoc(doc(db,'orders/order-b'),{user_id:'customer-a',shop_id:'shop-a',rider_id:'rider-a',delivery_status:'rider_assigned',total_price:25}),
  setDoc(doc(db,'shops/42'),{owner_id:'merchant-a',name:'Synthetic numeric shop'}),
  setDoc(doc(db,'orders/no-rider'),{user_id:'customer-a',shop_id:42,delivery_status:'finding_rider',total_price:25,status:'pending'}),
  setDoc(doc(db,'orders/string-shop'),{user_id:'customer-a',shop_id:'42',delivery_status:'none',total_price:25,status:'pending'}),
 ]);});
 const guest=env.unauthenticatedContext().firestore(),owner=env.authenticatedContext('customer-a').firestore(),other=env.authenticatedContext('customer-b').firestore(),merchant=env.authenticatedContext('merchant-a').firestore(),rider=env.authenticatedContext('rider-a').firestore();
 const list=(db,path,field,operator,value)=>getDocs(query(collection(db,path),where(field,operator,value)));
 const checks=[
  ['customer order query including missing rider_id',true,()=>list(owner,'orders','user_id','==','customer-a')],
  ['merchant mixed numeric and string shop query',true,()=>list(merchant,'orders','shop_id','in',[42,'42'])],
  ['assigned rider order query',true,()=>list(rider,'orders','rider_id','==','rider-a')],
  ['stranger pool-only order query',false,()=>list(other,'orders','delivery_status','==','finding_rider')],
  ['stranger rider profiles list',false,()=>getDocs(collection(other,'rider_profiles'))],
  ['stranger rider profiles IN query',false,()=>list(other,'rider_profiles','id','in',['rider-a'])],
  ['stranger gets pool order without rider_id',false,()=>getDoc(doc(other,'orders/no-rider'))],
  ['owner adds missing payment status',false,()=>updateDoc(doc(owner,'orders/order-a'),{payment_status:'paid'})],
  ['public shop read',true,()=>getDoc(doc(guest,'shops/shop-a'))],
  ['public menu read',true,()=>getDoc(doc(guest,'menu_items/menu-a'))],
  ['owner order read',true,()=>getDoc(doc(owner,'orders/order-a'))],
  ['merchant order read',true,()=>getDoc(doc(merchant,'orders/order-a'))],
  ['assigned rider order read',true,()=>getDoc(doc(rider,'orders/order-b'))],
  ['stranger pool order read',false,()=>getDoc(doc(other,'orders/order-a'))],
  ['stranger rider profile read',false,()=>getDoc(doc(other,'rider_profiles/rider-a'))],
  ['rider profile browser read',false,()=>getDoc(doc(rider,'rider_profiles/rider-a'))],
  ['owner removes order price',false,()=>updateDoc(doc(owner,'orders/order-a'),{total_price:deleteField()})],
  ['merchant removes order price',false,()=>updateDoc(doc(merchant,'orders/order-a'),{total_price:deleteField()})],
  ['merchant changes order price',false,()=>updateDoc(doc(merchant,'orders/order-a'),{total_price:1})],
  ['owner removes delivery status',false,()=>updateDoc(doc(owner,'orders/order-a'),{delivery_status:deleteField()})],
  ['merchant removes assigned rider',false,()=>updateDoc(doc(merchant,'orders/order-b'),{rider_id:deleteField()})],
  ['owner forges order',false,()=>setDoc(doc(owner,'orders/fake'),{user_id:'customer-a',total_price:0})],
  ['merchant updates order status with legacy optional fields absent',true,()=>updateDoc(doc(merchant,'orders/order-a'),{status:'preparing'})],
  ['merchant updates own menu',true,()=>updateDoc(doc(merchant,'menu_items/menu-a'),{price:30})],
  ['stranger updates menu',false,()=>updateDoc(doc(other,'menu_items/menu-a'),{price:1})],
 ];
 for(const [label,allowed,op] of checks){await (allowed?assertSucceeds:assertFails)(op());console.log('PASS '+label);}
 console.log(JSON.stringify({passed:checks.length}));
}finally{await env.cleanup();}})().catch(e=>{console.error(e.code??e.message);process.exitCode=1;});
