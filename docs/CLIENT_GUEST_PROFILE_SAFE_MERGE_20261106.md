# LocalEats Client — Narrow guest Profile navigation release

**Prepared November 6, 2026.** This small patch is independent of the much larger draft account-trust PR #61.

## Verified current-main defect
The Customer `main` Home and Settings Profile callbacks, Login Success Profile callback and incomplete-profile flows navigated directly to an editable Profile screen, even for an anonymous guest. A guest must instead be sent straight to the existing Login screen.

## Minimal change
- Read the active Firebase identity and current session owner before opening `profile` or `complete-profile`.
- Anonymous/signed-out/mismatched visitors go directly to Login. The actual Profile and Complete Profile editor cannot render without a matching registered account.
- No new screen, visual redesign, profile data write, sign-out change, Firebase or Supabase rules, API endpoint, order submission, delivery or Rider App code.
- A temporary session restoration mismatch hides the editor rather than displaying cached private data.
- Static and behavior tests cover guests, identity switch, matching account, protected navigation and pickup guard. Existing Customer baseline tests and build run independently.

## Remaining blocked work
**Client PR #61** (full account isolation, real logout and truthful profile saves) remains draft. Its tests pass, but positive **hosted two-account profile read-after-write**, backend policy/security verification and browser acceptance remain outstanding; this narrow merge does *not* claim to fix those. The default or named Firestore rules must be independently audited before real customers.

Merging this restricted UI navigation fix to `main` may automatically deploy through Vercel. Verify the Production `VITE_PICKUP_ORDERING_ENABLED=false` before merge and the production build after merge. No real order activation. No delivery/riders for at least six-plus months of genuine pickup usage.
