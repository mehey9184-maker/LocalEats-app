import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const src=readFileSync(new URL('../src/screens/auth/SetupPasswordScreen.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('signup.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='handleSignUp')callback=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
const code=ts.transpileModule(`return (${callback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:'callback.ts'}).outputText;
function harness({existing=false,fail=false,change=false,loading=false}={}){
 const actor={uid:'A',isAnonymous:false},auth={currentUser:actor},writes=[],notices=[],recovered=[];let next=0,creates=0;
 const deps={auth,loading,signupInFlight:{current:false},password:'synthetic123',confirmPassword:'synthetic123',signupData:{email:'a@example.invalid',fullName:'Customer',phone:'0712345678'},APP_URL:'https://example.invalid',
  supabase:{auth:{signUp:async()=>{creates++;return{data:{user:{id:'A'},firebaseUser:actor},error:null};}}},
  customerProfileApi:{read:async()=>{if(change)auth.currentUser={...actor};return{profile:existing?{user_id:'A'}:null,revision:existing?'saved':null};},save:async(uid,patch,revision)=>{writes.push({uid,patch,revision});if(fail)throw Error('Unavailable');return{profile:{user_id:uid},revision:'confirmed'};}},
  onProfileIncomplete:d=>recovered.push(d),setLoading:()=>{},setNotification:n=>notices.push(n),onNext:()=>next++};
 return{run:new Function(...Object.keys(deps),code)(...Object.values(deps)),writes,notices,recovered,get next(){return next;},get creates(){return creates;}};
}
test('registration creates only name/phone through the central API with an absent-row precondition',async()=>{
 const h=harness();await h.run();assert.deepEqual(h.writes,[{uid:'A',patch:{fullName:'Customer',phone:'0712345678'},revision:null}]);assert.equal(h.next,1);assert.doesNotMatch(src,/upsertProfileWithRPC/);
});
test('registration cannot overwrite an existing profile with signup defaults',async()=>{const h=harness({existing:true});await h.run();assert.deepEqual(h.writes,[]);assert.equal(h.next,1);});
test('failed profile persistence reports account-created recovery instead of attempting registration again',async()=>{const h=harness({fail:true});await h.run();assert.equal(h.creates,1);assert.equal(h.next,0);assert.equal(h.recovered[0].phone,"0712345678");assert.match(h.notices[0].message,/account was created.*not confirmed/);assert.equal(h.notices[0].type,'error');});
test('same-UID identity replacement during registration cannot write or navigate',async()=>{const h=harness({change:true});await h.run();assert.deepEqual(h.writes,[]);assert.equal(h.next,0);});
test('a rendered pending registration cannot start another account creation',async()=>{const h=harness({loading:true});await h.run();assert.equal(h.creates,0);});

test("rapid duplicate registration calls share the in-flight guard",async()=>{const h=harness();await Promise.all([h.run(),h.run()]);assert.equal(h.creates,1);assert.equal(h.writes.length,1);});
