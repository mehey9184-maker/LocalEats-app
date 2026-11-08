# LocalEats R5.2D — Isolated Customer Vercel staging project

**8 November 2026. Real Vercel project created; preview deployment intentionally NOT initiated.**

Owner-approved staging-only project `localeats-customer-staging-r52d` was created in the owner's Vercel Hobby team `mehey9184-makers-projects` using the Vercel project integration. Project ID: `prj_F4szeGF8BxmYpdUVA2yLYrjAmMUN`. Framework: Vite. Git repository is **NOT linked**, automatic Preview deployments are disabled, domains are empty, deployment history returned zero records, and Vercel deployment protection was reported enabled.

Customer Preview-only variables configured in the **new isolated project only**:
- `VITE_FIREBASE_CONFIG_SOURCE=environment` (strict config, no Production fallback)
- `VITE_FIREBASE_PROJECT_ID=localeats-staging`
- `VITE_FIREBASE_AUTH_DOMAIN=localeats-staging.firebaseapp.com`
- `VITE_FIREBASE_STORAGE_BUCKET=localeats-staging.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=805045126244`
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)`
- Firebase Web `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` taken from owner's Firebase console Web app screenshot and installed directly into **staging-only Vercel Preview settings**, **not stored in GitHub**.
- `VITE_PICKUP_ORDERING_ENABLED=false`, `VITE_PROFILE_WRITES_ENABLED=false`, `REWARDS_ACTIVATION_ENABLED=false`, `LOCALPAY_LIVE_WALLET_ENABLED=false`.

`VITE_LOCALEATS_API_URL` is **NOT SET**; no safe, independently configured staging HTTPS API deployment exists. Do NOT connect this new staging project to Git or deploy the current Customer App until the new API project is fully isolated, the Supabase staging order schema is reviewed/applied with separate approval, and staging Firebase Admin credentials are safely installed server-side.

The new separate API project is `localeats-api-staging-r52d`, ID `prj_eroDrVcFOPlvRJzjCU7vbwGnleFT`; its Preview-only `FIREBASE_PROJECT_ID` matches `localeats-staging`, and its Supabase URL points to existing Profile-Staging. API Firebase Admin private key/client email and Supabase service-role key are **intentionally absent**, and no API deployment is live.

The old live Vercel projects `project-x7cvt` and `localeats-api` were not changed. The existing Customer draft PR #82 remains draft/unmerged; original UI/UX, shop discovery, menu, payment-at-shop pilot and all write protections remain unchanged.

**Still blocked:** real hosted login/revocation/relogin/disabled-account browser tests; User A/B history isolation; direct Firestore client reads (currently deny-all by staging rules); Customer shop/menu API; staging database orders. See full API canonical handover `docs/R52D_DEDICATED_VERCEL_CUSTOMER_API_SHELLS_20261108.md` in Merchant/API PR #124.
