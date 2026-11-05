# LocalEats Customer Production Readiness — P0 (2026-11-03)

**Status: STOP / NOT PRODUCTION READY. Client-only scope.** No Production deployment, API, Supabase, Merchant Dashboard, Rider, or Firebase rule changes are authorized by this review.

## Evidence observed
- The current live Production deployment (commit \`94ea1f392e57df9308a705e5d34db01a24379c1e\`, branch \`main\`) is marked Vercel READY. This means the static app deployed, not that business services are functional.
- Production \`VITE_PICKUP_ORDERING_ENABLED=false\` keeps real pickup ordering disabled.
- Read-only GET probes on its immutable deployment URL returned **HTTP 200 text/html** for \`/api/profiles/<nonexistent-test-id>\`, \`/api/health\`, \`/api/v1/orders\`, and even a fabricated \`/api/nonexistent\`. The Client app's SPA rewrite currently captures API paths. No credentials were used. **Profile persistence is not confirmed or reliable.**
- Before this patch, \`src/lib/supabase.ts\` contains a compatibility \`from()\` query wrapper returning empty arrays with \`error:null\`; the active \`OrderHistoryScreen\` could therefore display **"No orders placed yet"** without checking the real authenticated order service.
- The old manual sync / reconnect handler called \`processNetworkQueue(... => true)\` without executing requests, then deleted \`offline_orders_queue\` and announced success. The separate legacy order replay was already blocked with an unconditional return; this P0 change deletes the dead and unsafe replay implementation.
- Profile sync considered a locally cached write or retry queue \`error:null\`, so UI could show a successful save when the backend returned HTML or was offline. Queued updates could retry without verifying the active UID. Roles were included in client-supplied profile/mirror payloads.

## P0 Client-only repairs on this branch
1. Preserve all unconfirmed offline requests; remove the fake success executor and deletion; reconnect only refreshes shops and network status, never claims to send orders. No real order can be created from a legacy offline queue.
2. Profile writes and retries require a matching signed-in Firebase UID; cached profile data cannot bleed between accounts; client-supplied roles are excluded from API requests/Firestore mirror. Offline/unconfirmed server writes are reported with an error and retained locally, never as persisted success.
3. Order History reads the authenticated \`customerPickupApi.orders()\` endpoint (pickup rows only), validates every returned row belongs to the active account, distinguishes unauthenticated, loading, unavailable and confirmed-empty states, and uses authoritative \`total_price\`. Reorder now directs to the current menu rather than populating the cart with historical prices. The original card layout remains.
4. Dedicated Client CI tests and a **read-only Production contract gate**. The latter intentionally fails until \`/api/profiles/:uid\` is actually served by an authenticated JSON endpoint returning 401/403 for an unsigned request.

## Remaining release gates — do not merge yet
- Deploy/prove a secure authenticated profile API contract, with separate dummy accounts and read-after-write persistence in the isolated staging setup; no fake success or cross-account read/write.
- Confirm exact authenticated Customer Orders API works, with own-account rows/empty and mixed history cases; no legacy records silently invented. **Ordering flag stays false** until the complete merchant/rider workflow is authorized and tested.
- Inspect the Client UI in an actual desktop and mobile browser: existing shop card and menu, geolocation permission/out-of-radius/closed states, login, cart, profile, history, PWA refresh/logout/account switching, and accessibility basics. No visual redesign.
- Confirm Production and Preview environment settings, PWA cache/rollback and release artifact, and a clean green CI check that tests the actual deployed authenticated endpoints.
- Approval to release production separately after the above gates. PR is draft and must not be auto-merged.

**Known limitation:** Fixing an unserved authenticated API is not a frontend-only action. This Client-only branch does not create backend functions, modify an API repository or database, or turn on ordering; it must stay blocked until a separately authorized secure backend integration exists.
