/** A Firebase anonymous browsing session is not a registered customer account. */
export type ProfileIdentity={uid:string;isAnonymous?:boolean}|null|undefined;
export function canManageCustomerProfile(identity:ProfileIdentity,sessionUid:string|null|undefined):boolean{
  return Boolean(identity?.uid && !identity.isAnonymous && sessionUid && identity.uid===sessionUid);
}

/** Guests go straight to the existing Login route; no intermediate profile CTA. */
export function profileDestination(
  identity:ProfileIdentity, sessionUid:string|null|undefined,
  requested:"profile"|"complete-profile"
): "login"|"profile"|"complete-profile" {
  return canManageCustomerProfile(identity,sessionUid) ? requested : "login";
}
