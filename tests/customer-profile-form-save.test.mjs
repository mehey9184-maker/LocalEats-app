import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createProfileEditSession,editProfileField,profileEditPatch,acceptProfileEditSave} from '../src/lib/customerProfileEditSession.ts';
import {requireProfileEditBasis} from '../src/lib/customerProfileState.ts';
const callbacksFor=path=>{const source=readFileSync(new URL(path,import.meta.url),'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const callbacks=new Map();function visit(n){if(ts.isVariableDeclaration(n)&&['handleUpdateProfile','handleSave','commitProfileChange'].includes(n.name.getText(ast))){callbacks.set(n.name.getText(ast),n.initializer.getText(ast));}ts.forEachChild(n,visit);}visit(ast);return callbacks;};
const profileCallbacks=callbacksFor('../src/App.tsx');
const completeCallbacks=callbacksFor('../src/screens/auth/CompleteProfileScreen.tsx');
const emit=code=>ts.transpileModule(`return (${code});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:'form.ts'}).outputText;
function harness({address='',basisMissing=false,save,handler=true,complete=false,pristine=false}={}){
 const callbacks=complete?completeCallbacks:profileCallbacks;
 const actor={uid:'A',isAnonymous:false,getIdToken:async()=>''};const basis={identity:actor,revision:'2026-11-06T18:00:00.123456+00:00'};
 const profile={id:'A',fullName:'Original',phone:'0712345678',email:'a@example.invalid',city:'Johannesburg',address,country:'South Africa',role:'user'};
 let draft=createProfileEditSession(profile,basisMissing?null:basis);if(!pristine)draft=editProfileField(draft,'fullName',' Updated ');const calls=[],notices=[];let saved=false,navigated=0;
 const onSave=async(patch,context)=>{calls.push({patch,context});return save?save(patch,context):{profile:{...profile,...patch,fullName:String(patch.fullName||profile.fullName).trim()},basis:{identity:actor,revision:'2026-11-06T18:00:01.123456+00:00'}};};
 const deps={auth:{currentUser:actor},profileDraft:draft,profileEditorMounted:{current:true},isSaving:false,uploading:false,isOnline:true,
  ...draft.values,userProfile:profile,profileBasis:{...basis,revision:'2026-11-06T18:00:09.123456+00:00'},
  onSave:handler?onSave:undefined,onUpdateProfile:undefined,onSaved:()=>{},onBack:()=>navigated++,profileEditPatch,acceptProfileEditSave,requireProfileEditBasis,
  formatSAPhone:v=>v,validateSAPhone:()=>true,setIsSaving:()=>{},setJustSaved:v=>{saved=v;},triggerHaptic:()=>{},setNotification:n=>notices.push(n),setTimeout:()=>{},
  setProfileDraft:update=>{draft=typeof update==='function'?update(draft):update;},console:{error:()=>{}},
  commitProfileChange:undefined,
 };
 assert.ok(callbacks.has('commitProfileChange'));deps.commitProfileChange=new Function(...Object.keys(deps),emit(callbacks.get('commitProfileChange')))(...Object.values(deps));
 const run=new Function(...Object.keys(deps),emit(callbacks.get(complete?'handleSave':'handleUpdateProfile')))(...Object.values(deps));
 return{run,auth:deps.auth,basis,calls,notices,get draft(){return draft;},get saved(){return saved;},get navigated(){return navigated;}};
}
test('pickup Profile saves without a required address and sends the original edit revision',async()=>{
 const h=harness();await h.run();assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].patch,{fullName:'Updated'});assert.equal(h.calls[0].context,h.basis);assert.equal(h.saved,true);
});
test('a form with no verified edit basis cannot initiate a save',async()=>{
 const h=harness({address:'Optional address',basisMissing:true});await h.run();assert.equal(h.calls.length,0);assert.equal(h.saved,false);
});
test('missing save callbacks cannot produce saved feedback',async()=>{
 const h=harness({address:'Optional address',handler:false});await h.run();assert.equal(h.saved,false);assert.ok(h.notices.some(n=>n.type==='error'));
});
test('failed saves preserve form values and never navigate or emit success',async()=>{
 const h=harness({address:'Optional address',save:async()=>{throw Error('Unconfirmed');}});await h.run();
 assert.equal(h.draft.values.fullName,' Updated ');assert.equal(h.saved,false);assert.equal(h.navigated,0);assert.ok(h.notices.some(n=>n.type==='error'));
});

for(const complete of [false,true]) {
 test(`${complete?'Complete':'Edit'} Profile sends its original revision and waits for an owner receipt`,async()=>{
  const h=harness({complete});await h.run();assert.equal(h.calls.length,1);assert.equal(h.calls[0].context,h.basis);assert.equal(h.navigated,1);
 });
 test(`${complete?'Complete':'Edit'} Profile rejects missing basis and foreign save receipts`,async()=>{
  const missing=harness({complete,basisMissing:true});await missing.run();assert.equal(missing.calls.length,0);assert.equal(missing.navigated,0);
  const foreign=harness({complete,save:async()=>({profile:{id:'B'},basis:{identity:{uid:'B'},revision:'bad'}})});await foreign.run();assert.equal(foreign.navigated,0);assert.equal(foreign.draft.values.fullName,' Updated ');
 });
 test(`${complete?'Complete':'Edit'} Profile ignores completion after account change`,async()=>{
  let resolve;const h=harness({complete,save:()=>new Promise(r=>resolve=r)});const saving=h.run();h.auth.currentUser={uid:'B',isAnonymous:false};resolve({profile:{id:'A'},basis:h.basis});await saving;assert.equal(h.navigated,0);assert.equal(h.saved,false);
 });
}

test('pristine Complete Profile continues without a request or fabricated saved feedback',async()=>{
 const h=harness({complete:true,pristine:true});await h.run();assert.deepEqual(h.calls,[]);assert.equal(h.navigated,1);assert.equal(h.notices.some(n=>n.type==='success'),false);
});
test('pristine Complete Profile cannot continue with missing or replaced account verification',async()=>{
 const missing=harness({complete:true,pristine:true,basisMissing:true});await missing.run();assert.equal(missing.navigated,0);
 const changed=harness({complete:true,pristine:true});changed.auth.currentUser={uid:'A',isAnonymous:false};await changed.run();assert.equal(changed.navigated,0);assert.deepEqual(changed.calls,[]);
});
