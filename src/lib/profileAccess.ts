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

/** A restored Firebase user with a temporarily missing session must not be
 * redirected from Profile; the editor remains hidden until UIDs match.
 * A genuine guest or a different account must go to Login immediately. */
export function shouldRedirectProtectedProfile(
 identity:ProfileIdentity,sessionUid:string|null|undefined,
):boolean{
 return !identity?.uid || Boolean(identity.isAnonymous) ||
   Boolean(sessionUid && sessionUid!==identity.uid);
}
