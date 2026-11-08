# R5.2C — Firebase Customer Staging Web Config Received (owner screenshot)

**8 November 2026. Owner-created Firebase console setup. Draft-documentation only.**

Evidence provided in the current conversation shows:
- Firebase project name: LocalEats Staging
- Project ID: `localeats-staging` (different from known bundled Customer Firebase `localeats-5e26e`)
- Spark no-cost plan displayed
- Registered Web app: LocalEats Customer Staging
- Email/Password sign-in provider enabled
- Cloud Firestore database `(default)` created
- Firestore Rules editor shows `rules_version = '2'` and recursive `allow read, write: if false;`
- Staging Firebase SDK config visible in owner screenshot; project ID, `localeats-staging.firebaseapp.com` auth domain, `localeats-staging.firebasestorage.app` storage bucket and sender ID `805045126244` are mutually consistent at a metadata level.

**No API key, service account, Firebase private key, user email, or other credential has been copied into this repository.** The web app ID and API key should be copied directly from the owner's Firebase Web app settings to a *separately verified* Customer staging-only Vercel environment when explicitly approved. The Firebase Web config API key is a client identifier, **not** a Firebase Admin private key. Do not place Admin private keys in any `VITE_*` value.

## Future Customer staging environment mapping — no Vercel writes have happened

```dotenv
VITE_FIREBASE_CONFIG_SOURCE=environment
VITE_FIREBASE_PROJECT_ID=localeats-staging
VITE_FIREBASE_AUTH_DOMAIN=localeats-staging.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=localeats-staging.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=805045126244
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
VITE_FIREBASE_API_KEY=<get directly from Firebase staging console>
VITE_FIREBASE_APP_ID=<get directly from Firebase staging console>
VITE_LOCALEATS_API_URL=<dedicated, verified HTTPS staging API URL>
VITE_PICKUP_ORDERING_ENABLED=false
```

All entries must be scoped to **dedicated nonproduction Vercel projects** (preferred) or completely isolated exact-branch Preview overrides; never rely on the existing shared Preview/Production variable defaults. The staging app must connect to an API whose Admin SDK verifies tokens issued by `localeats-staging`, with separate staged Supabase database and no real customer/shop/order records.

**Important limits:** Firebase project presence and deny-all Firestore browser rules do not prove entire Customer UI works on staging. Under these rules, direct client Firestore reads will be denied as intended; shop/menu/profile flows may need an approved read-only API or synthetic staging data model. Authentication setup does not mean Auth test users exist, nor that any browser re-login/revocation test was done. Firestore database location and any Vercel deployment are not verified from the owner's screenshots.

Next: independently establish Customer/API staging-only Vercel configuration, staged backend identity/DB, exact PR preview commit and synthetic-only test authorization before hosted token tests. Preserve Customer original UI and draft PR #82 unmerged. No Production, real orders, payment, Rewards, LocalPay or data writes.
