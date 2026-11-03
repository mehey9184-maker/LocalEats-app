/**
 * LocalEats Profile P3 — server-side ownership and write policy.
 * The service-role DB connection bypasses RLS. Every client write therefore
 * requires authenticated owner checks and a strict field allowlist.
 * Neither roles nor email addresses are ever copied from request bodies.
 */
export class ProfilePolicyError extends Error {
  constructor(message:string, public status=400){super(message);this.name="ProfilePolicyError";}
}

export function requireProfileOwner(authenticatedId:unknown, requestedId:unknown):string {
  if(typeof authenticatedId!=="string" || !authenticatedId.trim() ||
     authenticatedId==="anon")throw new ProfilePolicyError("Authenticated account required.",401);
  if(typeof requestedId!=="string" || !requestedId.trim() || requestedId==="anon")
    throw new ProfilePolicyError("A valid account ID is required.");
  if(authenticatedId!==requestedId)throw new ProfilePolicyError("Profile belongs to another account.",403);
  return authenticatedId;
}

const textField=(value:unknown, max:number, name:string, allowBlank=true):string|null=>{
  if(value===null) {
    if(!allowBlank)throw new ProfilePolicyError(`Invalid ${name}.`);
    return null;
  }
  if(typeof value!=="string")throw new ProfilePolicyError(`Invalid ${name}.`);
  const text=value.trim();
  if(text.length>max || (!allowBlank&&!text))throw new ProfilePolicyError(`Invalid ${name}.`);
  return text;
};

export function buildCustomerProfilePatch(input:unknown):Record<string,unknown>{
  if(!input || typeof input!=="object" || Array.isArray(input))
    throw new ProfilePolicyError("Profile details must be an object.");
  const body=input as Record<string,unknown>;
  const patch:Record<string,unknown>={};
  const fullName=body.fullName??body.full_name??body.name;
  if(fullName!==undefined)patch.fullName=textField(fullName,120,"full name",false);
  const address=body.address??body.default_address;
  if(address!==undefined)patch.address=textField(address,500,"address");
  if(body.phone!==undefined){
    const raw=textField(body.phone,32,"phone");
    const digits=raw?.replace(/\\D/g,"") ?? "";
    if(!digits)patch.phone=null;
    else if(/^0[0-9]{9}$/.test(digits))patch.phone="+27"+digits.slice(1);
    else if(/^27[0-9]{9}$/.test(digits))patch.phone="+"+digits;
    else throw new ProfilePolicyError("Enter a valid South African phone number.");
  }
  for(const [key,max] of [["city",120],["country",120],["language",12]] as const){
    if(body[key]!==undefined)patch[key]=textField(body[key],max,key);
  }
  const photo=body.photo_url??body.avatar_url??body.photoURL;
  if(photo!==undefined){
    // Existing photos can be removed. Uploads require a separately reviewed,
    // account-scoped server upload endpoint with a verified storage key.
    if(photo!=="" && photo!==null)throw new ProfilePolicyError("Profile photo uploads are unavailable.");
    patch.photo_url="";
  }
  if(body.latitude!==undefined){
    const lat=body.latitude;
    if(lat!==null && (typeof lat!=="number" || !Number.isFinite(lat) || lat < -90 || lat > 90))
      throw new ProfilePolicyError("Invalid latitude.");
    patch.latitude=lat;
  }
  if(body.longitude!==undefined){
    const lng=body.longitude;
    if(lng!==null && (typeof lng!=="number" || !Number.isFinite(lng) || lng < -180 || lng > 180))
      throw new ProfilePolicyError("Invalid longitude.");
    patch.longitude=lng;
  }
  if(body.favorites!==undefined){
    if(!Array.isArray(body.favorites) || body.favorites.length>100 ||
       !body.favorites.every(id=>typeof id==="string" && id.length>0 && id.length<=128))
      throw new ProfilePolicyError("Invalid favorites list.");
    patch.favorites=[...new Set(body.favorites)];
  }
  // Deliberately IGNORE role, email, is_admin, ownership, and arbitrary fields.
  // Email comes from the verified Firebase/Supabase user at registration only.
  if(Object.keys(patch).length===0)throw new ProfilePolicyError("No editable profile fields provided.");
  return patch;
}

export function createCustomerProfileRecord(uid:string, email:unknown, patch:Record<string,unknown>):Record<string,unknown> {
  // Customer role is set only during the initial insert, not on updates.
  // An existing merchant/rider/admin role must never be overwritten by an edit.
  const row:Record<string,unknown>={user_id:uid,role:"customer",...patch};
  if(typeof email==="string" && email.length<=320 && email.includes("@"))row.email=email;
  return row;
}
