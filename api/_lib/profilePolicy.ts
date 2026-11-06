/** Pure allowlist and validation for the server's own-account profile update.
 * No authorization roles, shop IDs or order fields may be client-written. */
export class ProfileInputError extends Error {}
const textField=(name:string,value:unknown,max:number):string|null=>{
  if(value===null)return null;
  if(typeof value!=="string" || value.length>max)
    throw new ProfileInputError("Invalid "+name);
  return value.trim();
};
export function normalizeProfileInput(raw:unknown,uid:string,verifiedEmail?:string):
 Record<string,unknown>{
  if(!raw || Array.isArray(raw) || typeof raw!=="object")
    throw new ProfileInputError("Invalid profile payload");
  const value=raw as Record<string,unknown>;
  if(value.user_id!==uid)throw new ProfileInputError("Profile account mismatch");
  const result:Record<string,unknown>={user_id:uid};
  if(typeof verifiedEmail==="string" && verifiedEmail.length<=254)
    result.email=verifiedEmail;
  const fields:Record<string,number>={
    fullName:120,phone:32,city:120,address:400,country:80,
    photo_url:2048,language:12,
  };
  for(const [name,max] of Object.entries(fields)){
    if(Object.prototype.hasOwnProperty.call(value,name))
      result[name]=textField(name,value[name],max);
  }
  if(Object.prototype.hasOwnProperty.call(value,"favorites")){
    const favorites=value.favorites;
    if(!Array.isArray(favorites) || favorites.length>100 ||
      favorites.some(x=>typeof x!=="string" || !x || x.length>128))
      throw new ProfileInputError("Invalid favorites");
    result.favorites=[...new Set(favorites)];
  }
  // Deliberately do not copy client supplied email, role, is_admin,
  // balance, latitude, longitude, user_id override, or other keys.
  return result;
}
export function ownerMatches(requested:string,verifiedUid:string):boolean {
  return !!requested && requested===verifiedUid;
}
