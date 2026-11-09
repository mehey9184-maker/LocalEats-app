# LocalEats C1C — Customer Firebase identity privacy hardening

**Date:** 9 November 2026  
**Scope:** Unmerged Customer Preview draft, stacked on C1B draft PR #88. No Production, merchant, SQL, payment, or live-order changes.

## Why this was necessary

The owner tested two disposable staging users (`tester` and `tester2`) in the same browser and manually passed login, sign-out, switch to another user and switch back. The owner had not completed network/console acceptance.

Read-only inspection found two unsafe patterns that needed correction before sign-off:

1. A legacy startup path copied a Firebase ID token from a restored in-memory session to `localStorage["remember_me_secure_token"]`. This key is **not** an authentication authority; Firebase manages the actual session. Old staging builds may have left copies in browsers.
2. An asynchronous profile lookup fetched Firestore or a legacy profile HTTP route and later merged the result into the current UI without checking whether the active Firebase UID still owned that request. Its prior-state fallback could carry data across accounts.

These are grounded source-code concerns, **not** observed customer-account leaks or proof that a valid B token could access A's server-side data.

## Changes

- `src/services/customerProfileIsolation.ts` holds pure identity-ownership matching and an account-scoped blank profile base, preventing inheritance of private profile fields across UIDs.
- `src/App.tsx` checks the currently signed-in Firebase UID **before and after** every profile request's awaited steps, before React state commits, before favorites updates, and when scheduling/re-running retries.
- Any profile record that explicitly claims a different `user_id` or `id` is ignored.
- A profile read for A cannot update the UI after Firebase switches to B; A's phone/address/avatar are not fallback defaults for B.
- Firebase bootstrap checks its restored UID before session validation, after validation, and before state hydration. The staging branch clears cached cart, favorites, notifications and orders on identity mismatch; staging sign-out clears cached private state immediately.
- The legacy remember-me value is now only a noncredential `"true"` hint in non-staging builds (without treating it as a real login). Strict staging **removes** the legacy key and never writes it, clearing previous versions' duplicated ID token if present.
- Original Customer UI, the ShopCards, four-kilometre catalogue, cart animations, 10-second Review Pickup Order, read-only write gates and API URLs are unchanged.

## Isolated verification

On branch commit `07e5a000dfeb92351c5b09457f169096d910475a` prior to this documentation-only commit:

| Test | Result |
| --- | --- |
| New C1C synthetic account switching, private field reset, source ownership guards, no extra token storage | **5/5 passed** |
| Retained C1B auto-write shield + R5.2T order review | **9/9 passed** |
| Existing Customer auth recovery, Firebase staging config and startup routing | **30/30 passed** |
| Pickup integration regressions | **8/8 passed** |
| TypeScript type checking (`npm run lint`) and full Customer build | **passed** |

Tests deliberately used no real Firebase identity, external secrets, SQL migration, or live-order endpoint. A synthetic delayed profile result returning after the active UID changes was blocked.

## Remaining acceptance and limitations

- Browser login with `tester` and `tester2` must be repeated on the NEW C1C staging Preview. A screenshot/Network log with password/Authorization headers redacted should show no unexpected `POST` profile-write, Firestore profile mirror or push-token registration.
- The user must check that an in-flight A profile read does not repaint A's phone/name/photo on B, including browser refresh and a slow-network simulation if practical.
- Server tests with invalid/missing token returning HTTP 401 were completed during C1B but do **not** prove hosted A/B access isolation when legitimate tokens are supplied.
- This change targets the two specified issues and automatic login-side write paths. It does not authorize creating account fixtures, changing Firebase test user disable/revoke status, migrating order tables, or enabling other legacy Firestore writes.
- Preserve final owner sign-off of C1B/C1C until browser acceptance and any hosted identity validation authorized separately.

**Decision:** automated C1C code safeguards pass; staging deployment and owner manual acceptance remain separate gates. No Production changes or Git merge.
