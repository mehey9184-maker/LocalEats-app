# LocalEats Client account browser acceptance — November 6, 2026

## Scope

This is actual Chromium browser QA using the local Vite Client app, not a Vercel deployment. The isolated Auth and Firestore emulators use only Firebase project demo-localeats-browser-qa, with Auth on 127.0.0.1:9099, Firestore on 127.0.0.1:8080, and Vite at 127.0.0.1:4174. Pickup ordering is OFF.

The emulator wiring is development-only and requires an exact demo project ID, local browser hostname and default Firestore DB. It throws on mismatch. All browser requests to non-loopback hosts are aborted, and requests to local /api/* receive an intentional 503. NO real Firebase, Supabase, orders, profile writes, payments, or Production are tested or changed.

## Browser checks

Guest Splash > Explore as Guest > bottom Profile > existing Login; no editable profile or profile/order API write. Two synthetic Auth emulator accounts sign in through the actual Login form. Registered customers see the original Profile editor, logout revokes the Auth session and guest Profile reopens Login, and account B does not display account A email. Offline and unavailable-backend profile saving must not claim success.

## Local repeat (Node 22, Java 21)

```sh
npm ci
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium --with-deps
npx --yes firebase-tools@15.34.2 emulators:exec --project demo-localeats-browser-qa --only auth,firestore "npx playwright test --config tests/browser-qa/playwright.config.mjs"
```

GitHub Actions stores failed-run screenshots, video and traces for seven days.

## Release gates that this does NOT resolve

Actual hosted two-account profile persistence, secure profile API, deployed Firestore rules and Firebase named-database mapping, safe Merchant API behavior, browser visual review on real devices, and end-to-end order reliability remain blocked and require separately reviewed evidence. Do not merge PR #61 or activate live ordering based only on emulator browser QA.
