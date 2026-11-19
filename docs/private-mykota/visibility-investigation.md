# Private My-Kota visibility investigation — 19 November 2026

The approved private banner was rendered above HomeScreen as an App sibling. HomeScreen's fixed, top-aligned header covered that banner after its entrance transition. The banner existed in the DOM but browser hit-testing returned `home-sticky-header` instead of its button. An approved status response alone therefore did not establish usability.

The existing banner now renders in HomeScreen's content area below its measured sticky header. Discover and shop-info screens retain access to the same banner. The button has a 44px minimum target. Firebase observers, server eligibility, exact-origin restrictions, private sample data and write restrictions are unchanged.

## Evidence and validation

- `tests/l3-private-my-kota-browser-access.mjs` exercises the actual React entry point and Firebase SDK with synthetic local Firebase/API responses; external traffic is blocked. This is not a claim of real Firebase account verification.
- Before the fix, the approved button was covered by `home-sticky-header`. After the fix, pointer hit-testing reaches the button at 320, 390 and 1280px; clicking opens the sample storefront.
- Browser coverage: guest and unauthorized account hidden, approved account visible and clickable, sample menu opened, session restored after refresh, logout/account switching removes access, delayed approved response cannot reveal access for another account even when transport cancellation is ignored. No API writes occur.
- All 158 root tests, TypeScript checks and ordinary build passed. Synthetic staging build passed Firebase worker project-parity checks. Existing built-app startup tests passed for fresh, malformed cart and malformed preferences states.
- Two older source-pattern assertions were updated for the existing private-catalog filtering structure; no public catalog behavior was changed by those test adjustments.
- `approved-390.png` shows the synthetic approved account after the layout fix. Browser screenshots and logs contain no real account credentials.

## Remaining owner acceptance

Open the corrected isolated Preview with the already approved staging account. Confirm the private status request returns 200 and `eligible:true`, the labelled sample-only button is visible and clickable, and its sample menu opens. Do not create a real order. Real-owner acceptance on the corrected deployment must be reported separately from the synthetic browser tests.

No Production deployment, database/schema change, real orders/payments or cloud notification send is part of this fix. PR #115 remains a draft.
