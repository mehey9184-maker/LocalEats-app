const {readFileSync} = require('node:fs');
const {initializeTestEnvironment, assertSucceeds, assertFails} = require('@firebase/rules-unit-testing');
const {doc, getDoc, setDoc, updateDoc} = require('firebase/firestore');


async function check(label, rules) {
 const env=await initializeTestEnvironment({projectId:'demo-pickup-rules',firestore:{host:'127.0.0.1',port:8080,rules}});
 try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   for(const [path,data] of [
    ['users/a',{role:'customer'}], ['profiles/a',{role:'customer'}],
    ['user_push_tokens/a-test',{user_id:'a'}], ['shops/fixture',{owner_id:'merchant'}],
    ['orders/fixture',{user_id:'a',shop_id:'fixture',status:'pending'}]
   ]) await setDoc(doc(db,path),data);
  });
  const a=env.authenticatedContext('a').firestore();
  const b=env.authenticatedContext('b').firestore();
  const anon=env.unauthenticatedContext().firestore();
  const guest=env.authenticatedContext('guest',{firebase:{sign_in_provider:'anonymous'}}).firestore();
  for(const path of ['users/a','profiles/a','user_push_tokens/a-test','orders/fixture']){
   await assertFails(getDoc(doc(anon,path)));
   await assertFails(getDoc(doc(b,path)));
   await assertFails(updateDoc(doc(b,path),{role:'admin'}));
  }
  await assertSucceeds(getDoc(doc(a,'users/a')));
  await assertFails(getDoc(doc(a,'profiles/a')));
  await assertFails(getDoc(doc(a,'user_push_tokens/a-test')));
  await assertFails(setDoc(doc(a,'user_push_tokens/a-new'),{user_id:'a'}));
  await assertSucceeds(updateDoc(doc(a,'users/a'),{role:'admin'}));
  await assertSucceeds(setDoc(doc(guest,'users/guest'),{role:'admin'}));
  await assertSucceeds(updateDoc(doc(a,'orders/fixture'),{status:'collected'}));
  console.log(JSON.stringify({label,crossAccountAndUnauthenticatedDenials:12,ownerTokenDenied:true,ownerProfileRoleWriteAllowed:true,anonymousAuthOwnRoleWriteAllowed:true,ownerOrderStatusWriteAllowed:true}));
 } finally {await env.cleanup();}
}
async function main(){
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw Error('Requires isolated emulator');
 const live=readFileSync(__dirname+'/firestore-deployed-baseline.rules','utf8');
 const draft=readFileSync(__dirname+'/production-pickup-rules-narrow-REVIEW_ONLY.rules','utf8');
 await check('verified live source',live);
 await check('draft candidate',draft);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
