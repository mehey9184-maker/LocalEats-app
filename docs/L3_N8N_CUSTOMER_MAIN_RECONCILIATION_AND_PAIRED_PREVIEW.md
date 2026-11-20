# L3-N8N — Customer main reconciliation and paired API Preview readiness

**20 November 2026 · source audit/CI only · DO NOT merge this branch directly to main.**

## Current Git state

Connected GitHub comparison shows:
- `main` at **`d5680332d391d9aa497d10ff047c839242b2d62f`**, following checkout UX PR #59 and subsequent verified pickup receipts/paginated history changes.
- Staging N8M Customer draft #120 at **`ad4f523dd6ea3251cbe154864050255f4be48616`**, based on earlier dedicated stage `c77736e7b4878965baa31ec2ada8138f554d6a7f`; there are **divergent commits**.
- Stage Customer Vercel is READY for the older `c77736e7...` branch, not the N8M reviewed SHA. The API staging Vercel project is READY for an older N8G branch rather than N8M API #204.
- There is **no paired exact Customer+API deployed revision**, and passing fake-Firebase CI or a separate Merchant frontend Preview is not proof of that pair.

New main behavior to preserve in a **future owner-reviewed reconciliation branch**, not to overwrite or backport blindly: `src/App.tsx`, `src/pickup/client.ts`, `src/screens/OrderHistoryScreen.tsx`, `src/services/pickupReceipt.ts`, and their recent receipt/history tests. Retain PR #59's quote panel/reduced-motion work, original ShopCard, menu, cart and real-location pickup flow. Do not merge these older #119/#120 draft branches into `main` unchanged.

## What the frontend actually talks to

| Source | Operation | True backend classification | N8N action |
| --- | --- | --- | --- |
| `src/lib/supabase.ts` | `supabase.auth.*`, `.from()`, `.rpc()` | Firebase Auth compatibility layer; `.from()` is a mock promise chain, not a direct Supabase PostgREST call; `.rpc()` is an error | **Retain for now**, catalog call sites separately and never assume an import is a direct DB access |
| `src/screens/CheckoutScreen.tsx` | `supabase.from("orders"/"rider_profiles"/"promo_codes")` | Mock-compatible read without verified network persistence | Never use for authoritative discounts, eligibility or accurate rider/transaction counts |
| `src/services/customerPickup.ts`, `src/pickup/client.ts` | `GET /api/v1/catalog/pickup-shops`, menu, `POST /api/v1/orders/quote`, `POST /api/v1/orders`, history | **Controlled pickup API**, real GPS/approved shop scope and authenticated server-side quote/submit | Preserve; pickup ordering OFF until separately approved |
| `src/lib/profileService.ts` | `fetch('/api/profiles')`, `FirestoreService.saveProfile`, local queue | **Express API + direct Firestore write**, not an RPC. Offline queued/cached success is not confirmed server save | Review server UID/role checks; remove/secure profile mirror only after independent staged backend contract |
| `src/hooks/useShopsData.ts` | `FirestoreService.getShops/listenToShops`, `fetch('/api/v1/shops')` | Legacy direct Firestore read/listeners and Express API merge; optional demo shop seeding | Do not use to replace authoritative pickup catalog or trust live state without approval |
| `src/lib/firebase.ts` | `reviews` getDocs/addDoc; `follows` getDocs/setDoc/deleteDoc | Direct browser Firestore community reads/writes | N8L staging writes guarded, N8M GET-only server contract **unmounted**. No authentic purchase/persistence proof |
| `src/lib/firebase.ts` | `messages` onSnapshot/setDoc/writeBatch | Direct browser chat and read receipts; browser supplies sender role/UID | **High privacy risk** until API checks verified pickup participants; no writes approved |
| `src/lib/firebase.ts` | `profiles/user_push_tokens/rider_profiles/shops/menu_items` | Direct browser Firestore reads/writes and location | Stage browser guard defense only, not a substitute for deployed Firebase Security Rules |
| `src/lib/firebase.ts` | `FirestoreService.createAuthoritativeOrder` | Historical Firebase callable backend, separate from controlled pickup API | Do not activate legacy checkout/delivery. Compare real reachable guards before any live order |
| Customer `server.ts` | `supabaseAdmin=createClient(...SERVICE_ROLE_KEY)` and `/api/orders` | **Actual server-side Supabase**, not browser data access. Legacy client-price/in-memory order fallback needs review | Flag as an activation blocker; no data/security changes in N8N |
| `src/services/customerCommunityReadContract.ts` | Prepared secure GET-only API adapter | **Dormant in draft #120**; App/ChatWidget do not use it | No claim reviews/follows/chat replaced or live |
| `src/services/customerStagingNoDirectWrites.ts` | Reject direct writes if Firebase project `localeats-staging` | **Browser-only** staging protection in unmerged #119/#120, not published Firestore Rules | Keep stage-only; never assume malicious clients cannot bypass it |

This is **source-based classification**, not a packet capture. Graphify's index can help locate imports and callers but alone cannot prove a network connection, an order path reachable in Production, or end-to-end permission coverage. Relevant work for Claude: fully map active versus dormant call sites on **latest `main`**, especially legacy order fallback, coupon/rider claims, Auth/Firestore mirror and current receipt/history behavior. Our N8N branch is **separate** from that investigation and makes no UI/checkout edits.

## Release blockers and testable next actions

1. Reconcile latest Customer `main` with the N8L/N8M stage guards and dormant contracts in a new **isolated** branch after separate review; never overwrite newer main checkout/receipt changes.
2. Pair exact independently reviewed Customer and API commits on **dedicated** Vercel staging projects `localeats-customer-staging-r52d` and `localeats-api-staging-r52d` with Preview-only environment config, explicit owner stage approval and no Production alias changes.
3. Verify stage Customer uses `localeats-staging` Firestore `(default)`, correct staging API origin, API Admin-project and isolated Supabase credentials without revealing secrets. Current stage API URL metadata is correct but deployed commit is not.
4. With no credentials or live data, check only safe public health, real GPS-bound catalog and menu, CORS, 401/403 and write gates. No manufactured user location and no real POST, signup, shop mutation or FCM sends.
5. Retain all stage/profile/order/community write flags OFF; do not publish N8J/N8K Rules until **actual deployed** stage Rules source/rollback and Customer compatibility have been verified; do not create two stage Merchant identities/shops without distinct owner authorization.
6. For each unmet test, report BLOCKED rather than a fabricated `READY` result; green synthetic tests are not hosted A/B acceptance.

`tests/l3-n8n/customer-main-merge-risk.mjs` is a pure reconciliation gate. Tests deliberately establish that **this review branch is not yet rebased/reconciled with main**; they do not perform Git operations, request network data, deploy the app or enable checkout.

**Release decision: NOT READY FOR MERGE OR PAIRED HOSTED ACCEPTANCE.** This branch contains only offline audit, CI and documentation.
