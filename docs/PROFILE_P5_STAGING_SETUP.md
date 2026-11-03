# LocalEats — Profile P5 Staging Setup (no production changes)

**State:** prepared only. No staging Supabase project, staging Firebase project, API keys, test users, SQL migrations or writes have been created by this PR.

## Why a separate environment
The connected LocalEats Supabase project is `phdjumtqkooyppxozqsi` in the **Free** organization `A.C.E Org`. It is the existing LocalEats project and is **not** a staging database. The connected project's `public.profiles` table was inspected read-only and has a text `user_id` primary key, camel-case `fullName`, `email`, `phone`, `city`, `address`, `country`, `role`, `photo_url`, `language`, `latitude`, `longitude`, `favorites` and `updated_at` fields. No user records were accessed.

The Firebase project named in the current P4 protection check is `localeats-5e26e`; never reuse it for staging authentication. Firebase connection must be explicitly enabled to provision a different test project. **Do not create a new project until the owner chooses a Supabase organization and receives/accepts the project-specific cost quote.** Being on the Free tier does not by itself guarantee a second project will be free.

## Provisioning steps after approval
1. Quote a new Supabase project in the owner-chosen organization and proceed only if the quoted cost is acceptable. Name it `LocalEats-Profile-Staging`, choose the nearest practical region, and confirm its project reference is **not** `phdjumtqkooyppxozqsi`.
2. Provision a distinct Firebase Authentication test project through the Firebase connection (or its console); record only its project ID and Web API key in protected Vercel Preview configuration. Create two dummy users A and B. Do not copy real LocalEats users, contact information, credentials or phone numbers.
3. In the new staging database only, create the minimal `public.profiles` schema compatible with the read-only column list above. Validate primary key and `role` protections. Run database advisors. Do not apply the legacy production `schema.sql` blindly. Keep all data fictitious.
4. Configure these P5 **branch-scoped Preview-only** Vercel environment variables; never in Production targets or committed files:
   - `PROFILE_P5_STAGING_SUPABASE_REF` — the new project reference
   - `PROFILE_P5_STAGING_SUPABASE_URL` — exact `https://<new-ref>.supabase.co` URL
   - `PROFILE_P5_STAGING_SUPABASE_SECRET_KEY` — new staging-only server secret, never sent to browsers
   - `PROFILE_P5_STAGING_FIREBASE_PROJECT_ID` — different project from production Firebase
   - `PROFILE_P5_STAGING_FIREBASE_WEB_API_KEY` — Web API key from that same staging Firebase project, used for project-specific REST token validation
   - `PROFILE_P5_STAGING_FIREBASE_WEB_API_KEY` — Web API key for that staging Firebase project
   - `PROFILE_P5_ENABLE_STAGING_WRITES` — leave unset/false until initial isolated smoke succeeds; then set `true` only for `repair/customer-profile-p5-staging-auth-readiness-01`
5. The dedicated Vercel functions validate `VERCEL_ENV=preview` and exact branch name automatically. They return JSON 503 when disabled; do not try to reuse `SUPABASE_SERVICE_ROLE_KEY` or generic production settings.
6. With **dummy user tokens only**, execute the manual integration smoke script `node scripts/profile-p5-staging-smoke.mjs` after supplying the script-specific environment variables. It denies non-Preview hostnames and refuses to run without explicit confirmation. Verify A cannot GET or POST B's account; verify real read-after-write; verify client-provided admin role/email cannot be stored; verify B's own information is protected. Never print tokens in console output or CI logs.
7. Before merging anything, re-run P1/P2 Customer UI tests against a combined Preview branch with the P3/P4/P5 API and verify account refresh, login/logout, save error/offline, role invariance, phone normalization, and separate test users on phones. Keep real ordering off. No Production release without owner's approval.

## Tested status (2026-11-03)
- P4 earlier Preview `dpl_23dkhybBiMExoJ5hjoftKgus4BSa` returned JSON 405 on `GET /api/profiles`, JSON 503 on disabled `GET /api/profiles/p4-smoke-test`, HTML 200 for `/profile` and 404 for unknown APIs.
- P5 adds a Firebase Authentication REST `accounts:lookup` verification step bound to the dedicated **staging** Firebase Web API key. This avoids a missing `firebase-admin` dependency in P4; it must still be validated against real staging Firebase accounts before any release. Bad, disabled, revoked or other-project tokens fail closed.
- Existing production Supabase security advisors reported some privileged functions executable via the public API. Those are separate legacy production security-review findings; do not apply unreviewed SQL patches during P5. See <https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable>.

**Nothing in this guide authorizes a billable project, production environment mutation, real data access, or actual profile writes.**
