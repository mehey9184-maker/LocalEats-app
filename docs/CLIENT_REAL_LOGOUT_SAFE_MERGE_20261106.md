# LocalEats — small real sign-out repair

**November 6, 2026.** Independent of Client PR #61's much larger account API and persistence work.

## Verified Main issue

Customer Settings had `onLogout={() => setCurrentScreen("splash")}`, which looked like logout but left the Firebase authentication session active. Profile performed a Firebase sign-out through the adapter but ignored its reported error and proceeded to clear the screen, which could also misrepresent a failed logout.

## Narrow fix

Both existing Sign Out buttons call the same handler. It awaits the existing Firebase-backed `supabase.auth.signOut()`. On error/rejection it reports failure and keeps the session. Only after success does it reset session/profile/cart/favorites/orders/notifications and remove stale local private data from device storage, then return to Splash. No new login UI or redesign.

## Tests and limits

The PR adds source-contract tests confirming both routes use one handler, actual Firebase sign-out, error handling, ordering and private-state cleanup. CI also builds the Customer app and runs original pickup regressions. It does **not** establish hosted identity/session persistence across multiple real devices or a positive profile save, and is not a replacement for the unmerged comprehensive account PR #61. No Firebase rules, API, production records, order activation, payments, riders or delivery code is changed.

Owner requested safe merges. Before production merge, verify the exact five-file diff, green CI, unchanged Client `VITE_PICKUP_ORDERING_ENABLED=false`, and confirm Vercel Production READY afterward.
