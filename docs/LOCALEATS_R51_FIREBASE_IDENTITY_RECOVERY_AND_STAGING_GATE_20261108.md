# LocalEats R5.1 — Firebase identity and session recovery

**8 November 2026 | Owner-approved R5.1 DRAFT-ONLY tests/fix.** No Production deploy, PR merge, security rule change, database write, customer order, payment/reward activation or release sign-off. Preserve original Customer UI/UX and pickup-first pay-at-shop policy.

## Correcting the R5.0 assumption

The current Customer application does NOT independently use Supabase Auth. Although LoginScreen calls a method named supabase.auth.signInWithPassword, src/lib/supabase.ts is a Firebase-backed compatibility adapter: it delegates to Firebase signInWithEmailAndPassword, builds a session from Firebase user.uid and getIdToken(), restores via auth.authStateReady(), and signs out using Firebase signOut(auth). The pickup client obtains the same Firebase currentUser ID token. The central API calls verifyIdToken(token, true) and uses Supabase separately as its database. A browser-supplied UID, email or cached profile cannot authorize pickup activity.

This corrects the previous independent-dual-auth hypothesis. Do NOT introduce a bridge relying on untrusted email or UID, send a Supabase JWT as Firebase ID token, or weaken account ownership checks.

## Narrow draft behavior change

Customer pickup-history in src/App.tsx now observes Firebase onIdTokenChanged instead of only onAuthStateChanged. New credentials for the SAME account may change the token without a UID change; this listener allows a blocked feed to attempt fresh server authentication. All R5.0 protections remain: reject missing/anonymous/other identities; abort in-flight A-requests on account switch or 401; clear sensitive orders and notifications; keep ordinary offline/timeout Retry; use the existing Open sign in control; do not rewrite Home, ShopCard, Login, History, Tracking, menu, cart, checkout or merchant operations.

A new token does not itself restore trust. The API must still verify its signature, issuer, audience and revoked/disabled status. Returning 401 must block again.

## Isolated evidence

- tests/r51-firebase-auth-contract.test.mjs: inspect real Firebase-backed compatibility adapter, token source, token-change recovery wiring, fail-closed UID checks and 401-versus-network handling without network credentials.
- tests/r51/firebase-auth-recovery-emulator.test.mjs: actual Firebase client/Admin SDKs using synthetic users and ONLY local demo-localeats-r51 Auth Emulator, including old-token revocation, same-UID fresh sign-in, disabled user, A→B account switch, anonymous user and sign-out.
- .github/workflows/localpay-r51-firebase-auth-recovery.yml: PR-only workflow, Node 22, disabled ordering/rewards flags, reject hosted Firebase/Supabase secrets.
- Retain R4.9, R5.0 and the existing Customer baseline regressions. A workflow is only passed when its current commit is checked.

## Still open (block release)

1. Confirm a fully separate Firebase project and database for hosted staging. src/lib/firebase.ts has bundled fallback credentials; a Vercel Preview alone does NOT prove staging isolation.
2. In a genuinely isolated browser, revoke the active staging-only user while viewing pickup history. Check API 401 hides history, the existing Open sign in route leads to fresh password sign-in, and subsequent history loads from the server for that same Firebase UID without a manual reload.
3. Disabled-account rejection, second-user switch during a slow A-request, anonymous and multi-tab flows, refresh, network errors, token expiry, sign-out/private-cache clearance; keep all staff ownership controls.
4. Confirm API Firebase issuer/audience matches actual isolated frontend Firebase project and verify revoked tokens and merchant rights against that staged API. No real order or payment test.
5. Measure hosted and South African mobile p50, p95 and p99 sign-in, first history, recovery and merchant checks; local emulator timing does not establish realistic latency.
6. Security, Rewards funding, CPA/regulatory, payout, Merchant UX owner approval and Production release still require separate gates. Local Firebase signOut alone does not revoke unexpired ID tokens on the server.

**Status:** Source correction and draft patch submitted. Emulator CI outcome must be independently observed; browser and hosted staging acceptance OPEN. PR #82, API PR #124 and Super Admin PR #4 remain draft/unmerged. No Production, Supabase writes, customer orders, LocalPay balances or payouts changed.
