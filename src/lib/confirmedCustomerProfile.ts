/**
 * LocalEats Profile transport. Does not talk to Firestore, cache server writes,
 * or accept a caller-selected UID/role from an API response.
 *
 * Runtime flags are supplied by the caller. The production default is OFF.
 */
export interface VerifiedProfileIdentity {
  uid: string;
  isAnonymous?: boolean;
  getIdToken():Promise<string>;
}
export interface ProfileTransport {
  read(uid:string):Promise<Record<string,unknown>|null>;
  save(uid:string,patch:Record<string,unknown>):Promise<Record<string,unknown>>;
}
export interface ProfileTransportConfig {
  origin:string;
  currentUser:()=>VerifiedProfileIdentity|null;
  readsEnabled:()=>boolean;
  writesEnabled:()=>boolean;
  fetcher?:typeof fetch;
}
const allowed=new Set(["fullName","phone","city","address","country","photo_url","language","latitude","longitude","favorites"]);
const registered=(identity:VerifiedProfileIdentity|null,uid:string):identity is VerifiedProfileIdentity=>
  !!identity && !identity.isAnonymous && !!identity.uid && identity.uid===uid;
const baseOrigin=(raw:string):string=>{
  try{
    const u=new URL(raw);
    if(u.protocol!=="https:"||!!u.username||!!u.password||u.pathname!=="/"||!!u.search||!!u.hash)throw Error();
    return u.origin;
  }catch{throw Error("LocalEats profile API is not configured. No profile was saved.");}
};
const asRecord=(data:unknown):Record<string,unknown>|null=>
  data!==null&&typeof data==="object"&&!Array.isArray(data)?data as Record<string,unknown>:null;

export function createConfirmedProfileTransport(config:ProfileTransportConfig):ProfileTransport {
 const transport=config.fetcher??fetch;
 const identity=async(uid:string)=>{
  const original=config.currentUser();
  if(!registered(original,uid))throw Error("Sign in with the matching registered account.");
  const token=await original.getIdToken();
  if(typeof token!=="string"||!token||config.currentUser()!==original)
   throw Error("Your account changed while saving. Sign in again.");
  return {original,header:"Bearer fb-"+token};
 };
 const request=async(uid:string,method:"GET"|"POST",patch?:Record<string,unknown>)=>{
  if(!config.readsEnabled())throw Error("Profile server access is not enabled yet.");
  if(method==="POST"&&!config.writesEnabled())throw Error("Profile saving is not enabled yet. Nothing was saved.");
  const base=baseOrigin(config.origin),{original,header}=await identity(uid);
  const result:Awaited<ReturnType<typeof fetch>>=await transport(base+"/api/v1/profiles/me",{
   method,headers:{"Authorization":header,"Content-Type":"application/json"},
   cache:"no-store",...(patch?{body:JSON.stringify(patch)}:{})
  });
  if(config.currentUser()!==original)throw Error("Your account changed while saving. Sign in again.");
  if(result.status===404&&method==="GET")return null;
  const contentType=result.headers.get("content-type")||"";
  if(!/^\s*application\/json\s*(?:;|$)/i.test(contentType))
    throw Error("The profile server did not return a verified response.");
  const body=asRecord(await result.json());
  const record=asRecord(body?.profile);
  if(!result.ok||body?.success!==true||!record||record.user_id!==uid)
    throw Error("The profile server has not confirmed this account's information.");
  if(method==="POST"&&patch)for(const [key,value] of Object.entries(patch)){
    if(value===undefined)continue;
    if(!Object.hasOwn(record,key))throw Error("The profile server did not confirm all saved fields.");
  }
  return record;
 };
 return {
  read:(uid)=>request(uid,"GET"),
  save:async(uid,patch)=>{
   if(!patch||typeof patch!=="object"||Array.isArray(patch))throw Error("Invalid profile.");
   const out:Record<string,unknown>={};
   for(const [key,value] of Object.entries(patch)){
    if(!allowed.has(key))throw Error("A profile field was not authorized.");
    if(value!==undefined)out[key]=value;
   }
   if(!Object.keys(out).length)throw Error("No profile changes to save.");
   const profile=await request(uid,"POST",out);
   if(!profile)throw Error("Profile save was not confirmed.");
   return profile;
  }
 };
}
