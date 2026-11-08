# LocalEats Customer R5.2C — Real Firebase Staging Gate

**8 November 2026 | Owner-approved draft-only staging preparation.**
No hosted Firebase project was created (Firebase management actions not exposed to this session). No hosted Vercel environment/deployment, Firebase user, Supabase schema/data, actual order, LocalPay balance, payment, Production or merge was changed.

## Customer config safeguard implemented

The explicit VITE_FIREBASE_CONFIG_SOURCE=environment mode in src/lib/firebaseConfigPolicy.ts now additionally rejects Firebase demo-prefixed emulator project IDs and any single web-configuration value copied from the bundled Firebase project. It already required all six Firebase web settings and an explicit Firestore database ID; src/lib/firebase.ts refuses a different pre-existing Firebase app and default Firestore fallback in strict staging mode. The default normal-build environment/bundled precedence is unchanged, preserving original Customer UI and behavior. This guard cannot prove independent Vercel secrets or actual Firebase project ownership by itself.

Existing R5.2 tests now use a **synthetic staging-shaped** project identifier (not a claimed real Firebase resource), and new tests explicitly reject demo-only projects and mixed bundled values. No Firebase SDK or hosted service is called in this offline guard test.

## Staging setup still required

1. Verify/create a real, separate no-cost Firebase Spark staging project through the user's Firebase console; project ID must differ from Production, and must not begin with demo-. Enable Email/Password Auth only for future synthetic tests. Keep all Admin credential values out of git, PRs, browser VITE_ variables and chat.
2. Reuse the existing separate LocalEats-Profile-Staging Supabase project only after a reviewed pickup schema and explicit synthetic-data approval. It currently has public.profiles but not the core pickup tables.
3. Establish exact-branch or dedicated-project Vercel isolation for Customer/API, including Firebase Project ID and server issuer matching, distinct service-role database credentials, valid staging HTTPS API origin, and all pickup/profile/orders/rewards/LocalPay writes disabled.
4. Verify exact Preview SHA before even creating a synthetic Auth user or running token revocation and same-UID re-login browser tests. No Production credentials, Firestore policies, migrations or data copied into staging.
5. Preserve original ShopCard, menu, cart, routing, pickup tracking and historical security-recovery behavior; no merge until original UI owner review.

Authoritative API-stage schema and Firebase provisioning runbook:
https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/124
(docs/R52C_REAL_FIREBASE_STAGING_AND_SYNTHETIC_PICKUP_SCHEMA_20261108.md)

**Status:** Customer strict-staging tripwire DRAFT implemented and testable; Firebase hosted project still not provisioned; Supabase hosted pickup schema not applied; browser staging acceptance blocked.
