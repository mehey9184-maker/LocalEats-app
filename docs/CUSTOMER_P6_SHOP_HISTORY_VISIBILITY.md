# Customer P6 — Missing shop & order history diagnostics (Preview only)

## Why this exists
Owner reports shops and earlier order history remain absent in Customer P5 after connecting a separate catalog API. The API returns 9 approved public shops and **My-Kota** with a verified menu, but Home only shows orderable shops within 4 km of the device's actual GPS. No false nearby GPS or fake orders may be used. Older Firebase/legacy orders do not automatically exist in the server-confirmed pickup history, and signed-out history had a null-vs-undefined loading mismatch.

## Changes
- Add a **read-only, clearly labeled Tembisa/Ivory Park pilot-shop directory**, fetched from the real API's approved public catalog independently of GPS. Show real shop name, address, measured distance (only if a true device location exists), and safe status: *outside 4 km*, *not accepting orders*, or *pickup unconfirmed*. **Never** pass directory entries into the checkout, quote, cart, or authoritative pickup shop list.
- Protect against a single bad shop/menu request hiding every other independently verified nearby pickup shop: use `Promise.allSettled`, retain only verified shops, and keep the error if none validate.
- Order History: show truthful signed-out state instead of an endless loading skeleton; clarify that the confirmed pickup list does not import or delete older legacy records; ignore delivery rows in a mixed API response instead of treating all confirmed pickups as invalid; continue rejecting cross-account rows and fabricated prices.
- Preserve design, 4 km pickup eligibility, Firebase auth, P5 staging write lock, P5 Preview-only catalog API, and all real order protections.

## Release
Standalone Customer P6 branch based on draft P5 PR #26. Run tests/TS/build. Deploy a **new Preview only**. No DB writes, API backend changes, Production release or merge. The existing API CORS preview origin allows the P5 stable alias, not P6; P6 must be explicitly allowed by a separate safe API Preview configuration or use the same **immutable deployment URL** only after its exact origin has been added. Avoid claiming visual browse acceptance without device verification.