/**
 * Profile API authorization: the requested owner must be the same authenticated
 * non-anonymous user. Never trust an "anon" string identity or request body role.
 * This helper is deliberately pure so it can be tested without cloud credentials.
 */
export type VerifiedProfileIdentity = {
  uid?: unknown;
  id?: unknown;
  is_anonymous?: unknown;
  isAnonymous?: unknown;
  firebase?: {sign_in_provider?: unknown};
};
export function ownsProfile(identity: VerifiedProfileIdentity | null | undefined, requestedId: unknown): boolean {
  if(typeof requestedId!=="string"||!requestedId.trim()||requestedId==="anon")return false;
  if(!identity || identity.is_anonymous===true || identity.isAnonymous===true ||
    identity.firebase?.sign_in_provider==="anonymous")return false;
  const uid=typeof identity.uid==="string"?identity.uid:identity.id;
  return typeof uid==="string" && uid!=="anon" && uid===requestedId;
}
/** Client JSON cannot change merchant/admin/rider authorization properties. */
export const customerProfileFields=["email","phone","city","country","language","latitude","longitude","favorites"] as const;
