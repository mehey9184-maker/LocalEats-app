# LocalEats R5.2 — Hosted staging isolation gate

**8 November 2026 | Owner authorized R5.2 investigation and safe draft-only changes.**
Status: **FAIL / BLOCKED FOR HOSTED TESTING.** Real browser authentication, Firebase account creation/revocation, hosted API calls and realistic mobile latency measurements were **NOT ATTEMPTED**. Do not conflate a green offline CI policy test with safe hosted staging.

## What was actually verified (read-only Vercel metadata)

Connected Vercel projects under the owner's team include Customer `project-x7cvt`, API `localeats-api`, Merchant Dashboard `local-eats-dashboard-2-6m8o` and Super Admin `localeats-super-admin`.

- Customer `project-x7cvt` has Firebase web variables such as VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY and VITE_FIREBASE_AUTH_DOMAIN scoped to BOTH Preview and Production. The R5.1/R5.2 Customer PR branch `docs/rewards-master-handover-pointer-20261108` has **no exact-branch Vercel deployment** returned in the read-only deployment query.
- API `localeats-api` has FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY scoped to BOTH Preview and Production. The API draft branch `docs/rewards-master-plan-credit-20261108` has **no exact-branch Vercel deployment** returned.
- Merchant Dashboard also has shared Preview/Production Firebase configuration entries. Some older unrelated feature branches have their own Preview overrides; these do not prove current draft isolation.
- The API staging database reference, Firebase project/issuer match, deployment-specific effective values, customer test identities and independent data isolation have **not** been verified. Environment metadata was inspected WITHOUT decrypting or exposing secrets. Shared scopes do not prove any current Production feature was enabled, but they disqualify an assumption that Preview is independently isolated.

**Decision:** no hosted Firebase Auth/Firestore/Supabase/Orders test on these current deployments; no Production account revocation, authentication setting changes, data writes, order creation, service key changes or Vercel deployment.

## Draft-only R5.2 Customer safeguard

`src/lib/firebaseConfigPolicy.ts` adds opt-in strict Firebase web configuration. In explicit `VITE_FIREBASE_CONFIG_SOURCE=environment` mode, ALL six Firebase web fields and `VITE_FIREBASE_FIRESTORE_DATABASE_ID` must be nonblank and the project ID cannot equal the bundled legacy Customer project `localeats-5e26e`. No one field may silently fall back to the bundled production configuration. Missing/mismatched staging configuration fails closed.

When the mode is NOT explicitly selected, existing environment-first and bundled fallback behavior is preserved, including the production app's current look, shop discovery, pickup history and default-off write gates. This source guard **does not by itself prove Firebase or database isolation**: a separate trusted environment inspection is still mandatory.

`tests/r52-firebase-staging-config.test.mjs` and `.github/workflows/localpay-r52-customer-isolation.yml` test the policy using synthetic strings with no hosted credentials and no SDK calls. Retain prior R5.1, R5.0, R4.9 and baseline regression evidence on the final Customer commit.

## Preconditions before any REAL hosted R5.2 test

1. Establish an independent, intentionally nonproduction Firebase project with only synthetic test identities, Firestore and test credentials, and a separate Supabase staging project/database with no production profiles, menu/order/payment/reward data. Verify in provider consoles and by read-only authorized inspection; never copy production secrets or personal data.
2. Either use dedicated nonproduction Vercel projects or **verifiably branch-scoped Preview-only** Customer and API environment variables for the exact review branches. Avoid production-targeted/shared sensitive variables. Do not reveal encrypted values in CI logs or PRs. Check the API Admin project/issuer/audience equals the Customer staging Firebase project and differs from Production.
3. For Customer strict mode set `VITE_FIREBASE_CONFIG_SOURCE=environment` and provide the full staging Firebase configuration including an explicit Firestore database ID. API URL must be HTTPS and the approved staging API origin, not the live API.
4. Ensure all staging write gates are OFF: `VITE_PICKUP_ORDERING_ENABLED=false`, `PICKUP_WRITES_ENABLED=false`, merchant/profile writes disabled, Rewards/LocalPay/online payments disabled, no rider/delivery. A staging Auth Emulator is not the same as hosted Firebase; any hosted test must use independently verified genuine nonproduction credentials.
5. Obtain a Customer and API Preview deployment whose Git branches and commit SHAs exactly match the tested draft heads, and verify the effective scoped settings and API path. A READY Vercel deployment is not enough.
6. Establish owner-approved synthetic account identities, real hosted test scope and secure cleanup. Never revoke a real customer/merchant session.

## Manual R5.2 acceptance AFTER preconditions

- Login as synthetic Customer A; read only that account's synthetic history. Revoke A's Firebase refresh tokens in the isolated staging project; API rejects old token (401), Customer hides private history, and existing **Open sign in** path permits fresh same-UID login followed by successful server-authorized history read.
- Disabled A remains blocked; A→B switch while A's request is pending never reveals A data; test anonymous browsing, sign-out, refresh, two tabs, token expiration and lost network. 401 must never appear as empty history and network 503 must not trigger forced sign-out.
- Merchant synthetic account and shop ownership changes must be verified solely with disposable staging data; backend write-gates still refuse pickup mutations. No real order, merchant payout or reward grant.
- Record p50/p95/p99 hosted sign-in, token revocation check, customer history and Merchant performance under realistic South African mobile throttling. The R4.9 localhost metrics are not hosted SLAs.
- Owner separately reviews original Customer and Merchant UI, security evidence, privacy controls, isolated infrastructure and release prerequisites. No merge, Production ordering or LocalPay approval is included.

**Current outcome:** R5.2 offline configuration hardening and safety checks are draft-only; actual hosted staging acceptance **BLOCKED** until the above evidence exists. Customer PR #82, API PR #124, Super Admin PR #4 remain draft/unmerged.
