# Firebase pickup security gate — review and staging only (2026-11-07)

## What is verified in GitHub (not Firebase Production)

- Customer and Merchant bundled Firebase config default to project `localeats-5e26e` and named Firestore database `ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe`. Runtime environment overrides must be checked separately per deployed app.
- Customer `firestore.rules` (deployment-configured source file) grants `allow read, write: if true` to sensitive profiles, orders, device FCM tokens, contact/chat messages, riders and merchant collections. It is an unsafe **source** ruleset.
- Merchant `firestore.rules` is different: generally more restrictive but still supports historical rider/delivery and some browser order mutation. Both sets must be reconciled before targeting the shared database.
- Customer `firebase.json` has a single firestore rules field without an explicit named-database mapping; that alone does NOT establish which rule release governs the named database.
- The existing synthetic `security/review/firestore-pickup-phase1.rules` tests only a subset of legacy routes. It is not a validated pickup launch rule for both apps.

**We could not read the currently published Firebase rules from the available connected project tools. Therefore the live rules may differ from both source files. Do not claim a live breach has been proved or fixed.**

## Candidate and automated test

`security/review/firestore-pickup-launch-candidate_REVIEW_ONLY.rules` is *not* referenced by production `firebase.json`. It enforces: publicly readable catalog (`shops`, `menu_items`) and reviews; authenticated UID-scoped profile and order reads; authenticated shop-owner order reads; server-only profile/order/shop/menu mutation; limited self-scoped follow creation/removal; all other browser access denied (including rider data, chat and token collections).

`tests/firestore-pickup-launch-lockdown.test.cjs` tests this candidate using the **emulator and demo project only**. It must assert that unauthenticated/other-account readers fail, server-owned facts cannot be client-mutated, and the narrow public catalog and follows behavior still work. Passing this synthetic suite is necessary, **not sufficient** for rollout.

### Critical compatibility questions before live deployment

1. **Deployed facts:** In Firebase Console, select project `localeats-5e26e`, Firestore and the actual named database above. Inspect the **Rules** tab and recorded release/version; separately inspect `(default)` if present. Save an offline snapshot of current rules and release timestamp without any credential exports. Confirm deployed Customer and Merchant Firebase config/environment IDs (and Cloud Firestore database ID). Rules must match the *named* database.
2. **Merchant writes:** Current Merchant Firestore SDK still contains direct shop/menu updates and account/user doc writes. This candidate denies them pending central API migration and merchant UI compatibility tests. Do not lock merchant menu/settings unexpectedly.
3. **Customer writes:** Legacy reviews, contact messages, push tokens and chats previously wrote directly to Firestore; the candidate denies them. Customer profile saving in draft PR #71 moves to verified central API, but hosted Firebase+Supabase two-account acceptance remains outstanding. Make UI fail honestly or migrate each required path before cutover.
4. **Identity boundaries:** Customer, merchant and guest use Firebase Auth UIDs for Firestore rules; check no path assumes Supabase Auth UUIDs or role values from user-editable metadata. Offline caches and service roles must not be treated as auth proof.
5. **Catalog privacy:** Public Firestore reads expose *whole documents*, not selected fields. Inspect live shop/menu/reviews docs for owner personal details, private inventory data or credentials; if present, implement server-filtered public catalog instead. Do not copy raw live records into GitHub.
6. **Collections outside this first audit:** app_errors/app_error_logs, stores/merchants/vendors and nested documents, shop_followers, promo codes, payments and rider collections are default denied in candidate. Inventory actual deployed collections and all current SDK calls; don't silently break needed legitimate functionality.
7. **Rules are not filters:** Test collection queries (not just getDoc) with Firebase emulator + actual apps and auth UIDs; otherwise a formerly working query may start rejecting.
8. **API authority:** Firebase Admin SDK bypasses client Firestore Rules. Separately audit the API service role / IAM / custom claims / privileged writes and Supabase production public privilege findings. Firestore rules alone do not fix Supabase RLS.

## Release gates and rollback

No actual Firebase rule deploy, git main merge, production write, order/payment/delivery/rider feature activation, or database reset is authorized by this review. The original `firestore.rules` and `firebase.json` are unchanged.

Before separately approved cutover:
- Obtain and retain the **exact current deployed rules release and database ID**, plus Firebase/Firestore backup coverage; prepare reversible versioned release.
- Run emulator negative + positive tests, authenticated A/B and merchant Preview tests on isolated Firebase/Supabase projects, plus real hosted test after changes. Verify both Client and Merchant reads, profile saves, catalog/menu, shop/settings, notification, Ready and recipient isolation.
- Promote coordinated frontend/API updates in the correct order. Use Firebase CLI or Firebase Console targeting the exact named database; do not use a generic `firebase deploy --only firestore` without checking database mappings.
- Confirm live security rules by reading the deployed version and running permission tests with synthetic credentials on a separately authorized test database.
- Revert to previously verified secure release if compatibility regresses; never restore known-open rules as a long-term rollback for public customers.
- Resolve separate Supabase signup-role/rider notification exposure and complete production backup/restore, monitoring, POPIA and commercial-hosting gates.

Related issues: https://github.com/mehey9184-maker/LocalEats-app/issues/72 ; https://github.com/mehey9184-maker/LocalEats-Dashboard.2/issues/73 . Profile PRs #71 (Customer) and #75 (Merchant/API) are still separate drafts.

Official Firebase references:
- https://firebase.google.com/docs/rules/insecure-rules
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/security/rules-query
- https://firebase.google.com/docs/firestore/security/test-rules-emulator
- https://firebase.google.com/docs/rules/manage-deploy
