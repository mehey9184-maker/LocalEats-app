# L3-P1 Customer speed, accurate discovery and right-sized images

**Date:** 2026-11-22
**Branch:** `review/l3-p1-catalog-speed-accuracy-image-size-20261122`
**Baseline `main`:** `57c0f82608784dfdac3b0e4fca8ff491e0252561`
**Scope:** source-only Customer Preview proposal. Do not merge or change Production, pickup activation, merchant records, database schema/rules, pricing, push, real GPS or orders without explicit owner release approval.

## Findings grounded in current source

1. The *active* Customer App loads shop data in `src/App.tsx` through the authoritative `readPublicBrowseCatalog` (GPS unavailable) or `readPickupCatalog` (real GPS) functions in `src/services/customerPickup.ts`. It does **not** import the older `src/hooks/useShopsData.ts`. The active pickup mapping validates actual menu prices and known GPS distance; it does not authorize orders with unknown GPS or beyond 4 km. Cached verified nearby catalogs are exact-coordinate, in-memory and expire after 15 seconds.
2. Before this change, Home awaited **all** menu requests before setting the shop list. A slow menu could postpone the entire useful Home catalog. Public no-GPS reads launched every shop-menu request at once, without a per-menu timeout. Verified GPS reads had a five-second per-menu AbortController and a 15-second complete-result in-memory cache.
3. Before this change, `BlurUpImage` requested **600px** optimized remote photos in every slot, including 80px menu thumbnails and 64px cart items. The app already lazy-loads offscreen images, respects reduced motion and defers optional map canvases. We preserve these behaviors.
4. **Legacy accuracy risk (not active in Home):** `src/hooks/useShopsData.ts` can manufacture `rating:4.5`, hashed review counts, `15-20 min`, a generic telephone, synthetic coordinates, sample photos/menus and cached demo shops. Its unused status is guarded by `tests/l3-p1-catalog-speed-accuracy.test.mjs`. Do **not** restore this path into Home, or treat those records as real public shops. Retiring it is a separate safe cleanup decision; no connected live customer data were touched.
5. Neither source inspection nor synthetic CI tests establish actual real-device first-content timing, bandwidth savings, or working physical GPS.

## L3-P1 changes

- **Verified first-card display:** public browse now uses `createPublicBrowseCatalogReader` with at most six simultaneous menu requests, a five-second menu deadline, optional progressive callback and 15-second **in-memory complete-only** cache. Concurrent same-key visits reuse the in-flight request; manual refresh bypasses the short cache. A shop appears only after its **real** API menu has been validated. Each partial result has `incomplete:true`. The final result preserves original shop order and excludes failed/invalid menus without inserting fake items.
- **Verified GPS cards also progressive:** the existing `createNearbyCatalogReader` now limits menus to six concurrent requests, times out even if an underlying transport ignores abort after six seconds, and can emit fully validated shop/menu pairs while other menus are pending. Overlapping refresh listeners share partial updates. Only a **complete** result enters its 15-second exact-location cache. Existing failed-menu and retry semantics are unchanged.
- **Stale-location and visual stability protection:** `src/App.tsx` applies progressive updates only for its current catalog request generation and does **not** replace a previously visible full shop list with a partial list during same-location revalidation. A new GPS/refresh request invalidates older updates. Without real GPS, displayed cards remain browse-only; all server pickup quote, 4 km and order write gates remain intact.
- **Right-sized image downloads:** `BlurUpImage` accepts a `160|320|600` pixel remote image width. Existing large cards retain 600px. Menu, checkout and cart thumbnail slots request 160px for small slots; uploaded image URLs and branded missing-photo behavior stay unchanged. This reduces the *requested dimensions* for those slots, but actual transferred bytes must be measured before citing savings.
- **No UI redesign:** same original ShopCard, home layout, menu, cart and checkout actions and animations. A screenshot-confirmed 320px menu price-wrap issue is corrected with wrapping flex actions and no-wrap prices/labels; the existing Data Saver message has clearer text contrast. No business rules change.

## Verification

Review `tests/l3-p1-catalog-speed-accuracy.test.mjs`, `tests/customer-public-browse-without-gps.test.mjs` and `tests/customer-nearby-cache-main.test.mjs`. Synthetic, no-network tests validate early display, max concurrent requests, timeouts, invalid menu omission, 4km/unknown GPS status, exact-coordinate cache and responsive width contracts. CI for `customer-catalog-trust.yml` runs these and existing catalog/checkout/typing/build checks.

**Still required before owner sign-off:** real Android 320/390px screenshots of Home and shop menus, real GPS on/off transitions and revalidation, external proxy direct-image fallback, offline/slow-network user experience, then record actual loading milliseconds and transferred KB before/after. Do not claim launch readiness from CI alone.

## L3-P1 continuation: browser evidence gate

An isolated React fixture (`tests/l3-p1-home-fixture.{html,tsx}`) renders the actual ShopCard and MenuItemCard against a synthetic two-shop catalog (one intentionally slow) without real account, GPS, API, store or order access. The Playwright script `tests/l3-p1-home-browser.mjs` validates verified first-card timing, 160px thumbnails versus 600px heroes, no horizontal overflow at 320px/390px/1440px, no real outbound writes, no unsupported rating or pickup claims, and Data Saver display. CI attaches nine `l3-p1-home-visual-evidence` screenshots (first-card, complete, Data Saver at each viewport). These images demonstrate **isolated React** behavior, not a live production shop. Actual transferred KB and physical phone GPS remain unverified. If no Vercel branch-specific Preview config exists, do not substitute Production for Preview testing.
