# LocalEats — C1 isolated Firebase identity security preflight (9 November 2026)

## Scope and restrictions

Founder approved C1 staging-only identity testing after the R5.2T Customer Preview order-review simulation. This report records **read-only checks and disposable offline mocked-identity tests**. It does **not** authorize creating, disabling, revoking, or deleting hosted Firebase accounts, changing staging SQL, sending test orders, activating payment/order flows, merging pull requests, or deploying Production.

Customer staging deployment at the time of assessment:
- Project: `localeats-customer-staging-r52d`
- Deployment: `dpl_EgnwUpzEppvc6xzEjppxVaS8PXLD`, READY
- Commit: `7c3fd50b415d221407d2c50a180e547ae37d9189`
- Staging alias: `https://localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app`
- Paired API project: `localeats-api-staging-r52d`
- Paired API alias: `https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app`

## Configuration reviewed (metadata and non-secret settings only)

- Both projects are separate from the original Customer/Production project.
- Customer and API Firebase **project identifiers match**, and the matching identifier is **not** the bundled original Production Firebase project.
- API `SUPABASE_URL` points to the dedicated `LocalEats-Profile-Staging` project rather than the Production Supabase project.
- Both projects have `LOCALEATS_STAGING_ONLY=true` and Preview-targeted variable scopes.
- `VITE_FIREBASE_CONFIG_SOURCE=environment` is set in Customer.
- The Customer `VITE_LOCALEATS_API_URL` points to the correct stable staging API alias.
- `VITE_PICKUP_ORDERING_ENABLED=false`, `PICKUP_WRITES_ENABLED=false`, `PROFILE_WRITES_ENABLED=false`, `VITE_PROFILE_WRITES_ENABLED=false`.
- The Firebase API credential/signing validity has **not** been validated by a hosted successful ID-token request. Do not claim it has.

Only non-secret comparisons and boolean results were displayed; no sensitive environment values, service-account private keys, account tokens, or passwords are captured here.

## Isolated source test evidence

Tests ran against the actual unmerged draft source (without any hosted Firebase credentials or Supabase service-role credentials):

| Test surface | Command / source | Outcome | Boundary |
| --- | --- | --- | --- |
| Customer identity/session recovery and staging Firebase config | `node --experimental-strip-types --test tests/r49-customer-auth-recovery.test.mjs tests/r50-pickup-auth-recovery.test.mjs tests/r51-firebase-auth-contract.test.mjs tests/r52-firebase-staging-config.test.mjs` | **26 of 26 passed** | Source contract, in-memory tokens, no hosted identity |
| API revocation/malformed token/merchant ownership and profile ownership | `npm ci && npm run build && node --test tests/rewards/r48/revocationMiddleware.test.mjs dist/routes/customerProfiles.test.js` | **13 of 13 passed** | Fake Firebase Admin verifier and fake DB store, no hosted identity or SQL writes |

Covered by tests:
- Firebase token-mapped UID, invalid/malformed/missing bearer tokens, revoked/disabled/expired/wrong-project **mocked** tokens, verifier outage fail-closed and no reused authentication across separate requests.
- Merchant ownership mismatch and transferred-shop owner rejected even when test verifier returns a UID, while pickup write gates remain disabled.
- Customer Firebase single-source auth adapter, account/session recovery, stale history-request abort, reauthentication and staging Firebase config fail-closed.
- API profile routes scope reads to the verified UID in an in-memory fake store. These are not tests of real staging row-level security.

**Do not reinterpret mocked token rejection as proof of live cryptographic signature validation or live revocation.** Firebase documents `verifyIdToken(token, true)` as using a backend check for disabled/revoked users, unlike signature-only verification.

## Hosted API negative checks (no data writes)

Requests were run without credentials against the stable staging API alias, without following auth redirects:

| Request | Observed HTTP response |
| --- | --- |
| `GET /api/v1/profiles/me` without auth | **401** |
| `GET /api/v1/profiles/me` with intentionally invalid synthetic bearer | **401** |
| `GET /api/v1/orders` without auth | **401** |
| `GET /api/v1/orders` with intentionally invalid synthetic bearer | **401** |
| `GET /api/v1/catalog/shops` from Production website `Origin` | **403**, `CORS_ORIGIN_DENIED` |
| `GET /api/v1/catalog/shops` from staging Customer `Origin` | **200**, 3 catalog shops |

These checks establish unauthenticated denial only; they do not establish user-to-user isolation for valid Firebase tokens.

## Outstanding C1 sign-off gates (BLOCKED; require separate authorization)

1. **Host two disposable staging Firebase customer identities** (A and B) in the verified isolated Firebase project, with no real-person data. Owner must explicitly authorize creating those hosted accounts and define the cleanup plan before use.
2. **Two-account API/browser acceptance:** login A, request only A's allowed private resources, switch to B, verify A's UI/cache/historical records and credentials cannot appear for B, then switch back. No real orders are permitted; order-history schema remains unprovisioned.
3. **Revoked/disabled session acceptance:** separately approve disable/revoke changes to one disposable staging account, then verify its previous token is rejected with HTTP 401 and it can be recovered only through an approved reauthentication path. No Production identity modification.
4. **Merchant ownership staging acceptance:** requires a separately approved synthetic merchant user and shop ownership fixture. Existing fake-database owner tests are a useful preflight, not a hosted owner-binding proof.
5. **Schema/data and operational gate:** staging PostgreSQL currently has no public `orders` or `pickup_order_events` tables; real order-history isolation cannot be tested yet. Any new migration/fixture requires its own approval, verified backup and rollback plan.
6. **Owner's manual UX gate:** browser sign-in, sign-out and switching should not flicker, disclose prior account state or cause data flashes. Record a screenshot/log of the result without credentials.
7. Confirm that all five non-order enablement switches remain disabled before and after hosted account testing.

## Decision

**C1 preflight: PASS for isolated source tests + hosted negative read checks. Full C1 identity approval: NOT GRANTED.**

No account creation/disable/revoke, SQL/database writes, Git merge, Production deployment, real checkout, payment, rider activation, Rewards, or LocalPay activation occurred in this phase.
