---
name: localeats-pickup-launch
description: "Use when reviewing, debugging, testing, or preparing a release of the LocalEats customer pickup-only experience, including shop discovery, menu, cart, authoritative quotes, pickup checkout, and merchant handoff. Do not use for rider or delivery development."
---

# LocalEats pickup launch review

## Scope and authority
This is an instruction-only Codex skill for the LocalEats **Client App** repository. It helps inspect or improve pickup launch readiness; it does not grant permission to deploy, merge, activate ordering, or write business records. The business owner approves release decisions.

Read the root `AGENTS.md` and `LocalEats_App_Functionality_Documentation.md` first, as this repository requires. Use actual checked-out code and tests to verify present behavior; historical architecture sections may describe superseded implementations. State the checked-out branch and commit before conclusions. The Merchant Dashboard and API may be separate repositories: do not claim to have verified their behavior without separately inspecting them.

## Hard boundaries
- **Pickup only** for this launch. Do not introduce, enable, or expand rider assignment, delivery checkout, delivery pricing, courier tracking, or rider-app functionality. Preserve legacy historical files rather than deleting them without authorization.
- **Preserve the approved original UI/UX**: ShopCard, navigation, storefront, menu, cart, animations, branding, and page layout. Fix only verified issues; document any proposed design change before editing.
- **Preview/test only** until the owner expressly authorizes otherwise. Never merge, deploy Production, change environment flags, billing, subscriptions, online payments, security rules, auth policies, database schema, live data, or API activation as a side effect of this skill.
- **Never create a real order while testing.** Prefer mocks, emulator, or an isolated test environment. Keep `VITE_PICKUP_ORDERING_ENABLED` disabled unless the owner separately approves a specific controlled test environment and its complete safety gates.
- Do not treat an old note describing `allow read, write: if true` as a safe or active policy. Flag any permissive Firestore/RLS rules for review; never introduce or broaden public write access.
- Never expose secrets, customer personal data, credentials, or real user records in logs or reports. Do not install paid services, run destructive migrations, or alter connected infrastructure without explicit approval.

## Workflow
1. **Establish facts.** Inspect branch status, available commands, feature flags, affected code, API boundaries, and existing tests. Check whether the customer journey depends on a separate Merchant or API repository. Record what cannot be verified.
2. **Audit discovery and trust.** Verify actual geolocation handling, the approved 4 km boundary, nearby-first ordering, clear empty/error states, location-denied recovery, no invented shops/coordinates/menu items, and cache freshness. Check closed-shop browsing separately from purchase eligibility; do not force a UI change.
3. **Audit menu and cart.** Verify original ShopCard opens correctly; real menu prices and availability; no duplicate/phantom items; cart identity is scoped to a single shop; and the original UI is retained.
4. **Audit quote and pickup.** The client must send item IDs and quantities, not trusted prices. Check authenticated server-authoritative pickup quotes, total matching, pay-at-shop cash or physical card-machine choice, zero unsupported fees, consent, and safe failure behavior. Never collect card credentials. Verify idempotent retries and cross-user/shop isolation, and ensure a simulated checkout cannot submit an order.
5. **Audit merchant handoff when access is granted.** Verify order acceptance, preparing, ready-for-pickup, state consistency, and durable notification/inbox behavior across repositories. Do not claim the Merchant flow passed based only on Customer tests.
6. **Audit performance and failure modes.** Look for flicker, repeated fetches, stale screens, double clicks, loading loops, expensive queries, missing error boundaries, and excessive polling. Suggest bounded caching and invalidation only if source of truth remains correct.
7. **Verify safely.** Use available repository scripts, starting with `npm run test:pickup-integration`, `npm run lint` (TypeScript), and `npm run build` where dependencies/environment permit. Run relevant additional tests; use Playwright against an isolated Preview only when allowed. For load or concurrency tests, use synthetic/mocked traffic; no stress tests against Production or free-tier live infrastructure.
8. **Report evidence.** Separate observations from assumptions. Give exact files, test commands/results, reproduction steps, security risks, estimated impact, and any unresolved manual checks. Do not claim that tests passed unless you ran them. Propose the smallest safe patch in a separate branch/PR and leave it for owner review.

## Pass/fail gates
A pickup launch is **not approved** merely because a build passes. Missing checks, unverified Merchant/API behavior, uncertain auth rules, unsafe retries, unverifiable order persistence, or a Preview-to-Production mismatch must be reported as **not yet verified**. The owner makes the final go-live and merge decision.

## Repository pointers (verify before use)
- `src/services/customerPickup.ts`: pickup API and activation flag
- `src/services/pickupMapping.ts`: location, shop/menu mapping, cart intent, submission guard
- `src/screens/CheckoutScreen.tsx`: checkout UI/quote review
- `tests/original-pickup.test.mjs`: existing pickup-focused regression tests
- `package.json`: authoritative local scripts

## Invocation
Run `$localeats-pickup-launch` when the owner requests a pickup release audit, bug fix, regression sweep, or readiness review. For work outside this scope, ask for a distinct authorization and plan.
