# L3-N8O — Main-first Customer security reconciliation and fastest safe public launch

**Date:** Friday, 20 November 2026. **Status:** Draft-only. No Production deployment, PR merge, Firebase Rules publish, hosted DB write, real account, live order, payment, FCM send or Rider activation.

## Public-release decision — do not confuse browse-only with accepting orders

The user wants LocalEats open to the public soon. Two separate launch gates are required:

**Public browse/preview pilot:** Serve Customer Production from an approved exact reviewed build, show genuine approved shops and item prices from an isolated/protected API, support sign-in after real Firebase project/rules acceptance, preserve original ShopCard/menu/cart, and clearly label that **ordering is not yet available**. This can be considered after browser, auth and privacy checks but does not constitute a food-ordering business launch.

**Real pickup-order launch:** The Customer production frontend AND Merchant production dashboard AND production API/database must be ready and use the exact same authenticated server price/idempotency contract. Test real configured merchant, real approved shop/menu, customer/merchant private isolation, payment-at-shop instructions, order notification, owner accept/mark-ready, customer collection, merchant handover, cancellation/expiry/race/double-order recovery, Firebase revocation/rules/CORS, database backup/recovery and observability. All three write gates and real ordering remain OFF until an independently approved production cutover, immediately followed by a verified stop/rollback mechanism. No delivery/Rider, online payment, LocalPay or subscriptions in pickup-first.

**Do not claim a completion percentage or public-order ETA from unit tests.** Many synthetic tests pass, but real matched hosted acceptance and DB readiness are not complete; the critical issue is untested real order flow, not cosmetic UI.

## Reconciled Customer branch — FROM CURRENT MAIN, not older staging base

`review/l3-n8o-main-first-pickup-security` was created from verified Customer `main` SHA `d5680332d391d9aa497d10ff047c839242b2d62f` after GitHub comparison confirmed unchanged HEAD. This retains all newly merged PR #59 quote/checkout behavior, `src/services/pickupReceipt.ts`, `src/screens/OrderHistoryScreen.tsx` pagination, and new receipt/history tests.

We replayed only narrowly scoped previously reviewed N8L/N8M security elements from older unmerged staging draft #122:

- `src/services/pickupMapping.ts`: replace raw `{...shop}` and `{...item}` spreads with validated, approved public ShopCard/menu fields. Explicitly preserve the remaining full `pickupCartIntent`, 4 km, max 20 items, no unauthorised order submission and real GPS rules from **current main**.
- `src/services/customerStagingNoDirectWrites.ts`: stage-only `localeats-staging` direct-write guard; Production Firebase project behavior unchanged. This is browser defense in depth, not a substitute for server permissions or Firebase Security Rules.
- `src/lib/firebase.ts`: prepend the guard to 13 legacy Firestore mutator methods (reviews, follows, chat, read receipts, profile mirror, token, shop/menu and Rider location). No new Firestore rules, default Firebase config or Production runtime branch selected.
- `src/lib/supabase.ts`: preserve main's Firebase Auth session and email/password sign-in; stage-only Firebase Auth account/credential writes blocked and stage-only mock `from(...).insert/update/upsert/delete` now returns a **truthful error** rather than pretending to persist. Nonstaging mock behavior remains unchanged. All sign-in paths/preview setup require independent Auth tests.
- `src/services/customerCommunityReadContract.ts`: dormant, GET-only review/follow/message contract; no App/ChatWidget import and no backend write route. Existing app reviews, follows and chat are **not** claimed migrated or active.
- Reused proven Customer N8L/N8M security unit tests, added N8O main preservation tests, and CI to run original pickup + latest main receipt + paginated-history suites, TypeScript and fake staging Vite build with no hosted credentials.
- No edits to `src/App.tsx`, `src/screens/CheckoutScreen.tsx`, `src/screens/OrderHistoryScreen.tsx`, `src/services/pickupReceipt.ts`, `src/pickup/client.ts` or currently approved checkout UX.

**Important:** This intentionally does not replay unrelated older isolated staging work (My-Kota private fixture, stage login UX or FCM env parity) because blindly overwriting current main would undo newer checkout/receipt/history features. They require explicit compatibility review and selective migration, not a wholesale merge of old branches. Staging Firebase env-based selection and baseline API host must be audited at deployment time.

## Live infrastructure evidence and blockers

- Vercel team `mehey9184-makers-projects` currently includes a **dedicated Customer staging** project, a Customer UX Preview project, dedicated API/Merchant staging projects and Merchant/API Production projects. There is **no separately identified Customer Production Vercel project** in the team's matching `local`/ `customer` project inventory; other hosting/providers or domains were not exhaustively audited. Do not assert a public Customer domain is live without checking its authoritative DNS/deployment.
- Dedicated Customer stage READY on **older** `c77736e7...`; dedicated stage API READY on **older** `ac4563cb...`. This reconciled N8O Customer branch is **not** coupled to the corresponding current reviewed API #206 `e3f18449...`. Vercel Preview from a PR in another project does not qualify as a dedicated paired staging acceptance.
- Merchant and API Production Vercel deployments remain at `a5168ccbbb37643a58ad4202c72b65dd43149c2e` at latest read-only check. Pickup order writes and profile writes are not activated by this task.
- Earlier read-only `LocalEats-Profile-Staging` Supabase public schema contains `shops`, `menu_items`, `profiles`, but not verified `public.orders/reviews/follows/messages` tables. This cannot be used as proof of a complete pickup order rehearsal or real storefront persistence.
- The **deployed** staging Firebase Rules release/source and backup/rollback remain unverified. Client-side guards alone cannot protect active Production Firebase. Independent API Firebase Admin service-account staging scope and two distinct approved Merchant owner mappings remain unverified.
- Legacy Customer `server.ts` retains client-priced/in-memory order fallback. Its reachability must remain blocked, separate from server-authoritative pickup API. The current controlled pickup client sends quote/create only through `/api/v1/orders`; do not replace it with historical Firebase callable or Express order fallbacks.
- Real push delivery was previously verified only for some Merchant browser scenarios and did NOT demonstrate real Customer checkout→Merchant→Customer ready push after hosted order acceptance.

## Owner-controlled remaining launch sequence

1. Pass this **current-main reconciliation CI** and manually review original ShopCard/menu/cart/checkout/receipt/history on small screen and desktop. Keep draft/unmerged.
2. Verify live Customer Production domain/hosting, API Production target, auth project and API CORS. Identify a single clear intended Production Customer deployment, rollback release and source commit.
3. Under separate approval, put exact reviewed Customer N8O source + API #206 source into **dedicated isolated staging** projects (no Production/alias change), with pickup/profile/community writes OFF. Audit full Vercel env project IDs, Firebase `localeats-staging` Firestore `(default)`, Supabase staging project, external redirect auth and CORS. Obtain actual published staging Firebase Rules snapshot and backup without disclosing keys.
4. Perform staging manual read-only acceptance. For real two-account A/B and order lifecycle, arrange separate owner-authorized disposable Firebase users and **approved shops** plus an isolated staging pickup schema/order table and scheduler — never pretend an in-memory synthetic test creates real orders. Produce evidence of customer→merchant→ready→collected plus notification and retry/idempotency tests **before** enabling production.
5. Conduct a strict production launch go/no-go with rollback and monitoring; only then explicitly authorize merging selected PRs, deploying public Customer/merchant/API Production and activating limited pickup pay-at-shop writes.
6. Keep reviews/follows/chat, Rider/delivery, card payments, LocalPay/rewards and subscriptions out of the first order-launch critical path unless their absence creates broken public UI; hide/disable misleading controls instead of silently claiming success.

**Current decision:** Security reconciliation prepared on latest main, but public **ordering launch is NOT READY**. Browse-only is potentially earlier after real hosted/domain/privacy checks. No automatic release or time estimate is inferred from CI.
