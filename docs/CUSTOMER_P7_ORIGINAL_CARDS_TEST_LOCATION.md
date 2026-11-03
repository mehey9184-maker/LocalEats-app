# Customer P7 — Original Shop Cards, Opt-in Nearby Test Location

## Owner requirement (2026-11-03)
The 4 km pickup radius was working: the owner was physically outside My-Kota's delivery/pickup area. P6's custom "Pilot shops in Tembisa & Ivory Park" directory was a **UI/UX mistake**: it replaced the original visual shop cards with non-clickable test rows. The owner expressly requests **no replacements of existing ShopCard UI/UX**, and permits a disposable test-only way to view their shop near the browsing location.

## Correct fix
- Restore existing Local Merchants / original `<ShopCard>` layout and original StoreInfo entry; remove the P6 browse-only panel and guest banner. No changes to original `ShopCard`, StoreInfo or cart component layout.
- Add only a modest, clearly labelled **opt-in test position toggle**. The toggle simulates a customer at **My-Kota's published coordinates** (obtained from the real approved catalog, not guessed). It does **not** move the merchant, change stored shop coordinates, overwrite real browser GPS or infer the owner's precise address.
- When enabled, query the read-only pickup catalog with that simulated location. The existing server-authoritative API still validates the shop, availability, menu and 4 km distance **relative to the explicitly simulated test position**. Existing real ShopCards and menu navigation work as usual for UI testing.
- When disabled, immediately restore the actual device GPS and the real 4 km filtering. The simulation is in React state only and is cleared on refresh. The banner explicitly says **not real GPS** and **real ordering disabled**; test item cart is cleared on position switches to avoid stale shopping context.
- Gate the test control behind **`VITE_PREVIEW_MY_KOTA_TEST_LOCATION=true` on the P7 branch's Vercel Preview only**, an explicit approved Vercel hostname, and `VITE_PICKUP_ORDERING_ENABLED=false`. Production builds never receive the test flag. Existing Express order endpoints and real order submission remain disabled.
- Earlier Customer P6 status/history safety fixes remain; older legacy history is not imported. The user's current browser is outside 4 km but precise location sharing to ChatGPT is **not available**. We must not claim we know their exact GPS.

## Verification and release
- Tests: derive test position from the verified active public My-Kota record only; no invalid/stale/different shop or GPS allowed; maintain original ShopCard and StoreInfo UX; no hidden persisted test position; P7 + inherited Customer/P6/P5/P3 regressions, TypeScript and full build.
- Deploy a standalone P7 Customer Preview, and add exactly that address to the isolated API Preview's origin allowlist. Verify real read-only pickup catalog and menu work for My-Kota, CORS GET/OPTIONS from P7 Preview, and that the compiled P7 code contains both original ShopCard and explicit opt-in test control.
- Do not modify the real shop's stored location, Supabase/Firebase data, price authority, production, customer integration alias, or activate order submission. The owner still must visually check the new Preview and confirm that My-Kota opens in the standard shop UI.
