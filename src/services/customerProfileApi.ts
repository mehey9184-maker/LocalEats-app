/**
 * L3-N8U-T — hosted Customer profile API. The Vite Customer site rewrites
 * unknown /api/* paths to index.html; profiles belong on the LocalEats API.
 * No local Firestore mirror, client-supplied owner UID, or fabricated save.
 */
import { pickupApiOrigin } from "../pickup/client";

export class CustomerProfileApiError extends Error {
  constructor(public readonly status:number, public readonly code:string) {
    super(code);
    this.name="CustomerProfileApiError";
  }
}

type Identity={uid:string;getIdToken:()=>Promise<string>};
type ProfileResponse={success?:unknown;profile?:unknown;code?:unknown};
const PROFILE_PATH="/api/v1/profiles/me";

export function hostedProfileUrl(apiBase:string, production=false):string {
  return pickupApiOrigin(apiBase,production)+PROFILE_PATH;
}
function asObject(value:unknown):Record<string,unknown>|null {
  return value !== null && typeof value==="object" && !Array.isArray(value)
    ? value as Record<string,unknown> : null;
}
export async function hostedProfileRequest(
  apiBase:string,
  account:Identity|null,
  method:"GET"|"POST",
  updates?:Record<string,unknown>,
  transport:typeof fetch=fetch,
  production=false,
):Promise<Record<string,unknown>|null> {
  // Defense in depth: never send privileged identity/role fields even if a
  // future caller accidentally tries; API applies its own independent check.
  if(method==="POST"){
    const permitted=new Set(["fullName","phone","city","address","country",
      "photo_url","language","latitude","longitude","favorites"]);
    if(!updates || Object.keys(updates).length===0 ||
      Object.keys(updates).some(key=>!permitted.has(key)))
      throw new CustomerProfileApiError(400,"PROFILE_FIELDS_FORBIDDEN");
  }
  if(!account || !account.uid)throw new CustomerProfileApiError(401,"UNAUTHORIZED");
  const token=await account.getIdToken();
  if(!token)throw new CustomerProfileApiError(401,"UNAUTHORIZED");
  const url=hostedProfileUrl(apiBase,production);
  let response:Response;
  try {
    response=await transport(url,{
      method,cache:"no-store",
      headers:{
        Authorization:"Bearer fb-"+token,
        Accept:"application/json",
        ...(method==="POST" ? {"Content-Type":"application/json"}:{}),
      },
      ...(method==="POST" ? {body:JSON.stringify(updates??{})} : {}),
    });
  } catch {
    throw new CustomerProfileApiError(0,"PROFILE_API_UNREACHABLE");
  }
  // HTML fallbacks, blank 200s and redirects can NEVER count as saved profiles.
  if(!response.headers.get("content-type")?.toLowerCase().includes("application/json"))
    throw new CustomerProfileApiError(response.status,"PROFILE_API_INVALID_RESPONSE");
  let json:ProfileResponse;
  try {json=await response.json();} catch {
    throw new CustomerProfileApiError(response.status,"PROFILE_API_INVALID_RESPONSE");
  }
  if(method==="GET" && response.status===404 && json?.code==="PROFILE_NOT_FOUND")
    return null;
  if(!response.ok || json?.success!==true){
    const code=typeof json?.code==="string" && /^[A-Z0-9_]{1,64}$/.test(json.code)
      ? json.code : "PROFILE_API_ERROR";
    throw new CustomerProfileApiError(response.status,code);
  }
  const profile=asObject(json.profile);
  if(!profile || profile.user_id!==account.uid)
    throw new CustomerProfileApiError(response.status,"PROFILE_OWNER_MISMATCH");
  return profile;
}
