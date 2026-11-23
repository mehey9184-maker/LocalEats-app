# L3-P2 — Data Saver, safe offline directory and honest recovery

**Date:** 2026-11-22
**Branch:** `review/l3-p2-data-saver-safe-offline-20261122`
**Base:** current Customer `main`, independent of still-unmerged L3-P1 PR #134.
**Scope:** draft Customer source and tests only; no Production, database, API writes, order activation, payments, rider, subscriptions or server configuration.

## Reason for the phase
LocalEats is designed for customers on low-data Android phones. Existing Settings toggles Data Saver, but it only hides some Home hero images; shared cart/food/checkout `BlurUpImage` elements can still request remote images. The app refreshes shop catalogs every 60 seconds even while hidden, and legacy offline storage can hold broad demo shop records. Reusing such records as live menu prices, ratings or distance would be inaccurate.

## Changes
1. **Real photo data saving:** shared `BlurUpImage` now renders a branded "Photo hidden to save data" button (no `img` mounted, hence no image fetch) for remotely hosted images when Data Saver is ON. The customer can explicitly tap "Tap to load photo" for one image. If source is missing, the existing honest missing-photo artwork is shown. A photo proxy failure still retries the actual merchant-uploaded source when the photo was explicitly requested. The original animations and product/shop card markup are preserved.
2. **Settings:** explicit saved customer choice `true` / `false` overrides the browser's Save-Data signal. Save-Data may enable the default on a first visit where no preference was saved; unsupported browsers retain the existing default OFF. Local preference only, no telemetry or device identification. The switch is labelled and uses `aria-checked`.
3. **Offline, safe reference only:** save names and category of at most 40 public verified shops for up to 24h in a separate names-only versioned localStorage key, after **complete** authoritative catalog reads only. The screenshot/error fallback has an intentionally noninteractive list labelled "Previously seen shops" and states that no menu/price/opening time/pickup eligibility can be trusted offline. This list is never fed to `Shop`, `ShopCard`, checkout, maps, orders or the 4km distance system. It stores **no menu, price, image, GPS, phone, rating, owner, authentication token, customer profile or order**; invalid/tampered records are rejected and an empty verified catalog clears old names. Storage denied/quota errors do not affect live browsing. This is not full offline menu access.
4. **Network recovery:** never present stale live shops as current after an offline event or an attempted refresh while disconnected. A manual reload while offline does not ask GPS or send wasted network requests. Active customers retain the 60-second live catalog poll, but the timer skips requests while hidden or offline and resumes on visibility. The reconnect message correctly says live shop data is being refreshed, not that offline orders were submitted.
5. **No authority change:** the server still owns shop/menu accuracy, quote totals, 4km pickup eligibility and all order mutations. Unknown GPS cannot order. Service workers still fail closed on API request failure, never persist authenticated responses or replay queued order success.

## Acceptance gates
Automated: `tests/l3-p2-data-saver-offline.test.mjs` (browser Save-Data override, storage-only public names, TTL/caps/tamper safety, SSR image render without any `img`, offline nonclickable list and Source/API guards), plus old cache/Pickup/Default image regressions, TypeScript and Vite build in `.github/workflows/customer-l3-p2-data-saver-offline.yml`. Additional existing Customer CI required.

Manual before owner merge: real-device throttled photos ON/OFF (mobile transfer bytes), exact 320px/390px Settings and placeholders, real GPS and in/out of 4km consistency, app offline/online recovery, browser quota/private mode, direct-source image fallback, and integration with P1 after its separate acceptance. Do not say Production data savings were measured from a code test. Do not merge without owner approval.
