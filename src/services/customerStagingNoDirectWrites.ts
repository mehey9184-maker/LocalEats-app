/**
 * L3-N8L: Customer-stage defense in depth against legacy direct mutations.
 *
 * The isolated Customer and Merchant staging Vercel apps BOTH point to
 * Firebase project localeats-staging / Firestore (default). Before a
 * reviewed server-side replacement exists, stage browser writes must not
 * claim a review, follow, message, contact, token, shop or profile persisted.
 *
 * This is not Firebase Security Rules; a modified client can bypass it.
 * Production codepaths using a different Firebase project are unchanged.
 */
export const CUSTOMER_STAGING_LEGACY_WRITE_DISABLED=
  "Customer staging is read-only. This change was not saved. Please use the verified LocalEats API when that feature is available.";

export function isCustomerStageLegacyWriteBlocked(env:unknown):boolean {
  if(!env || typeof env!=="object")return false;
  const e=env as {VITE_FIREBASE_PROJECT_ID?:unknown};
  return e.VITE_FIREBASE_PROJECT_ID==="localeats-staging";
}

export function assertCustomerLegacyWriteAllowed(env:unknown):void {
  if(isCustomerStageLegacyWriteBlocked(env))
    throw new Error(CUSTOMER_STAGING_LEGACY_WRITE_DISABLED);
}

export function ensureCustomerLegacyWriteAllowed():void {
  assertCustomerLegacyWriteAllowed(import.meta.env);
}
