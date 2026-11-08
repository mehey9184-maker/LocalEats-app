/** Only an authenticated nonanonymous Firebase account matching the active
 * session may access pickup history. The legacy `supabase.auth` Customer
 * adapter delegates to Firebase Auth; matching UIDs here is a fail-closed
 * continuity guard, not evidence of two independently authenticated users.
 * The API must still verify each Firebase ID token and its revocation status. */
export const pickupHistoryIdentityMatches = (
  sessionUid: string | null | undefined,
  firebaseUser: { uid: string; isAnonymous?: boolean } | null | undefined,
): boolean => Boolean(sessionUid && firebaseUser?.uid === sessionUid && !firebaseUser.isAnonymous);

/** Distinguish actionable authentication failures from offline/timeout errors
 * without inferring login from cached browser profile or a generic message. */
export const pickupHistoryNeedsSignIn = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  if ((error as {status?: unknown}).status === 401) return true;
  const code = (error as {code?: unknown}).code;
  return typeof code === "string" && [
    "auth/user-token-expired",
    "auth/id-token-revoked",
    "auth/user-disabled",
    "auth/invalid-user-token",
    "auth/user-not-found",
  ].includes(code);
};
