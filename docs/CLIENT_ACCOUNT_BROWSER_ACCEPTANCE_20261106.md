# LocalEats Client account browser acceptance — November 6, 2026

## Scope

This is actual Chromium browser QA using the local Vite Client app, not a Vercel deployment. The isolated Auth and Firestore emulators use only Firebase project demo-localeats-browser-qa, with Auth on 127.0.0.1:9099, Firestore on 127.0.0.1:8080, and Vite at 127.0.0.1:4174. Pickup ordering is OFF.

The emulator wiring is development-only and requires an exact demo project ID, local browser hostname and default Firestore DB. It throws on mismatch. All browser requests to non-loopback hosts are aborted. Synthetic central profile GETs verify the local Auth emulator identity and project the seeded local profile fixture into the central API response shape. All API mutations and other local /api/* calls receive an intentional 503. No real Firebase, hosted Supabase, orders, profile writes, payments or Production are tested or changed.

## Browser checks

Guest Splash > Explore as Guest > bottom Profile > existing Login; no editable profile or profile/order API write. Two synthetic Auth emulator accounts sign in through the actual Login form. Registered customers see the original Profile editor, logout revokes the Auth session and guest Profile reopens Login, and account B does not display account A email. Offline and unavailable-backend profile saving must not claim success.

The current registered-profile case seeds a nonempty favorites list, verifies the central-reader name is displayed, and asserts that hydration sends no POST/PATCH. The latest read-integration run passed all 14 desktop/mobile cases in 1.2 minutes using locked dependencies. The local runtime used existing workspace Java21 and emulator cache with a separate workspace CLI configuration; the initial system Java8/cache-permission failures happened before app tests and were not product failures. Emulator/Vite processes exited and their ports closed after verification. This is not positive hosted profile-save evidence.

## Local repeat (Node 22, Java 21)

```sh
npm ci
npx playwright install chromium --with-deps
npx --yes firebase-tools@15.34.2 emulators:exec --project demo-localeats-browser-qa --only auth,firestore "npx playwright test --config tests/browser-qa/playwright.config.mjs"
```

GitHub Actions stores failed-run screenshots and traces for seven days.

## Release gates that this does NOT resolve

Actual hosted two-account profile persistence, secure profile API, deployed Firestore rules and Firebase named-database mapping, safe Merchant API behavior, browser visual review on real devices, and end-to-end order reliability remain blocked and require separately reviewed evidence. Do not merge PR #61 or activate live ordering based only on emulator browser QA.

## Navigation and truthful saves regression
The branch integrates Customer main startup coordination. An actual browser regression reproduced Profile disappearing after sign-in: Firebase had opened Home while a delayed Login callback could still request Login Success and Home. The callback now checks the latest navigation state. The browser checks span four seconds after opening Profile, use normal pointer clicks, and verify sign-out after a reload. Keyboard activation remains separately covered for account switching. The synthetic email expectation uses Firebase's normalized email.

A MutationObserver records even brief saved-success text during a failing profile request. It reproduced a false receipt because shared processing displayed an error but resolved the form promise. Profile callers now opt into rethrowing the error after cleanup. Pending synchronization is the current truthful failure message, rather than the raw 503 body. No positive hosted persistence claim follows from these failure tests.

The Vite launch command uses Node directly on Windows and Linux. Local browser validation uses the same committed spec/config with an independently owned Vite process to avoid Windows process-tree shutdown hangs; CI retains Playwright-owned Vite.

Validation on this integrated branch: all seven Chromium browser checks passed (31.8 seconds) using the committed specs and demo emulators; 33 account/navigation/profile-processing/guest/pickup tests passed; TypeScript and production build passed. Browser results establish isolated interaction behavior, not real hosted profile persistence. The earlier passing CI tests did not span the delayed navigation timers or record transient success messages; these regressions now cover both. Login timer ownership is covered by the follow-up below.

## Delayed-account isolation follow-up
The full account review found two additional P1 races missed by ordinary sequential switching: a delayed A profile read could publish after B was ready, and A profile data could be sent with B credentials after awaited token retrieval. Actual extracted App/service functions reproduced five failing read cases and five failing write/cache cases before fixes. Read generations, Firebase user-object ownership, response-owner validation and post-await/state-update checks now protect reads, writes, success callbacks, retries and cache merging. Tests also exercise same-UID re-login, delayed React commits and offline-queue completion. Login screen timers are canceled when the originating screen unmounts and cannot be scheduled by an old async continuation.

Validation: 54 account/guest/navigation/timer/read/write/processing/pickup regressions pass; all 14 browser cases pass at desktop 1280×720 and mobile 390×844, including actual touch Save/Sign Out. The mobile helper completes privacy/cookie choices before opening Login so a late consent banner cannot intercept its entry control. Hosted profile persistence still requires missing staging server credentials and positive read-after-write testing; isolated negative/failure checks do not resolve that gate.

Final login ownership checks reproduced and fixed delayed credential-response and React-state races while preserving valid same-account completion after Home unmount. Login no longer auto-upserts metadata. Canceled biometric enrollment cannot invent a credential or overwrite a new account's device key. Eight actual callback regressions cover these cases; this is not certification of a hardware passkey login protocol. Final verification: 62 regression cases, TypeScript and production build pass; 14 desktop/mobile browser cases pass after these changes. Independent review approved the three P1 isolation corrections and timer lifecycle.

Main-integration CI exposed the checkout SSR fixture's missing Firebase `auth` export after Checkout gained registered-account gating. Reproduced the bundle failure locally, added an explicit signed-out auth provider stub, and reran 63 existing catalog/checkout/pickup/startup/cache/map/deferred-module regression cases successfully. This changes the test boundary only; it does not weaken Checkout's live identity checks.
