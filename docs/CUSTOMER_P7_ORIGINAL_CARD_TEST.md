# Customer P7 — Restore original My-Kota shop card and simulated nearby test location

**2026-11-03 | Draft, Preview only.** This is a correction to P6 after the owner's feedback: *Do not replace the LocalEats UI/UX; shop card must remain the original clickable card and allow testing the menu/cart/checkout.*

## Location finding and correct scope
The user's permission to use their current location was granted for this one test; coarse location is **Cosmo City/Roodepoort, Johannesburg**, whereas the approved My-Kota catalog record remains at **Katlego Street, Ivory Park**. These areas are genuinely outside the 4 km pilot pickup radius. **Do not change the real shop coordinates in Supabase, API, Google Maps, or Merchant. Do not store a user's precise home address in GitHub, logs or database.** The browser's real GPS remains authoritative to the server.

## Fix
- Revert P6's custom *Pilot shops — browse only* tiles and restore the existing `ShopCard` component with its original image, pricing presentation, merchant status, click, and `StoreInfoScreen` navigation.
- Add an **explicit P7-only display simulation** for the one approved My-Kota record `shop-my-kota-ivory-park` if outside the actual 4 km radius. Fetch only its real public approved catalog and real public menu. Keep its actual Ivory Park latitude, longitude and address; do not mint new physical outlets, add DB rows, claim actual pickup availability, or fabricate a menu/price. Label the test arrangement outside the card and inside the shop screen.
- Simulate visibility near the user's current area **only in the Preview UI** (not API, map location, merchant dashboard or production data). The real orderable shop list and API distance verification remain unchanged.
- Preserve the original menu, cart and checkout UI paths. If the test shop is selected with `VITE_PICKUP_ORDERING_ENABLED=false`, the Checkout button **simulates test completion without any network order API, persisted order, payment, notification, offline sync queue or fabricated historical receipt**. It must never tell the user that a real order was placed.
- This branch requires `VITE_P7_NEARBY_TEST_MODE=true`, exact LocalEats Vercel Preview host, and a false pickup ordering flag. The test listing is suppressed if ordering is enabled. The feature is absent from Production and default false elsewhere.
- P7 includes a narrow tests/CI workflow. Maintain all P6/P5/P3/Customer regressions, TypeScript and build; no existing PR merges.

## Manual acceptance
Test the isolated P7 Preview on Home: **the original My-Kota ShopCard must look unchanged**. Open it, see the actual menu, add to cart, navigate checkout, press **Simulate test checkout — no order**, and see explicit *no order created*. Ensure real order history stays unchanged, customer account remains isolated and Production untouched. The owner's browser still needs manual testing.
