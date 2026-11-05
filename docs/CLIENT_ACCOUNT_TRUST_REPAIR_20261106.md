# LocalEats Client account trust repair — 2026-11-06

**Draft/Preview-only, stacked on Client PR #60. Do not deploy, merge, activate ordering, modify Firebase rules, or write live data.** The original logged-in Profile, ShopCards, pickup cart and pay-at-shop policy remain unchanged.

## Issues corrected in source

1. Real Firebase sign-out replaces Settings' fake Splash-only logout; Profile logout uses the same function. On confirmed sign-out the Client clears sensitive in-memory state and local device cache (profile, orders, favorites, notifications, pending reviews, saved card displays, addresses, legacy queues). Logout failure displays an error and retains the session.
2. A guest or anonymous Firebase identity tapping the persistent bottom Profile tab routes immediately to existing Login, consistently with Home/Settings and existing PR #60.
3. The app starts without exposing a cached previous user's profile or favorites; private data is written to local cache only for a matching registered Firebase user. Direct A→B account switches clear sensitive caches. Settings renders generic guest details and no longer infers merchant/admin authority from cached `userProfile.role`. Staff links require verified backend claims (not implemented/activated here).
4. Favorites require an authenticated, non-anonymous matching UID. React favorite status changes only after an awaited Firestore write; failed writes report failure instead of pretending success. This does **not** certify Firestore rules in live databases.
5. Pickup history/tracking and private push token subscription use matching, registered account identity, not just an anonymous Firebase UID.
6. Help & Support no longer marks a failed Firestore submission as received; errors retain the message form. Firestore delivery is still dependent on the live security rules and backend; no claim of guaranteed support delivery.
7. Explicit profile saves now count as saved only if the API returns HTTP 2xx JSON with `success:true` and a persisted `profile.user_id` matching the active account. Offline drafts and failed retries return an error/pending status, not success. Direct Firestore profile mirroring is removed. Background profile auto-save and schema-error fallback are removed so they cannot silently overwrite data or fabricate a receipt. Profile-photo save/delete await the account update.
8. Storefront review submissions require a real account and remain unavailable until a secure, order-verified review API exists; the old OrderRating path no longer reports fake success from a mock Supabase facade. Rider ratings remain deferred with delivery.

## Explicit release limitations

This patch **does not create or authenticate a secure profile API**. The working profile API route, database permissions and full two-account hosted read-after-write test remain unresolved in Client P0 PR #31. Firestore default/named deployed security rules are unverified; review-only PR #42 remains separate. Browser tests for guest, registered account, A→B switch, logout, offline, failed network and realistic order history still require a safe staging environment. Frontend guards alone never establish database authorization.

Use `npm run test:account-trust`, `npm run test:guest-profile-guard`, `npm run test:pickup-integration`, `npm run lint`, `npm run build`. The account trust tests combine pure identity/receipt checks with targeted source-contract checks; they do **not** emulate network persistence or prove live endpoint security.

No real customer profiles, shops, orders, payments, notifications or security rules were changed.
