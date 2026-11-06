# LocalEats — Confirm profile saves before saying Saved (Preview acceptance)

2026-11-06: Isolated security/reliability change. This is a necessary step for launch, but not a complete hosted profile system.

## Current main defects
- The original `profileService` returned `error:null` and a `cached:true` value when offline, when a write failed and was only queued, or when a retry was merely scheduled. The UI interpreted these as confirmed server saves.
- It wrote profile fields to direct Firebase Firestore mirrors independent of the API, including a browser-supplied `role`. That conflicted with the single server authority and permitted cross-account queued writes after sign-out.
- `handleUpdateProfile` rendered modified state before receiving a durable API receipt, and invoked callbacks even for guest or unsuccessful background saves.

## Proposed verified behavior
The patch copies the small, tested profile write implementation from separately reviewed Client draft PR #61, not the remainder of that broader PR.
- A registered Firebase identity must match the user ID before reading local profile cache, retrying or POSTing.
- An account switch while a save is in progress must not save or display the previous user's profile.
- HTTP must respond with successful JSON containing `{success:true,profile:{user_id:theSameUser}}` for a save to count. HTML pages, cache-only, 503, missing receipts and cross-user receipts all fail.
- Direct Firestore profile mirror is removed; only server-authoritative API persistence can claim success.
- Offline edits can be kept as drafts for that user but must **not** claim to be saved in the cloud.
- The UI updates user profile state only after a confirmed saved response and only while the matching account is still active.

## Acceptance still missing
The existing public Vercel Client deployment may not currently route `/api/profiles` to the real Express handler. CI mocks verify logic, not actual persisted hosted records. A controlled, Firebase-authenticated, two-account Browser/HTTP test against staging profile storage must pass before enabling first customer signup/order workflows.

The copied code is **Preview-only until manual acceptance**: some users will now receive honest save failures rather than previously misleading success. No Production database writes, schema migrations, rider/delivery, payments or order activation occur as part of this review.
