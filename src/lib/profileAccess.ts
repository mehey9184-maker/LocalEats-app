/** A Firebase anonymous browsing session is not a registered customer account. */
export type ProfileIdentity={uid:string;isAnonymous?:boolean}|null|undefined;
export function canManageCustomerProfile(identity:ProfileIdentity,sessionUid:string|null|undefined):boolean{
  return Boolean(identity?.uid && !identity.isAnonymous && sessionUid && identity.uid===sessionUid);
}
