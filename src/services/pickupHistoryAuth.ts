import { PickupApiError } from "../pickup/client";

/** Only an authenticated Firebase account that matches the active Supabase
 * session may access the pickup history. This mirrors Profile's existing
 * fail-closed identity rule; it does not link the two auth providers. */
export const pickupHistoryIdentityMatches = (
  sessionUid: string | null | undefined,
  firebaseUser: { uid: string; isAnonymous?: boolean } | null | undefined,
): boolean => Boolean(sessionUid && firebaseUser?.uid === sessionUid && !firebaseUser.isAnonymous);

/** Distinguish actionable authentication failures from offline/timeout errors
 * without inferring login from cached browser profile or a generic message. */
export const pickupHistoryNeedsSignIn = (error: unknown): boolean => {
  if (error instanceof PickupApiError) return error.status === 401;
  if (!error || typeof error !== "object") return false;
  const code = (error as {code?: unknown}).code;
  return typeof code === "string" && [
    "auth/user-token-expired",
    "auth/id-token-revoked",
    "auth/user-disabled",
    "auth/invalid-user-token",
    "auth/user-not-found",
  ].includes(code);
};
