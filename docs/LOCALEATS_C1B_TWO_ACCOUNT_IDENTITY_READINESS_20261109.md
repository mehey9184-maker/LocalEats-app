# LocalEats C1B — Two-account Firebase Identity Readiness & Staging Login Write Shield

**Date:** 9 November 2026  
**Status:** Partial C1B technical preflight passed. Hosted Firebase identity acceptance pending explicit account authorization.

## Scope

C1B is limited to Customer/API **staging** and isolated tests. The owner had explicitly reserved separate permission for creating, disabling, revoking, or deleting hosted Firebase users. This step does not perform those account mutations.

The current Customer staging application is intentionally read-only for ordering, profiles, payments, Rewards, rider onboarding and LocalPay. Existing UI/ShopCards, the four-kilometre discovery rule, cart animations and 10-second no-write review remain unchanged.

## Tests completed

- Firebase Auth Emulator using pinned Firebase tools, actual Firebase Client SDK and Admin SDK, project `demo-localeats-r51` on `127.0.0.1:9099`: **5/5 passed**. Disposable emulator-only accounts confirmed token revocation and re-login, disabled-account rejection, account A to B UID separation, anonymous-session rejection, and sign-out/token rejection. **No hosted Firebase account created or changed.**
- Customer identity contract tests R4.9–R5.2: **26/26 passed** on current branch.
- R5.2T order review regression: **5/5 passed**.
- New C1B staging login write shield: **4/4 passed**. Runtime test compiles actual profile service with staging env and in-memory mocked queue, fetch and Firestore; it verifies a login-time upsert returns a disabled-write error without adding to local queue, calling network, creating retry timers or sending a mirror write. The normal non-staging offline queue still functions.
- TypeScript check and full Customer build passed.

## New verified staging safety issue

Before this change, legacy `LoginScreen` automatically called `upsertProfileWithRPC` following a successful Firebase sign-in. That legacy helper could persist a profile to a shared offline queue, retry in the background and attempt Firestore profile mirroring, even with `VITE_PROFILE_WRITES_ENABLED=false`. The App also requested notification permission and could register a push token on authentication events.

A disabled **staging API write gate by itself does not prevent Firebase Client SDK writes to Firestore**, so this could contaminate a staging test or mix queued account A/B data. The issues were found through source tracing and were not observed as successful hosted writes.

## Minimal staging-only correction

- When `VITE_FIREBASE_CONFIG_SOURCE=environment`, `src/lib/profileService.ts` refuses automatic upserts **before** local cache mutation, offline queueing or network requests, and blocks direct sync, retries and periodic queue processing.
- `src/lib/firebase.ts` rejects direct legacy Firestore profile and push-token saves in strict staging, and disables push-token registration/sync helper calls.
- `src/App.tsx` suppresses the automatic notification-permission prompt in strict staging.
- For all builds without this explicit environment-only staging mode, the historical code path is unchanged. This is not a Production change and is not a general authorization for Firebase writes in staging.

These guards address **automatic login-side write paths**, not every possible legacy Firestore action in the whole Customer app. Hosted account acceptance must avoid favorite toggles, reviews, messaging, merchant/shop edits and other write actions pending a broader gate audit. Any account creation/revocation is itself an identity mutation and needs separate owner authorization.

## Final C1B hosted acceptance — pending

1. Verify in Firebase Console that the **exact dedicated staging Firebase project** matches the two Vercel projects; do not touch Production.
2. Confirm sign-in provider configuration and use only two owner-approved disposable accounts A and B. Do not use real users or personal identifying information. Store passwords only in the chosen identity provider or local password manager; never paste credentials into GitHub or chat.
3. Confirm staging API and Customer write gates remain off immediately before tests. Keep the browser test limited to sign-in, sign-out, profile read and no-write order-history reads.
4. Sign in as A, verify A's Firebase UID and that the API either returns only A's own profile or an expected 404 for an absent profile. Inspect DevTools Network to verify no `POST /api/profiles`, Firestore profile mirror writes or push registration were sent.
5. Sign out and sign in as B **in the same browser**. Confirm old A name/email/profile/history do not appear, even during loading. Profile request must use B's verified token, never A's. Sign out B and sign in as A again.
6. A disabled/revoked token test is a **separate approved mutation**, to be run only with disposable staging test accounts and confirmed cleanup. No automatic live revoke test is authorized yet.
7. Record acceptance without password, API key, ID token, service-account key, private phone number or user email screenshots.
8. After owner sign-off, arrange explicit deletion/cleanup of the two disposable staging identities. Do not delete any existing unrelated user.

The staging database currently lacks hosted `orders` and `pickup_order_events` tables, so an actual private-order-history isolation test is not possible until separate schema/backup approval. An empty 404 response cannot prove that two authenticated accounts are isolated over private persisted orders.

## Decision

**C1B local Firebase emulator and staging source safety preflight passed. Hosted two-account C1B acceptance is NOT complete.**

No hosted accounts were created, disabled or revoked; no SQL migration, database writes, order creation, payment, Rewards activation, Production deployment, or GitHub merge occurred. Browser acceptance remains pending after staging Preview deployment.
