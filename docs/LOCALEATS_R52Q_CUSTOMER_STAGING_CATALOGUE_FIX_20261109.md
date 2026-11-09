# R5.2Q — Isolated Customer Preview catalogue connection correction

**2026-11-09 — Draft only, no merge, no Production.**

## Evidence and confirmed problems

Owner screenshot showed Chrome Sensors mock location latitude -26 / longitude 28 but Customer Preview Home had zero shops, "Shops unavailable", and a "Database Unreachable — Using offline cache" indicator. The actual isolated staging API already responded HTTP 200 with the two expected synthetic shops at that exact mock origin, including a closed shop with a browseable menu.

Inspection of the exact Customer Preview deployment revealed:
1. Preview Vercel `VITE_LOCALEATS_API_URL` was pointed to an older ephemeral API deployment URL rather than the stable staging API alias. Direct GET of the old API still returned 200; browser CORS was not independently reproduced, so **old URL is a configuration risk, not independently proven cause of the empty list**.
2. The status popup in `SystemStatusIndicator.tsx` depended on Firestore's direct `healthCheck`, although Customer Home uses the LocalEats API and the staging catalogue is served from Supabase through the backend. That status cannot describe the Home catalogue's health accurately.
3. `useNetworkHeartbeat.ts` queried a direct Supabase wrapper `shops` table instead of the actual staging API, also potentially reporting misleading latency/connectivity.
4. Chrome Sensors override does not guarantee app geolocation permission was granted; a null/stale app location can independently produce an empty list. **Actual browser Home acceptance is still pending**.

## Exact changes

- Preview-scoped Vercel `VITE_LOCALEATS_API_URL` updated to `https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app`, no Production env change.
- New `src/services/stagingCatalogHealth.ts`: a read-only, authenticated-key-free GET of `/api/v1/catalog/shops`; returns healthy only on HTTP OK with `{success:true,shops:[...]}`. Requires configured HTTPS API origin and sends no user location or private token.
- Only when `VITE_FIREBASE_CONFIG_SOURCE=environment` (isolated customer staging), `SystemStatusIndicator` and `useNetworkHeartbeat` use that catalogue request instead of unrelated browser-to-database health checks. Normal build paths remain untouched.
- Original JSX layout, ShopCard, Home, shop prices, cart, and pickup write gates unchanged.

## Verification

- Isolated source sandbox (commit `b489b1f447f4f104f88b5ba541c8118ce1240aa0`): `npm ci`, `npm run lint`, `npm run build`, and `npm run test:pickup-integration` **8/8 passed**.
- First Vercel git-deployment attempt failed `git_info_fail` because isolated Customer project is not Git-linked; no Production project was touched.
- File-based deployment with original 126 source files, replacing exactly two tracked modules and adding exactly one new helper, build corrected for nested `src/` root and static `npx vite build`; **staging deployment `dpl_9KJRGVHCypoXAS8So5sZdjBiXQCZ` READY**, stable alias unchanged.
- Fetched resulting Customer HTML **HTTP 200** and compiled main JS **HTTP 200**; confirmed stable API alias embedded, old ephemeral URL absent, new "Pickup API Unavailable" status copy and public catalogue health route present.
- Preview config still `LOCALEATS_STAGING_ONLY=true`, `VITE_PICKUP_ORDERING_ENABLED=false`, `VITE_PROFILE_WRITES_ENABLED=false`, `REWARDS_ACTIVATION_ENABLED=false`, `LOCALPAY_LIVE_WALLET_ENABLED=false`.
- Isolated API returns the two fictional shops within 4 km of `(-26.0000,28.0000)`; pending and archived shops excluded. Production data and original Customer UX untouched.

## Manual Customer acceptance still needed

1. On the stable Customer Preview in Chrome, set location permission to **Allow** for this staging site. In DevTools **Sensors**, set custom GPS lat -26, lng 28; refresh and invoke Set Address / current location if needed. The UI must read the simulated coordinates, not IP default or an older session coordinate.
2. Confirm original two shop cards: `STAGING TEST — Open Kota`, `STAGING TEST — Closed Kota`; 4 km filtering; original open/closed menu browse; correct R25 / R10 amounts; no real checkout action.
3. If still zero, inspect browser Network tab Fetch/XHR: request to stable API `/api/v1/catalog/pickup-shops?lat=...&lng=...`; read HTTP result or CORS error. Avoid pasting auth tokens, API keys, or precise real location.
4. Confirm the status no longer incorrectly claims direct database unreachable solely on Firestore failure; it reports the catalogue API status instead.
5. Until owner manual acceptance: do not mark Customer UI end-to-end as passed, merge PR #84, activate ordering, grant rewards, create identities, or modify Production.
