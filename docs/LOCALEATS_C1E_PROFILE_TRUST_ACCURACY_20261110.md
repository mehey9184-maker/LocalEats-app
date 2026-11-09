# LocalEats — C1E Profile Trust & Accuracy

**Date:** 10 November 2026
**Scope:** Owner-approved isolated Customer Preview only; stacked on draft C1D PR #90.

## Reason for C1E

Two hosted staging test identities (named tester and tester2 by the owner) ran a read-only C1D diagnostic and observed, for **both** accounts:
- `GET /api/v1/profiles/me` returned HTTP **404 PROFILE_NOT_FOUND**.
- `GET /api/v1/orders` returned HTTP **503 DATABASE_UNAVAILABLE**.
- Both responses had no-store caching.
- The browser's diagnostic labelled CORS "not confirmed".

The existing Profile UI simultaneously asserted *All details verified & saved*, *Synced to cloud* and green *Saved* badges. Those assertions did not follow from authoritative backend receipts. It also showed an obsolete *5 more to Silver* milestone even though Rewards is not active, and the CORS diagnostic compared `Access-Control-Allow-Origin` to the current page origin even though browser JavaScript cannot normally read that response header without explicit exposure.

## Scoped Customer Preview fixes

**Unchanged:** Customer Profile page layout, ShopCards, Home/Discover, 4 km rules, smooth cart animations, ten-second order review with Skip, C1D opt-in UI, Firebase identity, all staging API endpoints, and all write gates.

1. **Staging profile correctness:** When `VITE_FIREBASE_CONFIG_SOURCE=environment`, the form's existing status banner is replaced with **Account signed in · profile saving disabled** and **Changes in this form are not saved to the cloud**. Field labels say **From sign-in** and **Format valid**, not **Saved** and **Verified**. The original non-staging UI path is left unchanged in this draft.
2. **Staging write safety:** The parent profile updater stops before optimistic state changes or Firebase Auth metadata updates. The Profile Save button is disabled with explicit wording; the handler independently refuses writes. Profile Gallery/Camera, photo deletion, and photo-upload confirmation are disabled/guarded while staging. This complements existing C1B API/profile write gates and does not modify a Firebase account.
3. **Staging reward truth:** The original rewards card footprint is retained but shows **Rewards coming later** and **Rewards are not active in Preview. No purchases earn prizes yet**. No completed-order milestone is treated as an approved reward ledger or an entitlement.
4. **C1D diagnostic:** Cross-origin successful `fetch` permits reading HTTP status and JSON; `Access-Control-Allow-Origin` response header itself is not readable by ordinary JS. The diagnostic now shows **Browser API read: allowed** when a non-opaque readable response was returned. This does **not** imply a specific CORS policy is secure, prove user data isolation, or override actual server authorization. C1D remains GET-only.

## Automated checks

Isolated branch regression run with no live Firebase identity, no real order, no database mutation:
- New C1E and retained C1D tests: **14/14 passed**.
- Retained Customer identity/startup/C1C: **35/35 passed**.
- C1B staging write shield and R5.2T order review: **9/9 passed**.
- Pickup integration: **8/8 passed**.
- TypeScript lint and full Customer Vite build: **passed**.

## Remaining owner acceptance

After isolated Customer Preview deployment:
1. Open Customer staging Profile as either tester account. Confirm the existing card layout remains unchanged while the profile banner says **Account signed in · profile saving disabled** and there is no **Synced to cloud** claim.
2. Confirm the Save button and Gallery/Camera photo upload buttons are disabled and no save or avatar upload is sent.
3. Confirm the rewards card says **Rewards coming later**, without prematurely awarding Silver/Gold milestones.
4. If using `?c1d=1`, repeat the two read-only API GETs. Expected while schema is absent: 404 `PROFILE_NOT_FOUND` and 503 `DATABASE_UNAVAILABLE`; browser-readability should say **allowed** if the response succeeds at the HTTP layer. These are **not** a persisted record-isolation pass.
5. Report any design regression, unexpected request, or private account flash. Do not provide passwords, Authorization headers or Firebase tokens.

## Outstanding release gates

- Real per-account persisted profile isolation remains unverified until separately approved staging profile rows/fixtures. The pickup `orders` and `pickup_order_events` tables remain unprovisioned, so order-history isolation is untestable at present.
- No owner approval has been granted for SQL migration, profile/order fixture data writes, production deployment, merging PRs, real ordering/payments, Rewards launch, rider activation or LocalPay.
- Dependency security advisories found during Vercel installation are an independent security review item; do not automatically force-upgrade packages without compatibility testing.

**Decision:** C1E source checks passed; full browser visual acceptance remains pending. C1B/C1D complete at current identity/readiness boundary but **not signed off for Production**.
