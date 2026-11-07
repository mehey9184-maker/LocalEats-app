# Pickup Firestore rules review

Production source was rechecked at 2026-11-07 03:56 UTC. The active release still references `571cccb1-5473-42a6-a952-2adff8f52418`, with source SHA-256 `ed2ea3db7dd7f896b25b91573b2d1ccd472656f477739329383cb1906aee3496`.

The review candidate `production-pickup-rules-narrow-REVIEW_ONLY.rules` has SHA-256 `72b9d3c49017975d7410afcfa4f3a487f186543e274689399e3e9531b79a04f7`. It removes browser rider-profile reads and the rider-pool order exception. Protected order fields use affected-key checks so additions, changes and removals are blocked. Assigned-rider order reads, participant access, and other legacy write permissions remain in scope for separate review.

Independent source review found no blocker to a separate draft from PR #73. The expanded localhost emulator run passed 25 checks. It covers Customer UID queries, Merchant mixed numeric/string shop queries, assigned Rider queries, missing rider IDs, rider profile list and IN queries, protected financial fields, and existing catalog reads. The run used synthetic fixtures and the exact candidate rules.

Before a production request, confirm no supported deployed client requires rider-profile browser reads or rider-pool queries. Recheck the named live release fingerprint immediately before the approved change. Retain the exact saved source and ruleset reference for rollback review. The candidate is not wired into firebase.json. Deployment and rollback both require a separate owner decision. The wider rules migration, production Supabase permissions and hosted pickup acceptance remain separate release gates.

With the locked dependencies installed and a Firebase CLI plus Java 21 available, run from the repository root.

```sh
firebase emulators:exec --project demo-localeats-rules-diff --only firestore --config security/review/firebase.emulator.json "node security/review/check-narrow-pickup-rules.cjs"
```
