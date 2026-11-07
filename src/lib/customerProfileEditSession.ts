import type {UserProfile} from '../types';
import type {ProfileEditBasis,ProfileSaveResult} from './customerProfileState';

export interface ProfileEditValues {fullName:string;phone:string;city:string;address:string;latitude?:number;longitude?:number}
export interface ProfileEditSession {
  ownerId:string|null;
  basis:ProfileEditBasis|null;
  baseline:ProfileEditValues;
  values:ProfileEditValues;
  dirty:boolean;
}
const keys: Array<keyof ProfileEditValues>=['fullName','phone','city','address','latitude','longitude'];
const same=(a:ProfileEditValues,b:ProfileEditValues)=>keys.every(k=>Object.is(a[k],b[k]));
type PhoneFormatter=(value:string)=>string;
export function createProfileEditSession(profile:UserProfile,basis:ProfileEditBasis|null,phone:PhoneFormatter=v=>v):ProfileEditSession {
  const values={fullName:profile.fullName||'',phone:phone(profile.phone||''),city:profile.city||'Johannesburg',address:profile.address||'',latitude:profile.latitude,longitude:profile.longitude};
  return{ownerId:profile.id||basis?.identity.uid||null,basis,baseline:values,values,dirty:false};
}
export function editProfileField<K extends keyof ProfileEditValues>(state:ProfileEditSession,key:K,value:ProfileEditValues[K]):ProfileEditSession {
  if(Object.is(state.values[key],value))return state;
  const values={...state.values,[key]:value};return{...state,values,dirty:!same(values,state.baseline)};
}
export function refreshProfileEditSession(state:ProfileEditSession,profile:UserProfile,basis:ProfileEditBasis|null,phone?:PhoneFormatter):ProfileEditSession {
  const next=createProfileEditSession(profile,basis,phone);
  const accountChanged=state.ownerId!==next.ownerId || !!state.basis&&(!basis||state.basis.identity!==basis.identity);
  if(accountChanged)return next;
  if(state.dirty)return state;
  return same(state.values,next.values)&&state.basis===basis?state:next;
}
export function profileEditPatch(state:ProfileEditSession):Record<string,unknown> {
  if(!state.basis)throw Error('Load your saved account details before saving.');
  const patch:Record<string,unknown>={};
  for(const key of ['fullName','phone','city','address'] as const)if(state.values[key]!==state.baseline[key] || state.basis.revision===null&&['fullName','phone'].includes(key))patch[key]=state.values[key].trim();
  if(state.values.latitude!==state.baseline.latitude||state.values.longitude!==state.baseline.longitude){patch.latitude=state.values.latitude??null;patch.longitude=state.values.longitude??null;}
  return patch;
}
export function acceptProfileEditSave(state:ProfileEditSession,submitted:ProfileEditSession,result:ProfileSaveResult,options:{photoOnly?:boolean}={},phone?:PhoneFormatter):ProfileEditSession {
  if(!submitted.basis||state.basis?.identity!==submitted.basis.identity||result.basis.identity!==submitted.basis.identity || result.profile.id!==submitted.ownerId)return state;
  if(state.basis!==submitted.basis&&state.basis.revision!==result.basis.revision)return state;
  const canonical=createProfileEditSession(result.profile,result.basis,phone);
  const values={...canonical.values};
  for(const key of keys)if(options.photoOnly || !Object.is(state.values[key],submitted.values[key]))(values as any)[key]=state.values[key];
  return{...canonical,values,dirty:!same(values,canonical.baseline)};
}

export interface SignupProfileDraft { identity: ProfileEditBasis['identity']; fullName:string; phone:string }
export function recoverSignupProfileDraft(state:ProfileEditSession,draft:SignupProfileDraft|null,phone:PhoneFormatter=v=>v):ProfileEditSession {
  if(!draft || !state.basis || state.basis.identity!==draft.identity || state.ownerId!==draft.identity.uid || state.dirty)return state;
  return editProfileField(editProfileField(state,'fullName',draft.fullName),'phone',phone(draft.phone));
}
