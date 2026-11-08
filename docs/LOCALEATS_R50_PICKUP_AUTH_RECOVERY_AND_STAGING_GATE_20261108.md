**R5.1 historical correction (8 November 2026):** See [R5.1 Customer Firebase auth](LOCALEATS_R51_FIREBASE_IDENTITY_RECOVERY_AND_STAGING_GATE_20261108.md). The old dual-provider hypothesis was incorrect for the inspected Customer login adapter. Historical tests remain isolated evidence, not hosted acceptance.

# LocalEats Customer R5.0 — pickup authentication recovery and isolated staging acceptance

**Owner request:** 8 November 2026, "Next recommended phase — R5.0". **Status:** DRAFT PR #82, isolated test-only approval; no merge or release. **Current result:** safe customer-side 401/identity mismatch recovery notice prepared and contract-tested. **Actual multi-provider sign-in recovery and real hosted staging/browser approval NOT COMPLETE.**

## What changed in the existing Customer app

1. `src/services/pickupHistoryAuth.ts` defines a pure, restrictive identity check: valid Supabase session UID **must match** a nonanonymous Firebase user UID for this pickup-read path. This mirrors the existing `src/lib/profileAccess.ts` identity gate. It does **not** link providers, mint tokens or prove that all existing customers have matching identities. A normal 401, revoked/disabled Firebase token or other specific credential errors are distinguished from connection/DB/timeout failures.
2. `src/App.tsx` uses Firebase's `onAuthStateChanged` after Supabase session selection and waits for initial Firebase hydration before loading pickup history; it verifies the UID **before request and again after response**, guarding account switching and slow stale responses. If Firebase identity disappears, mismatches, is anonymous, or its API returns 401, it stops periodic retries, aborts the pending read, clears the displayed pickup history/orders/notifications, and marks `authRequired=true` only for the active Supabase account. Returning successful data remains filtered by the current authenticated UID. Ordinary connection failures preserve the current user's previously verified pickup statuses with the existing stale/retry notice.
3. `src/screens/OrderHistoryScreen.tsx` and `src/screens/PickupTrackingScreen.tsx` preserve **original layout, cards, navigation, typography and checkout**. Only the error card branches: on `authRequired`, instead of a pointless repeated retry, it explains that pickup account verification failed and offers **Open sign in** through the existing Login route. For ordinary offline/DB/timeout failures, the original **Retry** remains. No automatic signout, profile deletion or retrying a payment/pickup command is attempted.
4. The previous `src/services/customerPickup.ts`, `src/pickup/client.ts`, Profile/Home/ShopCard/menu/cart, merchant routes and payment-at-shop interface are unchanged. No Customer order is created in tests; `VITE_PICKUP_ORDERING_ENABLED=false` throughout this PR.

## Tests and evidence

- `tests/r50-pickup-auth-recovery.test.mjs` — eight source/functional checks for matching nonanonymous Firebase and Supabase UIDs, classified Firebase revocation/401 vs retryable outages, current API client 401 and refreshed token behaviour, existing protected history hooks, and both unchanged UI recovery cards.
- `tests/r49-customer-auth-recovery.test.mjs` — seven prior API-client transport checks, including no cross-account cached authorization and no phantom order success on network failure.
- PR-only workflow `.github/workflows/localpay-r50-customer-auth-recovery.yml` runs Node 22 without Firebase/Supabase/financial credentials; source tests do not touch real services, create orders or change live auth.
- Existing **Customer Main Baseline Release Gate**, TypeScript and bundle, original pickup integration, closed-shop, logout, startup and other regressions must pass on the final branch head. Check GitHub CI results; do not infer browser visual approval from static tests.
- Exact initial verified R5.0 workflow run **42498035236**, job **128784512781**, on source commit **`b093eeba2c54dbc09faa5105db426602c2720c7d`** was **SUCCESS** with **8/8 R5.0** and **7/7 R4.9** Node tests. A new documentation commit may trigger fresh runs; report current head evidence separately.

## Important unsolved identity-reconciliation blocker

**R5.1 correction: LoginScreen calls `supabase.auth.signInWithPassword`, but `src/lib/supabase.ts` delegates to Firebase `signInWithEmailAndPassword`. The session uses the Firebase UID and Firebase ID token.** Pickup also uses that same Firebase Auth instance. Merely tapping **Open sign in** is not proven to renew a revoked Firebase token or establish an equivalent Firebase UID. The new error notice is truthful about failed pickup access, but the sign-in journey cannot be declared fully recovered until the actual Firebase-backed sign-in path is verified in an isolated browser and against the API. Do **not** send the Supabase JWT as if it were a Firebase ID token; do not trust a local stored UID or email match; do not automatically provision/migrate user identities or weaken Supabase/Firebase authorization checks.

`logoutCustomer` calls the legacy compatibility adapter's `signOut`, which invokes Firebase `signOut(auth)`. Client sign-out does not revoke already-issued ID tokens; verify private-cache cleanup and API protections separately.

**Fail-closed identity mismatch still protects customer data.** The Firebase-backed adapter normally provides the same UID for Customer session and pickup authentication; diagnose any difference by inspecting actual configuration and account ownership, not by weakening guards. Browser tests must include existing accounts and an intentional mismatch.

## R5.0 actual hosted staging readiness checklist — NOT COMPLETE

Do not call a Vercel Preview an isolated staging environment without confirming its backing services. Before a real hosted test, the owner or delegated engineer must establish:

- **Firebase isolation:** independent nonproduction project ID, authentication issuer/audience, separate credentials and `VITE_FIREBASE_CONFIG_SOURCE=environment` with complete staging-only frontend config, no bundled Production Firebase values. Ensure Auth Emulator is **disabled** in hosted staging, no Production service keys are present, and test accounts cannot access Production resources.
- **Database isolation:** independently identified Supabase staging project / database, RLS, company/project IDs, test-only shops/customers and no Production order, profile, payout or Rewards records. Confirm Vercel deployment project and environment-variable scope with actual evidence, not assumption.
- **Authentication acceptance:** force revoke/disable of a staging-only user on another test device, keep Supabase session valid, view Customer History and Pickup Tracker, confirm no stale private order data, distinguish 401 from offline state, and verify a complete reauthentication flow returning the same authenticated pickup identity *without* a user-profile/ShopCard redesign. Check two tabs, profile switch, browser refresh, Firebase anonymous user, lost network, token expiration and actual second user's orders.
- **Merchant and pickup:** merchant login to staged shop, ownership transfer/revocation, approval/participation, no cached rights to another shop, no disabled-gate bypass, no real pickup order mutation. Existing original merchant Orders UX needs owner manual sign-off; normal app order auth is not independently proven Rewards eligibility.
- **Performance acceptance:** capture p50, p95, p99 for login, Home, Profile, pickup history and merchant order handling on realistic South African mobile networks, with revoked-token revocation lookup, cold start, retries, Firebase outages and reauthentication. The R4.9 localhost median **2 ms**/p95 **3 ms** is **NOT** usable as a mobile/hosted SLO.
- **Release review:** independently check law/consent/merchant terms, real R500 owner backing, real at-shop payment/collected handover, refund disputes, programme reservations and proper security controls. **No LocalPay reward, credit or merchant payable is live.**

## Phase outcome and next approval

**R5.0 safe UI error recovery guard + offline tests:** implemented on Customer draft PR #82 with original design preserved. **R5.0 true customer Firebase re-login and hosted staging:** **BLOCKED** pending isolated staging, real Firebase/DB configuration, browser/manual acceptance and owner approval. R5.1 corrected the independent dual-auth assumption. Keep all three LocalEats Rewards PRs draft/unmerged; no Production, live order, database migration, staging mutation or payment activation from this phase.

Suggested next phase (owner-gated): **R5.1 — Design and test secure Supabase ↔ Firebase identity reconciliation** in a fully isolated environment, then complete live-like Customer re-sign-in and logout across both providers before any release decision. Do not implement a cross-provider session shortcut based only on user-provided UID/email or frontend storage.
