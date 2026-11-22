# L3-P4 — Customer availability truth and scalable-ideas register

**Date:** 2026-11-22 | **Base:** original Customer main `57c0f82608784dfdac3b0e4fca8ff491e0252561`
**Scope:** one exact Customer shop-card credibility fix and a versioned business planning document. Preview-only draft, no production, database, merchant data, finance, activation flags or order writes.

## Verified source truth
The original ShopCard had a contradictory status pathway: a legacy `isShopAway` check could disagree with the opening-hours badge, and `Opens Soon` could appear without verified hours. During release review we confirmed `isShopAway()` currently always returns `false`: **the app does not have a live heartbeat-derived Away signal**. Do not claim it does. The existing `getShopStatus` explicitly returns `Away / Not Accepting Orders` when the API-provided `is_active` flag is false; this is the trustworthy input for the displayed **Not taking orders** state.

## Minimal fix
`src/services/shopCardTrustState.ts` produces a single presentation state from existing shop facts, preserving existing eligibility logic and the original design. Precedence: **Outside 4km → Location needed → Not taking orders (inactive) → Open Now / Closed by hours**. The pill says **Pickup at shop** only when in range, location known, active and open by the existing status rules; otherwise **Browse menu only**. Closed shops remain browsable. An unknown reopening time says **Opening time unavailable**, never a fabricated `Soon`. Screen-reader labels agree with the displayed state. No new server calls or data persisted.

## Business strategy captured
The canonical company register is `docs/LOCALEATS_SCALABLE_IDEA_REGISTER.md`. It includes customer and Merchant milestones, future versioned CDN images (proposal only; no implementation), subscription ideas, rewards, LocalMarket, LocalRider, LocalPay, LocalCover, charging lockers as a separate exploration, and global scale gates. Every idea is **Captured / Research / Experiment / Approved / Deferred / Rejected**; only explicitly approved experiments may be built. There is no automatic commitment, charge, paid service or background deployment from documenting an idea.

## Verification and release gate
`tests/l3-p4-shop-trust.test.mjs` directly checks all shop statuses including away while within opening hours and missing GPS, as well as the no-invented-hours assertion and register boundaries. Existing catalog, pickup and closed-shop tests, TS and build run in `customer-l3-p4-trust.yml`. Manual 320/390px visual check, real GPS and actual API effective-shop-availability checks still require acceptance. The old heartbeat heuristic is disabled and must not be relied on. P1–P3 draft PRs remain independent. Do not merge without owner approval.
