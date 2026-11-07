import type {UserProfile} from '../types';
import {validCustomerProfileRevision, type ProfileIdentity, type ProfileSnapshot} from './customerProfileApi.ts';

export type ProfileActor=ProfileIdentity & {email?:string|null;displayName?:string|null;phoneNumber?:string|null};
export interface ProfileEditBasis {
  readonly identity:ProfileActor;
  readonly revision:string|null;
}
export interface ProfileSaveResult { profile:UserProfile; basis:ProfileEditBasis }
export interface CustomerFavoriteState {
  items:string[];
  intent:{identity:ProfileActor|null;userId:string;basis:ProfileEditBasis}|null;
}
export interface CustomerProfileState {
  favoriteState:CustomerFavoriteState;
  profile:UserProfile;
  basis:ProfileEditBasis|null;
  owner:ProfileActor|null;
  request:number;
  status:'idle'|'loading'|'ready'|'error';
  error:string|null;
}
const registered=(actor:ProfileActor|null|undefined):actor is ProfileActor=>!!actor?.uid&&!actor.isAnonymous;
const ordinary=(profile:UserProfile):UserProfile=>({...profile,role:'user',is_admin:false,is_vendor:false});
export function initialCustomerProfileState(empty:UserProfile):CustomerProfileState {
  return{profile:ordinary(empty),favoriteState:{items:[],intent:null},basis:null,owner:null,request:0,status:'idle',error:null};
}
export function applyProfileMetadata(state:CustomerProfileState,update:UserProfile|((previous:UserProfile)=>UserProfile),actor:ProfileActor|null):CustomerProfileState {
  const candidate=typeof update==='function'?update(state.profile):update;
  if(candidate===state.profile)return state;
  if(!candidate.id)return initialCustomerProfileState(candidate);
  if(!registered(actor)||candidate.id!==actor.uid)return state;
  // Login/auth/cache values are display seeds, never newer authority than a
  // profile already confirmed for this exact live Firebase identity.
  if(state.basis?.identity===actor&&state.profile.id===actor.uid)return state;
  return{...state,profile:ordinary(candidate),favoriteState:state.owner===actor?state.favoriteState:{items:[],intent:null},basis:null,owner:actor,
    status:state.owner===actor?state.status:'idle',error:state.owner===actor?state.error:null};
}
function authDisplay(actor:ProfileActor,empty:UserProfile):UserProfile {
  return{...ordinary(empty),id:actor.uid,fullName:actor.displayName||actor.email?.split('@')[0]||'',email:actor.email||'',phone:actor.phoneNumber||''};
}
export function beginProfileRead(state:CustomerProfileState,actor:ProfileActor,request:number,empty:UserProfile):CustomerProfileState {
  if(!registered(actor))return initialCustomerProfileState(empty);
  if(state.owner===actor&&request<state.request)return state;
  return{favoriteState:state.owner===actor?state.favoriteState:{items:[],intent:null},profile:state.profile.id===actor.uid?ordinary(state.profile):authDisplay(actor,empty),
    basis:state.basis?.identity===actor?state.basis:null,owner:actor,request,status:'loading',error:null};
}
function confirmed(actor:ProfileActor,snapshot:ProfileSnapshot,empty:UserProfile) {
  if(!registered(actor) || (snapshot.revision!==null&&!validCustomerProfileRevision(snapshot.revision)) ||
    (snapshot.profile===null?snapshot.revision!==null:snapshot.profile.user_id!==actor.uid || snapshot.profile.updated_at!==snapshot.revision))throw Error('Account details were not confirmed.');
  const data=snapshot.profile;
  const profile:UserProfile=data?{
    ...ordinary(empty),id:actor.uid,fullName:data.fullName??'',email:data.email??actor.email??'',phone:data.phone??'',
    city:data.city??empty.city,address:data.address??'',country:data.country??empty.country,
    photoURL:data.photo_url??'',language:data.language??'en',
    latitude:typeof data.latitude==='number'?data.latitude:undefined,
    longitude:typeof data.longitude==='number'?data.longitude:undefined,
  }:authDisplay(actor,empty);
  return{profile,basis:{identity:actor,revision:snapshot.revision}};
}
export function profileSaveResult(actor:ProfileActor,snapshot:ProfileSnapshot,empty:UserProfile):ProfileSaveResult {
  if(!snapshot.profile)throw Error('Profile saving was not confirmed.');
  return confirmed(actor,snapshot,empty);
}
// Preserve the sub-millisecond part of Postgres timestamps; Date.parse alone
// cannot order two receipts a microsecond apart. Offsets are handled by parse.
function revisionOrder(value:string):bigint {
  const fraction = /\.(\d+)(?:Z|[+-])/.exec(value)?.[1] || '';
  return BigInt(Date.parse(value)) * 1000000n + BigInt(fraction.padEnd(9,'0').slice(3,9));
}
function isOlder(state:CustomerProfileState,actor:ProfileActor,basis:ProfileEditBasis):boolean {
  return state.basis?.identity===actor && state.basis.revision!==null &&
    (basis.revision===null || revisionOrder(basis.revision)<revisionOrder(state.basis.revision));
}
export function acceptProfileRead(state:CustomerProfileState,actor:ProfileActor,request:number,snapshot:ProfileSnapshot,empty:UserProfile):CustomerProfileState {
  if(state.owner!==actor||state.request!==request)return state;
  const receipt=confirmed(actor,snapshot,empty);
  return{...state,...(isOlder(state,actor,receipt.basis)?{}:{...receipt,favoriteState:{items:snapshot.profile?.favorites??[],intent:null}}),status:'ready',error:null};
}
export function failProfileRead(state:CustomerProfileState,actor:ProfileActor,request:number):CustomerProfileState {
  if(state.owner!==actor||state.request!==request)return state;
  return{...state,status:'error',error:'Saved account details could not be loaded. Please retry.'};
}
export function acceptProfileSave(state:CustomerProfileState,actor:ProfileActor,request:number,snapshot:ProfileSnapshot,empty:UserProfile):CustomerProfileState {
  if(state.owner!==actor||request<state.request)return state;
  if(!snapshot.profile)throw Error('Profile saving was not confirmed.');
  const receipt=confirmed(actor,snapshot,empty);
  return{...state,...(isOlder(state,actor,receipt.basis)?{}:receipt),request,status:'ready',error:null};
}
export function requireProfileEditBasis(basis:ProfileEditBasis|null|undefined,actor:ProfileActor|null):ProfileEditBasis {
  if(!registered(actor)||!basis||basis.identity!==actor ||
    (basis.revision!==null&&!validCustomerProfileRevision(basis.revision)))throw Error('Load your saved account details before saving. Your changes are still in the form.');
  return basis;
}
