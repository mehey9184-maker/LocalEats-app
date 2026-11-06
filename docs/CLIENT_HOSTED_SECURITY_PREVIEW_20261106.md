# LocalEats Client — secure hosted Preview (2026-11-06)
  
## Purpose
This isolated Preview includes the tested guest/account fixes from draft PR #61 and *copies only* the staging-only profile API route and its server security helpers from blocked P0 draft PR #31. It is a REVIEW branch, not a merge of either draft PR.

## Safety limits
- Production deployment is explicitly rejected during the build.
- A Preview build fails unless branch-scoped Vercel variables exactly match the isolated, **nonexistent Firebase test project** and `https://example.invalid` read-only API endpoint.
- **No real Firebase test project credentials exist yet**, so registered-account sign-in and real authenticated profile read/write are deliberately unavailable on this hosted Preview. Local browser acceptance (Firebase emulators) is already 7/7.
- Profile API GET without a valid token returns JSON 401; signed-looking requests return 503 until the independently provisioned staging Firebase test project and dedicated credentials exist. Profile writes remain OFF.
- All pickup order writes remain disabled. Delivery, rider app and billing remain disabled. No real customer/shop/order data are touched.
- No Production aliases, Firebase rules, SQL or main branch changes.

## Required work before authenticating on hosted Preview
Provision a **separate Firebase test project**, add two disposable Firebase test accounts and Vite public Firebase test configuration; replace dummy branch-scoped Preview values through a separately reviewed safety-gate update and adjust the exact-match build guard. Add only server-side **test** Firebase Admin credentials, and staging Supabase secret, in branch-scoped *Preview secret* environment variables. Turn on staging reads only after cross-account authorization is inspected; keep writes OFF until a specific, separately authorized dummy-only write test. Do not use the real `localeats-5e26e` project or live Supabase secrets.

## Real release blockers
The actually deployed Firestore Security Rules for the Client and Merchant named database still require read-only authorized Firebase administration inspection. The repo's `main` rules include many `allow read, write: if true` entries; PR #42 rules are only an emulator-tested draft and are not deployed. Source code and staging Supabase RLS inspection **do not prove** deployed Firestore security. Production profile API is not live; this Preview API refuses Production.

## Verification
`npm ci && npm run test:security-preview && npm run test:guest-profile-guard && npm run test:account-trust && npm run test:pickup-integration && npm run lint && npm run build`. Verify Vercel deployment target `preview`, exact Git SHA, no Production aliases, and the negative JSON profile route; owner reviews guest UI only in hosted Preview until isolated Firebase test credentials exist.
