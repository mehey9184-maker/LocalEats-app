import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverSignupProfileDraft,createProfileEditSession,editProfileField,refreshProfileEditSession,profileEditPatch,acceptProfileEditSave} from '../src/lib/customerProfileEditSession.ts';
const actor={uid:'A',isAnonymous:false,getIdToken:async()=>''};
const basis={identity:actor,revision:'2026-11-06T18:00:00.123456+00:00'};
const profile={id:'A',fullName:'Saved name',phone:'0712345678',email:'a@example.invalid',city:'Johannesburg',address:'',country:'South Africa',role:'user'};
const newer={identity:actor,revision:'2026-11-06T18:00:01.123456+00:00'};
test('pristine editor adopts verified fields and their exact revision together',()=>{
 const initial=createProfileEditSession(profile,null);const next=refreshProfileEditSession(initial,{...profile,fullName:'Server'},basis);
 assert.equal(next.values.fullName,'Server');assert.equal(next.basis,basis);assert.equal(next.dirty,false);
});
test('background reads cannot rebase or erase unsaved edits',()=>{
 const dirty=editProfileField(createProfileEditSession(profile,basis),'fullName','My draft');
 const next=refreshProfileEditSession(dirty,{...profile,fullName:'Another device'},newer);
 assert.equal(next,dirty);assert.equal(next.basis.revision,basis.revision);assert.equal(next.values.fullName,'My draft');
});
test('changing accounts discards old private draft fields even when dirty',()=>{
 const dirty=editProfileField(createProfileEditSession(profile,basis),'address','Private A draft');const b={...basis,identity:{...actor,uid:'B'}};
 const next=refreshProfileEditSession(dirty,{...profile,id:'B',fullName:'B',address:''},b);
 assert.equal(next.values.address,'');assert.equal(next.values.fullName,'B');assert.equal(next.basis,b);
});
test('same-UID fresh authentication cannot inherit the prior session edit basis',()=>{
 const dirty=editProfileField(createProfileEditSession(profile,basis),'fullName','Old session');const relogged={...basis,identity:{...actor}};
 assert.equal(refreshProfileEditSession(dirty,profile,relogged).dirty,false);
});
test('patches contain only changed fields, with no unrelated defaults',()=>{
 const dirty=editProfileField(createProfileEditSession(profile,basis),'fullName',' Updated ');
 assert.deepEqual(profileEditPatch(dirty),{fullName:'Updated'});assert.deepEqual(profileEditPatch(createProfileEditSession(profile,basis)),{});
});
test('a verified new account explicitly creates its name and phone',()=>{
 const draft=createProfileEditSession(profile,{...basis,revision:null});assert.deepEqual(profileEditPatch(draft),{fullName:'Saved name',phone:'0712345678'});
});
test('unverified drafts cannot be sent by borrowing a later read revision',()=>{
 const draft=editProfileField(createProfileEditSession(profile,null),'fullName','Before loading');
 assert.equal(refreshProfileEditSession(draft,profile,basis).basis,null);assert.throws(()=>profileEditPatch(draft));
});
test('zero coordinates and explicit coordinate clearing are preserved',()=>{
 let draft=editProfileField(createProfileEditSession(profile,basis),'latitude',0);draft=editProfileField(draft,'longitude',0);
 assert.deepEqual(profileEditPatch(draft),{latitude:0,longitude:0});
 let cleared=createProfileEditSession({...profile,latitude:-26,longitude:28},basis);cleared=editProfileField(cleared,'latitude',undefined);cleared=editProfileField(cleared,'longitude',undefined);
 assert.deepEqual(profileEditPatch(cleared),{latitude:null,longitude:null});
});
test('confirmed save displays backend values and advances its edit basis',()=>{
 const sent=editProfileField(createProfileEditSession(profile,basis),'fullName',' Updated ');
 const result=acceptProfileEditSave(sent,sent,{profile:{...profile,fullName:'Updated'},basis:newer});
 assert.equal(result.values.fullName,'Updated');assert.equal(result.basis,newer);assert.equal(result.dirty,false);
});
test('a confirmed photo-only update preserves unsaved text while advancing the known own-write revision',()=>{
 const sent=editProfileField(createProfileEditSession(profile,basis),'fullName','Unsaved text');
 const result=acceptProfileEditSave(sent,sent,{profile:{...profile,photoURL:'https://example.invalid/a'},basis:newer},{photoOnly:true});
 assert.equal(result.values.fullName,'Unsaved text');assert.equal(result.basis,newer);assert.equal(result.dirty,true);
});
test('edits made during a save survive its receipt',()=>{
 const sent=editProfileField(createProfileEditSession(profile,basis),'fullName','First');const later=editProfileField(sent,'fullName','Second');
 const result=acceptProfileEditSave(later,sent,{profile:{...profile,fullName:'First'},basis:newer});assert.equal(result.values.fullName,'Second');assert.equal(result.dirty,true);assert.equal(result.basis,newer);
});
test('old-account save receipts cannot replace a new editor',()=>{
 const sent=createProfileEditSession(profile,basis),otherBasis={...basis,identity:{...actor,uid:'B'}};
 const current=createProfileEditSession({...profile,id:'B',fullName:'B'},otherBasis);
 assert.equal(acceptProfileEditSave(current,sent,{profile,basis:newer}),current);
});


test('signup recovery becomes an explicit draft against the verified baseline',()=>{
 const initial=createProfileEditSession(profile,basis);const recovered=recoverSignupProfileDraft(initial,{identity:actor,fullName:'Signup name',phone:'0799999999'});
 assert.equal(recovered.basis,basis);assert.equal(recovered.baseline.fullName,profile.fullName);assert.deepEqual(profileEditPatch(recovered),{fullName:'Signup name',phone:'0799999999'});
});
test('signup recovery cannot borrow another identity or an unverified basis',()=>{
 const draft={identity:actor,fullName:'Private name',phone:'0799999999'};
 const unverified=createProfileEditSession(profile,null);assert.equal(recoverSignupProfileDraft(unverified,draft),unverified);
 const other=createProfileEditSession(profile,{...basis,identity:{...actor}});assert.equal(recoverSignupProfileDraft(other,draft),other);
});
test('signup recovery cannot erase edits already made in the form',()=>{
 const edited=editProfileField(createProfileEditSession(profile,basis),'fullName','My edit');assert.equal(recoverSignupProfileDraft(edited,{identity:actor,fullName:'Signup name',phone:'0799999999'}),edited);
});
