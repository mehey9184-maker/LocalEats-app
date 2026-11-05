# Customer P0 — Staging-only profile acceptance (November 2026)

**Release status: STOP.** This guide covers the **Client App project only** and must not change the Merchant/Rider/API repositories or any existing Production database records.

## Verified conditions
- Client sign-in is Firebase Auth. The \`supabase.auth\` facade returns a Firebase ID token, so the Client's same-origin profile function validates Firebase credentials, not Supabase user sessions.
- Independent Supabase staging project: \`LocalEats-Profile-Staging\`, reference \`rgpbdajhlrwfmhopzgzk\`, in \`eu-west-1\`. Its \`public.profiles\` schema is present with RLS.
- Current Client P0 Vercel Preview has **no branch-scoped staging server credentials**. The function therefore fails closed; it must not use the existing live Firebase or Supabase project.
- The Client repository's \`firestore.rules\` includes broad public rules such as \`allow read, write: if true\` for profiles, orders and other collections. **Live deployment of those rules was not verified. Do not deploy them or use direct Firestore for profile persistence as a workaround.**
- Profile writes stay OFF by default. Pickup order writes stay OFF.

## Necessary isolated configuration (no Production secrets)
Create a **separate Firebase testing project**, not \`localeats-5e26e\`, with two dummy email/password accounts. The Firebase plugin may not expose Firebase management actions in this session; do not substitute live Firebase accounts or ask anyone to paste ID tokens in chat.

On the **Client Vercel project**, configure these names for Preview **branch \`repair/customer-prod-readiness-p0-20261103\` only**:

| Variable | Value / intended source |
|---|---|
| \`PROFILE_API_STAGING_ENABLED\` | \`true\` to permit Preview-only staging reads once all credentials exist |
| \`PROFILE_API_STAGING_SUPABASE_REF\` | \`rgpbdajhlrwfmhopzgzk\` |
| \`PROFILE_API_STAGING_SUPABASE_URL\` | \`https://rgpbdajhlrwfmhopzgzk.supabase.co\` |
| \`PROFILE_API_STAGING_SUPABASE_SECRET_KEY\` | Staging project server-only service/secret key, **sensitive** |
| \`PROFILE_API_STAGING_FIREBASE_PROJECT_ID\` | New, distinct Firebase **test** project ID |
| \`PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL\` | Test Firebase Admin service-account email, server-only |
| \`PROFILE_API_STAGING_FIREBASE_PRIVATE_KEY\` | Test Firebase Admin private key, **sensitive**, server-only |
| \`PROFILE_API_STAGING_WRITES_ENABLED\` | **\`false\`** until explicit dummy-account write test authorization; initially unset |
| \`VITE_FIREBASE_PROJECT_ID\` and all required \`VITE_FIREBASE_*\` app config | **Test Firebase web app** config, Preview branch only; never a private Admin key |

The Client code requires \`VERCEL_ENV=preview\`, exact staging Supabase URL/reference and a Firebase project **different** from \`localeats-5e26e\`. Any missing/mismatched configuration returns 503 to signed-in calls. The code refuses Production access entirely even if credentials are mistakenly present.

**Do not** set \`VITE_*\` for Admin secrets, configure a Production target, reuse the Production Supabase key, or enable order writes. The Browser must receive only public Firebase Web SDK configuration.

## Acceptance process
1. Set up two dummy accounts **A** and **B** only in the test Firebase project. Set Preview-only client and server variables, with \`PROFILE_API_STAGING_WRITES_ENABLED\` unset/false.
2. Deploy the exact Client P0 Preview branch. Verify unsigned \`GET /api/profiles/A\` returns 401 JSON; signed A reading B returns 403; signed A and B reading own profiles return 404 (not yet created) or 200 for their own prior staging rows. Use the guarded script below with short-lived staging tokens from a secure local/CI secret store.
3. After explicit authorization for staging dummy writes only, set the dedicated Preview-only write gate to \`true\`, rerun the two-account script with \`P0_EXECUTE_STAGING_WRITES=YES_STAGING_ONLY\`; it checks own-account write/read, unauthorized write denial, role stripping, and that B remains unchanged.
4. Verify UI profile save, reload, sign-out, account switch and offline error messaging on desktop and mobile, while preserving the original shop cards and Home layout.
5. Read **deployed** Firestore rules through an authorized Firebase administration connection. Do not claim success from the checked-in rules; block Production if an anonymous public user can read/write private profiles, orders, messages, financial or rider data.
6. Review the Production profile service plan separately; this P0 function intentionally refuses Production and must not be merged as a live release.

Guarded script: \`scripts/customer-p0-staging-profile-smoke.mjs\`. Supply only secret-store environment variables \`P0_CUSTOMER_PREVIEW_URL\`, \`P0_TEST_UID_A\`, \`P0_TEST_UID_B\`, \`P0_TEST_FIREBASE_TOKEN_A\`, \`P0_TEST_FIREBASE_TOKEN_B\`. All GET checks are read-only by default. Do not paste tokens or private keys in a PR, issue, chat message or screenshot.

**Blocked until:** staging Firebase project/credentials, both dummy tokens, live Firestore rules visibility, and signed-in browser acceptance are available. Do not merge PR #31 to \`main\` or change live Customer domains.

## Profile staging verification update — 2026-11-05

The API now requires the Preview browser's VITE_FIREBASE_PROJECT_ID to equal PROFILE_API_STAGING_FIREBASE_PROJECT_ID, and the Admin service-account email must belong to that exact isolated Firebase testing project. Branch-local VITE_FIREBASE_PROJECT_ID must override the shared Preview Firebase configuration; otherwise the API intentionally returns 503 and must NOT silently fall back to live Firebase Auth. Never use Production Firebase credentials or the Production Supabase service key.

The staging profile form now rejects fullName longer than 120 and language longer than 12 characters, matching the existing Supabase table. A save is only acknowledged if the API returns HTTP 2xx, application/json, success=true and a profile.user_id matching the current account. Any failure retains local drafts without claiming server persistence.

These are code-level safeguards, not final staging acceptance: separate Firebase test credentials, two dummy accounts, signed-in read-after-write/cross-account tests, deployed Firestore rule review and browser validation are still required. Keep PROFILE_API_STAGING_WRITES_ENABLED and all pickup order write gates OFF unless separately authorized.
