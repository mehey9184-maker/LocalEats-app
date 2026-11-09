/**
 * C1D: staging-only, read-only account access probe.
 * Never return or log a Firebase ID token, UID, profile body or order body.
 * The two allowlisted endpoints use GET only; no health/push/notification reads
 * that can mutate state, and no profile/order write path is available here.
 */
export const C1D_STAGING_API = "https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app";
export const C1D_PATHS = ["/api/v1/profiles/me", "/api/v1/orders"] as const;
export type C1DEndpoint = (typeof C1D_PATHS)[number];
export type C1DOwnership = "match" | "mismatch" | "empty" | "unverified";

export interface C1DSafeResult {
  path: C1DEndpoint;
  status: number;
  code: string | null;
  ownership: C1DOwnership;
  count: number | null;
  noStore: boolean;
  corsMatches: boolean;
}

export type C1DReport = {
  outcome: "completed" | "account-changed";
  authenticated: boolean;
  results: C1DSafeResult[];
};

type SessionIdentity = {
  uid: string;
  isAnonymous?: boolean;
  getIdToken(): Promise<string>;
};

const safeErrorCode = (value: unknown): string | null =>
  typeof value === "string" && /^[A-Z][A-Z0-9_]{2,48}$/.test(value) ? value : null;

export function c1dStagingEnabled(env: Record<string, unknown>, hostname: string, query: string): boolean {
  const params = new URLSearchParams(query);
  return params.get("c1d") === "1" &&
    hostname.startsWith("localeats-customer-staging-r52d-") &&
    env.VITE_FIREBASE_CONFIG_SOURCE === "environment" &&
    env.VITE_PICKUP_ORDERING_ENABLED !== "true" &&
    env.VITE_PROFILE_WRITES_ENABLED !== "true" &&
    env.VITE_LOCALEATS_API_URL === C1D_STAGING_API;
}

export async function runC1DReadOnlyChecks(
  getIdentity: () => SessionIdentity | null,
  browserOrigin: string,
  transport: typeof fetch,
  signal?: AbortSignal,
): Promise<C1DReport> {
  const identity = getIdentity();
  if (!identity?.uid || identity.isAnonymous) {
    return { outcome: "completed", authenticated: false, results: [] };
  }
  const uid = identity.uid;
  const stillCurrent = () => Boolean(getIdentity()?.uid === uid && !getIdentity()?.isAnonymous);
  // The raw token stays within this function and the Authorization HTTP header.
  // Never expose it in reports, error text, browser storage or URLs.
  const token = await identity.getIdToken();
  if (!stillCurrent() || signal?.aborted) return { outcome: "account-changed", authenticated: false, results: [] };

  const results: C1DSafeResult[] = [];
  for (const path of C1D_PATHS) {
    if (!stillCurrent() || signal?.aborted) {
      return { outcome: "account-changed", authenticated: false, results: [] };
    }
    const response = await transport(C1D_STAGING_API + path, {
      method: "GET",
      headers: { "Accept": "application/json", Authorization: "Bearer fb-" + token },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal,
    });
    let body: unknown = null;
    try { body = await response.json(); } catch { /* Never emit response text. */ }
    if (!stillCurrent() || signal?.aborted) {
      return { outcome: "account-changed", authenticated: false, results: [] };
    }
    const json = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
    let ownership: C1DOwnership = "unverified";
    let count: number | null = null;
    if (response.status === 200 && path === "/api/v1/profiles/me") {
      const profile = json?.profile;
      const record = profile && typeof profile === "object" && !Array.isArray(profile)
        ? profile as Record<string, unknown> : null;
      ownership = record?.user_id === uid ? "match" : "mismatch";
    }
    if (response.status === 200 && path === "/api/v1/orders") {
      const items = json?.orders;
      if (Array.isArray(items)) {
        count = items.length;
        ownership = count === 0 ? "empty" :
          items.every(item => item && typeof item === "object" && item.user_id === uid)
            ? "match" : "mismatch";
      } else {
        ownership = "mismatch";
      }
    }
    results.push({
      path,
      status: response.status,
      code: safeErrorCode(json?.code),
      ownership,
      count,
      noStore: (response.headers.get("cache-control") || "").toLowerCase().includes("no-store"),
      corsMatches: response.headers.get("access-control-allow-origin") === browserOrigin,
    });
  }
  return { outcome: "completed", authenticated: true, results };
}
