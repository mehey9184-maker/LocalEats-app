# LocalEats C1D — Read-Only Hosted Identity Verification Gate

**Date:** 9 November 2026  
**Scope:** Customer Preview only. Draft branch stacked on C1C. No Production, merge, profile/DB writes, orders, payments, Rewards, LocalPay or account mutation.

## Background
The owner created two disposable accounts, `tester` and `tester2`, and manually confirmed same-browser login, logout, switching back, and no visible private data from tester while logged in as tester2. C1C implemented and preview-deployed the related account isolation hardening.

The last authorization concern is **valid Firebase sessions**, not synthetic invalid tokens. Unauthenticated tests returned HTTP 401, but those tests cannot prove valid Customer A cannot read Customer B's rows.

## Server contract checked through source review

- `GET /api/v1/profiles/me`: `authenticateFirebase` verifies the Firebase ID token with revocation checks, rejects anonymous sessions and reads only the verified UID.
- `GET /api/v1/orders`: `authenticateFirebase` requires an ID token, scopes its Supabase query with `.eq("user_id", uid)`, and returns at most 50 results.
- Staging API remains read-only and creates no real orders.
- Staging Supabase currently lacks the pickup `orders` and `pickup_order_events` tables, so a read-only GET can legitimately return `503 DATABASE_UNAVAILABLE`; that result is **not a security pass** or a proof of cross-account access.
- A fresh staging Firebase user with no profile row may get `404 PROFILE_NOT_FOUND`, which is a valid absence result but not proof of persisted profile isolation.

## Opt-in staging diagnostics (not shown in ordinary UI)

The owner can open the **Customer staging Preview** with `?c1d=1`. The small local diagnostic panel is rendered only when:
- The hostname begins with `localeats-customer-staging-r52d-`.
- `VITE_FIREBASE_CONFIG_SOURCE=environment`.
- `VITE_PICKUP_ORDERING_ENABLED` and `VITE_PROFILE_WRITES_ENABLED` are **not** `true`.
- The configured API origin is exactly the approved stable staging API alias.

The panel requires an authenticated nonanonymous Firebase user and makes only:
1. `GET https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app/api/v1/profiles/me`
2. `GET https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app/api/v1/orders`

Both use the existing Firebase SDK `getIdToken()` only for the request Authorization header; they do not use query string credentials or persistence. The panel **never logs, stores, or displays** an ID token, UID, email, phone, address, profile, or actual order data.

The output includes only HTTP status, an allowlisted response code, owned-record result (match/mismatch/empty/unverified), result count, `Cache-Control: no-store` and exact staging CORS origin. It aborts in-progress requests and removes results immediately when Firebase changes UID. It does not make POST, PUT, PATCH, DELETE, Firestore writes, FCM registration, or payment calls.

## Manual owner acceptance steps

1. Open the new C1D Preview link with `?c1d=1` and sign in as `tester`; refresh after sign-in if necessary. Press **Run two read-only GET checks**.
2. Record *only* the two HTTP statuses, response code labels, ownership labels, and no-store/CORS indicators; do not copy Authorization headers, password, ID token, account UID or network response bodies.
3. Sign out using LocalEats' normal sign-out control. Sign in as `tester2`, then revisit `?c1d=1` and repeat the check.
4. Verify no tester profile data flashes while tester2 is logged in; do not take any write action.
5. Owner can report statuses in chat. **Never call 404, 503, empty orders or invalid token denial proof of positive cross-account row isolation.**
6. Even two valid tokens with empty responses cannot prove record-level isolation: this needs separately owner-approved isolated profile/order fixtures once schema readiness and backup gates are satisfied.

## Test outcomes
Current isolated Customer branch regression run:
- New C1D safe probe and ownership/blocked-state tests: **8/8 passed**.
- Retained C1C account isolation plus Customer auth/startup: **35/35 passed**.
- C1B login write shield and R5.2T order review: **9/9 passed**.
- Original pickup integration: **8/8 passed**.
- TypeScript and full Customer bundle build: **passed**.

## Release/approval decision

**C1D automated read-only verifier: PASS. Hosted valid-identity acceptance: PENDING owner browser results.**

The C1D testing panel is not an authenticated authorization grant. The real API must continue to authorize every request. Do not merge, enable live pickup/rewards/payments, modify Firebase accounts, create database fixtures, or mark full identity readiness complete until the outstanding evidence and separate owner approvals are satisfied.


## Owner screenshot acceptance — 10 November 2026 (two disposable accounts)

The owner submitted screenshots of the isolated Customer staging C1D diagnostics for the two created Firebase accounts, `tester` and `tester2`. **Do not upload or reproduce the screenshots in GitHub**: they contain account contact information. Only de-identified status results are recorded here.

| C1D result | Account A | Account B |
| --- | --- | --- |
| Firebase account state | signed in | signed in |
| `GET /api/v1/profiles/me` | HTTP 404 `PROFILE_NOT_FOUND` | HTTP 404 `PROFILE_NOT_FOUND` |
| `GET /api/v1/orders` | HTTP 503 `DATABASE_UNAVAILABLE` | HTTP 503 `DATABASE_UNAVAILABLE` |
| `Cache-Control` | `no-store` for both | `no-store` for both |
| CORS diagnostic label | `not confirmed` | `not confirmed` |

**Interpretation:** These are read-path responses for signed-in staging sessions and are consistent with absent profile records and the unprovisioned orders schema. Neither response contains persisted private customer records to compare. **Positive owner isolation remains unproven**, and C1D **must not** receive full sign-off.

**Additional UI trust defects verified through code review:**

1. `src/App.tsx` in `ProfileScreen` displays `All details verified & saved`, `Synced to cloud` and `Saved` whenever the form is not dirty, rather than when there is a durable backend save receipt. This contradicts both screenshot API 404 results; staging profile writes remain disabled. The profile Save handler may also display success when its callback does not return an authoritative receipt. Fix is required before making public claims of cloud persistence, without changing the original UI layout.
2. The profile reward tier currently uses `5 more to Silver` and reaches Gold at 10 completed orders. Those display thresholds do not match the previously approved draft reward concept of Bronze after **4 qualifying kota purchases** and a separate Silver mission; moreover, Rewards is not activated. Do not treat orders completed as automatically equivalent to qualifying reward purchases. Correct/hide the unapproved promotional claims before launch.
3. The C1D panel compares `response.headers.get("access-control-allow-origin")` to the page origin. Browsers cannot normally read that cross-origin response header without an `Access-Control-Expose-Headers` opt-in. Because the panel successfully read structured JSON/error statuses from both cross-origin API requests, its `CORS: not confirmed` likely reflects a test-instrumentation false negative, not evidence of a blocked fetch. Improve the diagnostic rather than modifying API CORS policies on this evidence.

**Next gate:** targeted Preview-only C1E correctness cleanup for misleading profile save/verification, reward status, and CORS diagnostic; then, only with separately approved migrations and backup, provision minimal synthetic staging profile/order fixtures for true two-identity row-level isolation. No production, database or hosted-account mutation has been performed in C1D.
