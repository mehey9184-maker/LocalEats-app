import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCustomerProfileState,applyProfileMetadata,beginProfileRead,acceptProfileRead,failProfileRead,acceptProfileSave,requireProfileEditBasis} from '../src/lib/customerProfileState.ts';
const empty=()=>({fullName:'',email:'',phone:'',city:'Johannesburg',address:'',country:'South Africa',role:'user'});
const actor=uid=>({uid,isAnonymous:false,email:uid+'@example.invalid',getIdToken:async()=> 'synthetic'});
const revision='2026-11-06T18:00:00.123456+00:00';
const saved=(uid='A',name='Backend')=>({profile:{user_id:uid,fullName:name,address:'Backend address',updated_at:revision},revision});
const loaded=(user=actor('A'))=>{const loading=beginProfileRead(initialCustomerProfileState(empty()),user,1,empty());return{user,state:acceptProfileRead(loading,user,1,saved(user.uid),empty())};};

test('metadata may seed the current account before a verified read without granting privilege',()=>{
 const user=actor('A');const state=applyProfileMetadata(initialCustomerProfileState(empty()),{...empty(),id:'A',fullName:'Metadata',role:'admin',is_admin:true},user);
 assert.equal(state.profile.fullName,'Metadata');assert.equal(state.profile.role,'user');assert.equal(state.profile.is_admin,false);assert.equal(state.basis,null);
});
test('late same-account metadata cannot replace a backend-confirmed profile or its revision',()=>{
 const {state,user}=loaded();const next=applyProfileMetadata(state,{...empty(),id:'A',fullName:'Old login'},user);
 assert.equal(next,state);assert.equal(next.profile.fullName,'Backend');assert.equal(next.basis.revision,revision);
});
test('functional metadata updates cannot overwrite a confirmed profile either',()=>{
 const {state,user}=loaded();assert.equal(applyProfileMetadata(state,p=>({...p,fullName:'Stale'}),user),state);
});
test('account switching clears the old profile and edit basis before the new read',()=>{
 const {state}=loaded();const b=actor('B');const next=beginProfileRead(state,b,2,empty());
 assert.equal(next.profile.id,'B');assert.equal(next.profile.fullName,'B');assert.equal(next.profile.address,'');assert.equal(next.basis,null);assert.equal(next.status,'loading');
});
test('same UID with a new Firebase identity cannot reuse an earlier edit basis',()=>{
 const {state}=loaded();const relogged=actor('A');assert.throws(()=>requireProfileEditBasis(state.basis,relogged));
 assert.equal(beginProfileRead(state,relogged,2,empty()).basis,null);
});
test('obsolete or foreign read receipts cannot replace the latest account state',()=>{
 const {state,user}=loaded();const b=actor('B');const next=beginProfileRead(state,b,2,empty());
 assert.equal(acceptProfileRead(next,user,1,saved(),empty()),next);
 assert.equal(acceptProfileRead(next,b,1,saved('B'),empty()),next);
 assert.throws(()=>acceptProfileRead(next,b,2,saved('A'),empty()));
});
test('a verified absent profile has an explicit create basis and uses only Firebase facts',()=>{
 const user=actor('A');const state=acceptProfileRead(beginProfileRead(initialCustomerProfileState(empty()),user,1,empty()),user,1,{profile:null,revision:null},empty());
 assert.equal(state.basis.revision,null);assert.equal(state.profile.fullName,'A');assert.equal(state.profile.address,'');assert.equal(state.status,'ready');
 assert.equal(requireProfileEditBasis(state.basis,user),state.basis);
});
test('read failures retain confirmed details and the original revision, with a visible error state',()=>{
 const {state,user}=loaded();const loading=beginProfileRead(state,user,2,empty());const failed=failProfileRead(loading,user,2);
 assert.equal(failed.profile.fullName,'Backend');assert.equal(failed.basis.revision,revision);assert.equal(failed.status,'error');
 assert.equal(failProfileRead(failed,actor('B'),3),failed);
});
test('logout clears profile and basis; a restored plain cache cannot supply an edit basis',()=>{
 const {state,user}=loaded();const reset=applyProfileMetadata(state,empty(),null);assert.equal(reset.basis,null);assert.equal(reset.profile.address,'');
 assert.throws(()=>requireProfileEditBasis(null,user));assert.throws(()=>requireProfileEditBasis({revision},user));
});
test('a confirmed save carries only server fields and makes earlier reads obsolete',()=>{
 const {state,user}=loaded();const current=acceptProfileSave(state,user,2,saved('A','Server trimmed'),empty());
 assert.equal(current.profile.fullName,'Server trimmed');assert.equal(current.basis.revision,revision);assert.equal(current.request,2);
 assert.equal(acceptProfileRead(current,user,1,saved('A','Old'),empty()),current);
});
test('read/save/metadata reducers are pure under repeated evaluation',()=>{
 const {state,user}=loaded();const original=structuredClone({...state,basis:null,owner:null});
 const a=acceptProfileSave(state,user,2,saved('A','Saved'),empty());const b=acceptProfileSave(state,user,2,saved('A','Saved'),empty());
 assert.deepEqual(a,b);assert.deepEqual({...state,basis:null,owner:null},original);assert.equal(state.profile.fullName,'Backend');
});

test('an older save receipt cannot roll back a newer verified read at microsecond precision',()=>{
 const {state,user}=loaded();const newerRevision='2026-11-06T18:00:00.123457+00:00';
 const newer=acceptProfileRead(beginProfileRead(state,user,2,empty()),user,2,{profile:{...saved().profile,fullName:'Newer',updated_at:newerRevision},revision:newerRevision},empty());
 const late=acceptProfileSave(newer,user,3,saved('A','Older write'),empty());
 assert.equal(late.profile.fullName,'Newer');assert.equal(late.basis.revision,newerRevision);
});
test('a read with an older server revision cannot roll back a confirmed save',()=>{
 const {state,user}=loaded();const newerRevision='2026-11-06T18:00:01.123457+00:00';
 const newer=acceptProfileSave(state,user,2,{profile:{...saved().profile,fullName:'Newer',updated_at:newerRevision},revision:newerRevision},empty());
 const late=acceptProfileRead(beginProfileRead(newer,user,3,empty()),user,3,saved('A','Stale read'),empty());
 assert.equal(late.profile.fullName,'Newer');assert.equal(late.basis.revision,newerRevision);
});

test('an older backend revision cannot replace favorites independently of profile details',()=>{
 const {state,user}=loaded();const currentRevision='2026-11-06T18:00:01.123456+00:00';
 const current=acceptProfileRead(beginProfileRead(state,user,2,empty()),user,2,{profile:{...saved().profile,fullName:'Current',favorites:['current'],updated_at:currentRevision},revision:currentRevision},empty());
 const late=acceptProfileRead(beginProfileRead(current,user,3,empty()),user,3,{profile:{...saved().profile,favorites:['old']},revision},empty());
 assert.equal(late.profile.fullName,'Current');assert.deepEqual(late.favoriteState.items,['current']);assert.equal(late.favoriteState.intent,null);
});
