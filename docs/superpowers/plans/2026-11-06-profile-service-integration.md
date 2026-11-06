# Customer central profile integration plan

Owner objective: preserve the original UI while making guest/login/registration/profile/save/logout/relogin truthful, durable and account-isolated. Production writes remain disabled.

Architecture: use VITE_LOCALEATS_API_URL and the existing central /api/v1/profiles/me endpoint with Firebase authentication. Retain Supabase profiles. Remove direct frontend profile database reads and same-origin fallback routes. Never deploy a CLI owner's credential. Preserve current PR #61 identity-object and generation guards.

Verified baseline:
- Customer account head445244dfa6485506bb2552ce5f727c3354a1893c: all11 CI checks passed; PR #61 remains draft.
- Dashboard main advanced to bd8b741 with central profile API #70 and isolated security-draft tests #71/#72. No security SQL was applied by this phase.
- Dashboard draft #75, head67226112e1ae708e7290b9270fc1cea96f1d9878: staging-only revision protocol at the canonical endpoint, 167 API tests passed, independent review approved for draft, both exact-head CI jobs passed. No Preview deployed.
- Owner-approved production column-only inspection confirms Firebase-compatible text user_id and existing timestamp/field types. No account rows or database changes.
- Staging server secrets were not identified in four Vercel projects/local candidate configs. Existing CLI Firebase login supports local synthetic authentication verification. The archived Firestore experiment is not proof of final Supabase persistence.

Tasks:
- [x] Inspect main/PRs and retain existing central API/store instead of publishing a second API or Firestore profile authority.
- [x] Archive and remove copied same-origin API prototype files, rewrites and runtime-only Firebase Admin/jose dependency changes. Retain separately useful locked Playwright runner work for later verification.
- [x] Add a central profile client with bounded auth/request/JSON processing, strict owner/receipt/revision checks, and identity guards after every await. Eighteen tests pass, including an independently reproduced same-UID save trampoline race fixed before integration.
- [ ] Use that client exclusively in App profile reads, preserving current generation/state guards and honest missing/unavailable states. Do not auto-create a profile after a failed read.
- [ ] Save only requested allowed fields; do not replace omitted fields with blank defaults. Use the original verified backend revision. Confirm success only from the backend profile receipt and use its actual fields.
- [ ] Bind queued retries to their original revision and account identity. Never refresh a revision and blindly apply an old draft. Legacy unversioned queued writes need manual review, not automatic replay. Stale conflicts preserve draft/recovery and show an honest error.
- [ ] Verify profile coordinates, registration, save, reload, logout/relogin, account switching and failures on desktop/mobile; retain all current account/startup/catalog/pickup tests.
- [ ] Configure appropriate isolated hosted staging identities/credentials only through authorized secure channels. Perform real Firebase+Supabase two-account persistence, UID uniqueness/timestamp/bypass tests and hosted Preview acceptance. Do not substitute emulators/SDK mocks for this gate.
- [ ] Independent complete-integration review, relevant CI and owner/protection-rule approval before merge. Production profile activation/security changes remain separate.

Execution ledger:
- The earlier same-origin P0 and Firestore experiments were superseded after refreshing authoritative main and checking the approved production schema. Their positive checks are retained only as historical evidence for those experiments.
- PATCH protocol in draft #75 accepts profile and expectedRevision (exact backend updated_at or null for create). Conditional UID+revision update or insert-only creation prevents stale overwrites. A retry can confirm already-persisted requested state without a new mutation; this is not a durable command-ID guarantee.
- Main startup experience and customer identity fixes must remain intact. No redesign, production SQL changes, live orders, payments or rider activation.
- Read phase implemented privately: App uses the central reader, retains generation/state-commit guards, clears explicit null fields, preserves zero coordinates and strips legacy privileges. User-facing load/error/retry presentation is still pending with the forms, so the read task is not marked fully complete. Ninety-eight combined regressions and 74 existing baseline cases passed; 14 demo browser cases passed with synthetic central reads and all writes rejected. Independent reviewer passed the client/hydration cases and approved the final favorites-state correction.
- Review reproduced an indirect write: hydration changed favorites and triggered the old autosync effect. An initial ref tag was unsafe under React StrictMode; a replay regression reproduced a lost explicit save. Final design stores favorites and explicit intent atomically in pure React state, with effect-only deduplication. Hydration/account resets never establish intent.
- Next phase must carry verified edit basis into Profile/Complete Profile, saved-photo callbacks, registration and queued retries. Avoid obtaining a fresh revision and blindly applying an old draft. Investigate composed late Login metadata versus a completed API read; current identity-only checks do not establish which display source is newer. Also audit ProfileScreen's remaining required delivery-address check against pickup's optional location policy.
- Existing follow/unfollow acknowledgement remains separate from the legacy profile-favorites mirror until the write migration. Do not claim cross-session favorite persistence from these read tests. All original full-goal launch/security/Preview/capacity gates remain active.
