# LocalEats Customer L3 — P1–P4 combined integration

**Date:** 2026-11-22 (Africa/Johannesburg)  
**Branch:** `integration/l3-p1-p4-zero-write-20261122`  
**Base:** original approved Customer main `57c0f82608784dfdac3b0e4fca8ff491e0252561`.  
**Purpose:** a disposable, review-only **combined Customer source candidate** to test four separately reviewed phases in one build. This is **not a Production approval** or a real pickup. There are no database, live flag, API Worker, Supabase, Firebase Rules, billing or account mutations.

## Immutable input branches

1. [P1 #134](https://github.com/mehey9184-maker/LocalEats-app/pull/134): `73374e2cb496c2f9b6f7edb431519578005fa80b` — bounded verified catalog reads, progressive display, right-sized merchant photos.
2. [P2 #135](https://github.com/mehey9184-maker/LocalEats-app/pull/135): `01de56bfda393deefc339555bda04fae2116d06a` — Data Saver customer choice, names-only noninteractive offline directory, fewer hidden-tab reads.
3. [P3 #136](https://github.com/mehey9184-maker/LocalEats-app/pull/136): `8dc131d9932dc7f6071acb8b9dceb159a5e282a1` — reduced-motion settings, five original tab semantics, keyboard-focused cart sheet and honest notifications.
4. [P4 Customer #137](https://github.com/mehey9184-maker/LocalEats-app/pull/137): `938de7de93e3f502392709ee0bf99171214b9436` — truthful `Not taking orders` presentation, no fabricated reopening time, source-of-truth [scalable company idea register](LOCALEATS_SCALABLE_IDEA_REGISTER.md).

**Merchant P4 #220 is separate** and **not** combined into the Customer codebase; its root lint debt remains a distinct gate.

## Merge strategy and explicit reconciliation

This branch began at **P1 exact head**; P2/P3/P4 changes were applied additively by matching original patch context and manually reconciling competing lines. No mainline PR was merged.

- **P1 × P2 — `src/App.tsx`:** retained P1 progressive catalog and force refresh while adding P2's Data Saver preference, complete-only safe directory snapshot, offline clearing, paused hidden-tab refresh, and reconnect hints. App import conflict resolved to keep P1 `readPublicBrowseCatalogProgressive` and add P2 services.
- **P1 × P2 — `src/components/BlurUpImage.tsx`:** retained P1 proxy image widths (160/320/600) **and** P2's local on-demand photo reveal. Data Saver mounts no image until explicit opt-in. Normal mode begins with the optimized proxy URL, not an eager direct-source duplicate. Missing photos still use actual descriptive fallback artwork, never invented merchant food photos.
- **P1/P2 × P3 — `SettingsScreen.tsx`:** reused P2's already accessible Data Saver switch rather than duplicating it. Added P3's Dark Mode switch/profile keyboard controls, navigation focus and cart gesture accessibility.
- **P1 × P3 × P4 — `ShopCard.tsx`:** preserved original card layout, P1 right-sized thumbnails, P3 reduced-motion behavior and P4 presentation-only shop availability labels. `getShopStatus` explicit `is_active` denial is the inactive signal; deprecated `isShopAway` is always false, not a real heartbeat. Real 4km / menu / checkout safety still comes from API/mapping.
- **Tests and docs:** merged phase-specific tests and source contracts; P3's isolation-only assertion that P1 progressive reading is absent was revised to verify it is **present** in this combined build. Root `AGENTS.md` and functionality documentation preserve all four phase notes; the idea register remains a *proposal*.

## Automated acceptance on this integration branch

- `.github/workflows/customer-l3-p1-p4-integration.yml` runs **all four phase tests against the same checkout**, plus legacy pickup/GPS/closed-shop trust checks; then TypeScript and server/Vite build with write flags `false`.
- Actual P1, P2 and P3 React fixtures run under isolated headless Chromium at 320px/390px, and P1/P3 also at 1440px. They are synthetic but use the real card, photo, nav, cart and sheet components and record screenshot artifacts.
- `tests/l3-p1-p4-integration.test.mjs` specifically checks the formerly conflicting image component in one React SSR, P4 inactive-shop labels on the P3 card, complete-only P2 directory on P1 progressive catalog, P3 accessible cart, 4km and authoritative pickup price guards.
- Existing automatically triggered Customer PR workflows must pass on the exact combined SHA. The CI result must be recorded **after execution**, not assumed from the source.

## Unresolved release gates

- **No real-device / hosted acceptance yet:** real Android GPS, actual transferred mobile data, PWA install, permission handling, real read-only shop API, authentic Merchant/Customer sessions, out-of-area / unknown/closed availability checks, cart/nav/notifications and privacy proof.
- **No reliable standalone P1–P4 hosted Vercel Preview on the original draft branches** was found during the 2026-11-22 release audit. A branch-matched **read-only** Preview must be validated before considering a merge; never bind a write-enabled Preview to Production data.
- API CORS source PR #215 is merged but latest recorded Vercel API Production remains on an older commit. Verify apex + WWW GET/OPTIONS against exact current API before any public release.
- Merchant P4 root lint is not clean, merchant/API security and Firebase FCM require separately scoped acceptance.
- Approved public shops and menus, real My-Kota owner readiness, and the test shop/public catalog policy still require the owner's decision.
- Production flags remain OFF; their configuration should be re-read at deployment time.

**Next decision after combined green tests:** owner review of screenshot artifacts, then a safe read-only Preview and genuine mobile acceptance. **Do not merge any Customer/merchant PR into main or activate real orders as part of this branch.** Real pickup pilot still needs its own controlled shop/customer authorization, physical handover and rollback.
