import type { UserProfile } from "../types";

/**
 * Customer profile ownership is based only on the currently active Firebase UID.
 * An old browser cache, route parameter or server response cannot authorize
 * a profile update after the user changes accounts or signs out.
 */
export function activeCustomerIdentityMatches(
  requestedUid: string | null | undefined,
  firebaseUid: string | null | undefined,
): boolean {
  return Boolean(requestedUid && firebaseUid && requestedUid === firebaseUid);
}

export function emptyCustomerProfile(uid?: string): UserProfile {
  return {
    ...(uid ? { id: uid } : {}),
    fullName: "",
    email: "",
    phone: "",
    city: "Johannesburg",
    address: "",
    country: "South Africa",
    role: "user",
  };
}

/**
 * Never inherit a previous account's phone, address, favorites or identity
 * metadata when seeding a new account's profile.
 */
export function ownCustomerProfileBase(previous: UserProfile, requestedUid: string): UserProfile {
  return previous?.id === requestedUid
    ? previous
    : emptyCustomerProfile(requestedUid);
}
