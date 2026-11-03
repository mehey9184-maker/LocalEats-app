// Customer Profile P1: keep the edit path account-scoped and fail closed.
// A local cache, queued write, or HTTP 200 HTML fallback is NOT confirmation.
export type CustomerEditableProfile = {
  fullName:string;phone:string;address:string;city:string;
  latitude?:number;longitude?:number;photoURL?:string;
};

type AuthUser={uid:string;getIdToken:()=>Promise<string>};
type Fetcher=typeof fetch;

function normalizedPhone(value:string):string{return value.replace(/\D/g,"");}
function profileValue(profile:Record<string,unknown>,key:keyof CustomerEditableProfile):unknown{
  if(key==="fullName")return profile.fullName??profile.full_name??profile.name;
  if(key==="photoURL")return profile.photo_url??profile.avatar_url??profile.photoURL;
  return profile[key];
}
function matchesConfirmedValue(key:keyof CustomerEditableProfile,expected:unknown,actual:unknown):boolean{
  if(key==="phone")return typeof actual==="string" && normalizedPhone(actual)===normalizedPhone(String(expected));
  if(key==="latitude"||key==="longitude")return typeof actual==="number" && Number.isFinite(actual) && actual===expected;
  return typeof actual==="string" && actual.trim()===String(expected).trim();
}

export async function saveConfirmedCustomerProfile(
  ownerUid:string|undefined,
  currentUser:AuthUser|null,
  changes:Partial<CustomerEditableProfile>,
  fetcher:Fetcher=fetch,
):Promise<Partial<CustomerEditableProfile>>{
  if(!ownerUid || !currentUser || currentUser.uid!==ownerUid)
    throw new Error("Sign in to the correct account before editing your profile.");
  const allowed=(["fullName","phone","address","city","latitude","longitude","photoURL"] as const);
  const requested:Partial<CustomerEditableProfile>={};
  for(const key of allowed){
    const value=changes[key];
    if(value===undefined)continue;
    if(key==="photoURL" && value!=="")
      throw new Error("Profile photo uploads require an authenticated LocalEats upload endpoint.");
    if(key==="latitude"||key==="longitude"){
      if(typeof value!=="number"||!Number.isFinite(value))
        throw new Error("Invalid profile location.");
    }else if(typeof value!=="string"){
      throw new Error("Invalid profile field.");
    }
    (requested as Record<string,unknown>)[key]=value;
  }
  if(!Object.keys(requested).length)throw new Error("No profile changes to save.");
  const token=await currentUser.getIdToken();
  if(!token || currentUser.uid!==ownerUid)throw new Error("Profile authentication is unavailable.");
  const headers={"Content-Type":"application/json",Authorization:`Bearer fb-${token}`};
  const payload={user_id:ownerUid,...requested};
  if(requested.photoURL!==undefined){
    (payload as Record<string,unknown>).photo_url=requested.photoURL;
    delete (payload as Record<string,unknown>).photoURL;
  }
  const saved=await fetcher("/api/profiles",{
    method:"POST",headers,body:JSON.stringify(payload),cache:"no-store",
  });
  const ack=await saved.json().catch(()=>null);
  if(!saved.ok || ack?.success!==true)
    throw new Error("Profile update was not confirmed by the LocalEats API. No saved result is assumed.");
  const checked=await fetcher(`/api/profiles/${encodeURIComponent(ownerUid)}`,{
    method:"GET",headers,cache:"no-store",
  });
  const confirmation=await checked.json().catch(()=>null);
  const profile=confirmation?.profile as Record<string,unknown>|undefined;
  if(!checked.ok || !profile || (profile.user_id??profile.id)!==ownerUid)
    throw new Error("Profile update could not be verified. Refresh your account before trying again.");
  for(const key of Object.keys(requested) as (keyof CustomerEditableProfile)[]){
    if(!matchesConfirmedValue(key,requested[key],profileValue(profile,key)))
      throw new Error("Profile update could not be verified. Refresh your account before trying again.");
  }
  return requested;
}
