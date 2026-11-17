# LocalEats Customer — Safe Main Integration

**Date:** 2026-11-10
**Status:** Document-only main PR. No runtime change, merge, Production deploy or live order activation.

## Purpose
The owner wants tested LocalEats functionality eventually included in `main`. C1B–C1E staging identity safeguards, read-only diagnostic, and Profile correctness are maintained on stacked, unmerged branches. As checked 2026-11-10, the C1E Preview branch is **123 commits ahead** of `main` and includes additional work beyond the intended fixes. **Do not merge that full branch directly.**

## Safe selective integration plan
1. Audit `main` Customer baseline and Vercel Production Git-branch mapping. A Git merge could automatically deploy a web build; inspect before any merge.
2. Extract **only** a narrowly reviewed Customer bug/security fix into a fresh `main` branch (one PR per independently releasable fix). Preserve the original ShopCard and UI/UX.
3. Keep the server-authoritative pickup order creation, exact final quantity confirmation and 10-second review modal design behind tested read-only/current launch gates until the actual pickup tables, RPCs and merchant commands are ready.
4. Test with the current `main` dependencies: static auth, signing in/out, cross-account reset, CORS, closed-shop browse, proximity, old and new cart, double-tap/double-submit, mobile layout, no-write checkout.
5. Prove no Firebase client direct Supabase/Firestore profile write regression; no token copied into browser `localStorage`. Verify storefront, wallet, merchant, Riders and Rewards are not inadvertently activated.
6. Run isolated Customer Preview, manual owner acceptance, GitHub checks, code diff/privacy review, Production compatibility and rollback readiness. Require **explicit sign-off of that exact PR** before merging.
7. Do not claim cloud profile persistence without a backend receipt. Keep Rewards as coming soon until funded and formally activated. Current staging profile GET 404 and orders GET 503 are missing-schema/data results, **not** an accepted live-order system.

## Dependency gates for pickup launch
- Staging fresh backup and compatible clean-room restore **not verified**.
- Hosted `orders`, `pickup_order_events`, `pickup_create_order`, `pickup_order_command` **absent**.
- Customer and Merchant end-to-end protected pickup flow **not proven**.
- Live Production order/write flags **not approved**; keep disabled.
- Production backup and rollback rehearsal **not signed off**.

## What this PR does not do
No actual Customer code move or merge, no Vercel configuration change, no production build release, no database migration, no Firebase account change, no ordering/payment, no Rewards or wallet grant. This document is a **route to main, not approval to ship**.
