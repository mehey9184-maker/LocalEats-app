# L3-P4 — Customer availability truth and scalable-ideas register

**Date:** 2026-11-22 | **Base:** original Customer main `57c0f82608784dfdac3b0e4fca8ff491e0252561`
**Scope:** one exact Customer shop-card credibility fix and a versioned business planning document. Preview-only draft, no production, database, merchant data, finance, activation flags or order writes.

## Verified contradiction
The original ShopCard displayed a green **Open Now** badge and **Pickup at shop** pill whenever published hours were open, even when its heartbeat reported **Temporarily Away**. It also displayed **Opens Soon** without verified opening-time data. These phrases make the customer believe a shop can accept pickup when the available evidence doesn't support it.

## Minimal fix
`src/services/shopCardTrustState.ts` produces a single presentation state from existing shop facts, preserving existing eligibility logic and the original design. Precedence: **Outside 4km → Location needed → Temporarily away → Open Now / Closed**. The pill says **Pickup at shop** only for confirmed location, open hours and not-away; otherwise **Browse menu only**. Closed shops remain browsable. An unknown reopening time says **Opening time unavailable**, never a fabricated `Soon`. Screen-reader labels agree with the displayed state. No new server calls or data persisted.

## Business strategy captured
The canonical company register is `docs/LOCALEATS_SCALABLE_IDEA_REGISTER.md`. It includes customer and Merchant milestones, future versioned CDN images (proposal only; no implementation), subscription ideas, rewards, LocalMarket, LocalRider, LocalPay, LocalCover, charging lockers as a separate exploration, and global scale gates. Every idea is **Captured / Research / Experiment / Approved / Deferred / Rejected**; only explicitly approved experiments may be built. There is no automatic commitment, charge, paid service or background deployment from documenting an idea.

## Verification and release gate
`tests/l3-p4-shop-trust.test.mjs` directly checks all shop statuses including away while within opening hours and missing GPS, as well as the no-invented-hours assertion and register boundaries. Existing catalog, pickup and closed-shop tests, TS and build run in `customer-l3-p4-trust.yml`. Manual 320/390px visual check, real GPS and actual shop heartbeat still require acceptance. P1–P3 draft PRs remain independent. Do not merge without owner approval.
