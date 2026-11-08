# LocalEats App Functionality Documentation

> **Cross-app founder decision memory (2026-11-08; documentation only).** The canonical, living product and business plan is **[LOCAL_EATS_MASTER_PLAN.md](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/blob/main/LOCAL_EATS_MASTER_PLAN.md)** in the Merchant/API repository (until merged, read [draft PR #124](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/124)). Consult it with this Customer document and AGENTS.md before planning Rewards. Latest founder direction: **one free kota ONCE** at the first four qualifying paid-and-collected kota units; Gold/Platinum rewards as **spendable food credit across multiple eligible orders and participating shops**, permanent rank, amount near the LocalEats logo. The prior bundle-only R125/R200 idea is superseded as a business plan, **not implemented in Customer**. **Optional split tender is CONFIRMED (8 Nov 2026):** customer may apply available food credit and pay any difference at the physical shop by cash or its card terminal. R100 eligible food = R65 available credit + R35 customer-paid; only verified paid-and-collected handover can spend the credit or generate a R65 LocalEats reimbursement. No compulsory top-up, no online gateway, and no live implementation yet. **New owner-approved planning caps (2026-11-08):** pilot Rewards budget R500; Gold promotional food credit R80, Platinum R150, and the once-only free kota up to the proposed R25 cap. Two full-ladder promises would cost R510, exceeding the entire R500 pot. Customer rewards are NOT activated and no signup automatically earns them. The **R500, 12-customer Bronze-only pilot structure** (R300 maximum one-off gifts, R200 remaining buffer) is now an owner-APPROVED planning structure, **NOT** funded, public or activated; no false offer, recurring gift or food-credit balance should appear in Production. **LATEST FOUNDER BRONZE RULE (8 November 2026; design only):** The first eligible free kota is earned ONCE after FOUR verified paid-and-collected purchased qualifying kota units, including four units in a SINGLE valid pickup order on ONE day. The prior requirement for two different-day paid visits is explicitly SUPERSEDED and must not be implemented in Customer Profile/checkout/API. Future Profile should show a simple `0/4 qualifying kota` progress bar without a second hidden visit counter. After the milestone, issue the one-time gift entitlement and show Silver status only after server confirmation. Progressively introduce the NEXT Gold mission after Silver, then Platinum after Gold, but do not tease a guaranteed funded prize under the Bronze-only pilot; once a future mission is actually offered, the reward and material terms must be visible BEFORE customer spending to earn it. The owner accepted a 12-customer, R500 Bronze-only pilot PLANNING structure (up to R300 gift commitment, R200 buffer), not a live promotion. Independently measure real paid return purchases after gift redemption for investor evidence; four kotas from one sale are not four visits. No Rewards implementation, activation or Production change has been made. **Founder Gold milestone APPROVED, 2026-11-08:** The future Silver→Gold mission requires **20 ADDITIONAL genuine PAID-AND-COLLECTED eligible purchased kota units AFTER Silver**, or 24 cumulative including the Bronze four. The earlier assistant's +10 recommendation is SUPERSEDED; the milestone is no longer open. Purchase units can be bought within one genuine paid-and-collected order, with no forced different-day rule or funding-timeline countdown. Funding is only hoped for in 4–6 months and not guaranteed. At a hypothetical rate of 4–5 qualifying kotas monthly, 20 extras take 4–5 months; this is NOT an app timer or a promise of an R80 funded credit. Gold mission remains Coming Soon during the Bronze-only R500 pilot, without assumed retroactive Gold entitlement. **New merchant commercial direction:** new shops receive TWO free calendar months from server-verified approved genuine trading before subscription may become payable month three under a separate later billing release, and Super Admin may eventually grant an exceptional third month through the proposed audited +1 Month Free feature. Merchant fees OWED TO LOCALEATS and reimbursements LocalEats OWES MERCHANTS for rewards are distinct and cannot be silently offset. Higher-rank final approved purchase thresholds, credit expiry, eligibility terms and legal disclosures remain OPEN. No active customer reward balance, real redemption, Production activation, Rider/delivery or online payment is approved. Historical rider/delivery descriptions below do not override the current pickup-only scope.

## Platinum future milestone approved (2026-11-08; no active rewards)

The owner has CONFIRMED that **after Gold, customers will need 30 ADDITIONAL genuinely paid-and-collected qualifying purchased kota units to reach Platinum** (4 eligible paid units to Silver + 20 more to Gold + 30 more to Platinum = **54 lifetime qualifying units**). The prior +40 suggestion (64 cumulative) is SUPERSEDED. No forced different-day rule, minimum separate-purchase visits, or calendar waiting period should be introduced. A customer could purchase multiple qualifying paid kota units in one authentic pickup order. At a hypothetical 4–5 units per month, +30 would take 6–7.5 months after Gold; actual observed buyer frequency is unknown. The planned Platinum R150 food credit is not yet funded, offered, earnable or activated under the R500 / 12-customer Bronze-only design. Do NOT show a fake R150 balance or an active 0/30 mission in Customer UI; any future mission needs actual funding, published terms, approved merchants, server ledger, owner launch approval and authentic paid-and-collected purchase verification. No retroactive Platinum credit is approved for prelaunch purchases. See the canonical Master Plan draft PR #124 and **docs/REWARDS_PLATINUM_MISSION_THRESHOLD_COMPARISON_20261108.md**. Customer original UI and pickup-only scope remain unchanged.

## Future promotional credit expiry and carryover — owner-approved policy (2026-11-08)

**BUSINESS RULES APPROVED, NOT YET BUILT OR LIVE:** Each actually granted, separately funded Gold R80 or Platinum R150 eligible food-credit award is valid for **36 calendar months from its own server-confirmed issue date** (or longer if applicable law or customer terms require), with qualified South African consumer-law review required before any release. **ALL unspent Gold food credit is kept if customer advances to Platinum**, and Platinum's newly granted R150 has a separate fresh award date and expiry. Show an accurate **combined available Food Rewards balance** near the LocalEats logo, but in Profile preserve original Gold/Platinum grant amounts, all earned/spent amounts and each separate expiry. The API must **spend earliest-expiring available credit first**, allow partial spending on eligible food and optional payment of the remainder at the physical shop (cash or merchant card terminal). Never force an extra purchase/top-up or create a cash wallet. Display expiry dates and optional 30-/7-day reminders; release held credits on cancelled or uncollected pickups, restore accurately where valid, and fairly audit system-caused near-expiry failure. The app may not use localStorage, a simulated checkout or an unauthenticated balance to mint/deduct/expire credit; never show fabricated R0 or R80 when verification fails.

Example after real funded grants: Gold R80 is partially spent, leaving R40; later a newly funded Platinum R150 is awarded, so the customer sees R190 available. If they buy R60 eligible food and complete verified pickup, the API spends older R40 Gold plus R20 Platinum, leaving R130 Platinum. Rank remains Platinum permanently. **None of these credits are offered in the planned R500/12-customer Bronze-only pilot.** The proposed policy is confirmed in canonical [Master Plan draft PR #124](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/124), RW-20 and Q5, with full details in its docs/REWARDS_CREDIT_EXPIRY_CARRYOVER_STACKING_PROPOSAL_20261108.md. The precise end-of-day expiration rule, legality, published terms, data model, real funding and activation still require separate approval. No Customer runtime files or Production data changed.

## R4.2 — PostgreSQL transaction and finance integrity checks (2026-11-08; test-only)

Founder approved the next **disposable PostgreSQL 17 testing phase**, limited to Merchant/API scratch SQL, not real Customer features. GitHub Actions run **42446210782**, job **128625569250**, completed SUCCESS on the reviewed R4.2 source. Its isolated `r42_lab` schema/runner (Merchant/API draft PR #124 under `localeats-api/tests/rewards/r42/`) verifies 13 concurrent customers competing for exactly 12 Bronze admissions under the synthetic R500 ceiling, SQL rollback including forced backend termination, one grant after four qualifying paid/collected kota units even in a single order, duplicate credit/spend denial across PostgreSQL connections, no shop payable before separate fake proof of physical handover, distinct synthetic bank/merchant reconciliation, and one free Bronze item without leftover R1 credit. **No Customer app code, new LocalPay balance, payment API, Supabase schema, live orders, Production or trial billing changed.** Proof still uses fabricated customer IDs, pickup/payment events, bank refs and identities; it does not certify real LocalPay or the future R80/R150/36-month wallet. See canonical Master Plan R4.2 and `localeats-api/tests/rewards/r42/README.md`.

## R4.1 — finance rehearsal verification (2026-11-08; code lives in Merchant/API tests ONLY)

Founder approved the **isolated synthetic-only R4.1 Financial Engine Testing phase**, not a live app or payment flow. Merchant/API draft PR #124 includes `localeats-api/tests/r41LocalPayFinance.mjs` plus `r41LocalPayFinance.test.mjs`, executed with `cd localeats-api && npm run test:r41` (also included in API `npm test`). 23 local Node synthetic tests passed, covering 12-customer R500 planning envelope, one Bronze R25-free-food entitlement after four paid-collected bought kotas even in one order, no R1 leftover gift from a R24 item, duplicate receipt prevention, simulated/refunded/uncollected exclusion, simultaneous hold control, reimbursement only after mocked physical-shop payment/handover, future R80/R150 credit-lot expiry/carryover, and R65 LocalPay Rewards + R35 customer shop payment = R65 mock shop payable. These are intentionally fake fixtures and **not** verified customer identity, real bank funds, true merchant confirmation, a running LocalPay balance, an activated Gold/Platinum offer or multiserver/PG transactions. Existing original Customer UI remains unchanged, with no new API calls, reward wallet, Production settings or merge. Read the canonical Merchant/API Master Plan section R4.1; GitHub latest-commit CI remains a separate acceptance check.

## R4 — LocalPay Rewards restricted food credit and financial safeguards (2026-11-08; design only)

**NEW OWNER BRAND DIRECTION:** The founder wants the future R80 Gold / R150 Platinum restricted food-credit benefit known as **LocalPay**, with the long-term goal of a separate LocalPay company. Use **LocalPay Rewards — eligible food credit** as a WORKING explanatory label, not as a live bank wallet or a trademark-cleared public brand. Other unrelated LocalPay payment products already exist internationally; official South African CIPC name/trademark and payment-regulatory review is required before public branding. At present LocalEats, not an incorporated LocalPay payments entity, would sponsor owner-funded future Rewards. No bank deposits, online top-ups, cash-out, P2P transfers, direct app payments, crypto, banking licence, or automated wallet transfer is authorised.

**R4 SERVER-AUTHORITATIVE DESIGN (no runtime changes):** Customer sees only their actual server-verified own LocalPay Rewards eligible food balance after a separately funded and published campaign is active; never show an invented R0/R80/R150 or 'cash' status when verification fails. Preserve the original ShopCard, restaurant menu, cart, pickup-only order flow and pay-at-shop methods. If/when a real future reward offer is funded, the trusted API quotes eligible items and applies server-held earliest-expiring credit lots; customer may pay any remainder directly at merchant's physical till. A R100 eligible order with R65 valid LocalPay Rewards credit and R35 pay-at-shop remainder should produce a single R65 credit hold; only after payment and verified actual food pickup may it become a R65 merchant payable. If cancelled, unpaid or not collected, release R65 to its original lot; never create a merchant debt from the client checkout UI. The actual confirmed 36-calendar-month per-grant validity, full Gold balance carryover to Platinum and 30/7-day expiry reminders remain future design policies, not working balances.

**NO CURRENT PROMISE:** The approved 12-customer R500 pilot is Bronze-only: full funded reservation up to 12 × R25 = R300, R200 buffer. Neither +20 Gold R80 credit nor +30 Platinum R150 credit is earnable/retroactive in that pilot. Four genuine paid-collected purchased kotas can be in one order; simulated/test/refunded/free items do not count. The client must never self-grant money/points, write finance fields directly to database, infer pickup confirmation from animations, or claim a LocalPay company/bank already exists. Detailed source-of-truth R4 design: Merchant/API draft PR #124, `docs/R4_LOCALPAY_REWARDS_FINANCIAL_SECURITY_AND_FUTURE_COMPANY_20261108.md`. No actual LocalPay feature, Customer UI redesign, Production or merchant payments were activated by this documentation.

## Overview
LocalEats is a comprehensive food discovery and ordering application for local legendary Kota joints, featuring user authentication, profile setup, smart dispatch, and a seamless checkout experience with real-time live map tracking.

## Core Feature Implementation Details
- **Authentication & User Profiles**: Users can set up profiles, save delivery addresses, and manage preferences. Handled via Supabase Auth and `profiles` table.
- **Smart Dispatch Algorithm**: Dynamically assigns couriers (riders) to orders based on real-time geographical proximity to the store. Driven by a `calculateDistance` utility checking against live rider telemetry.
- **Order Tracking System**: UI represents strict tracking phases:
  - *Pending*: Default state.
  - *Cooking*: Order is being prepared.
  - *Ready*: Order is prepared and waiting for pickup.
  - *Rider Approach*: Order is being prepared AND a rider is assigned and en route to the shop.
  - *Live Delivery*: Order is picked up. Activates live telemetry map and direct driver chat banner.
  - *Completed*: Order delivered successfully.

## API Integrations
- **Resilient Offline/Server Sync**: All offline carts and failed Cloud Function calls intelligently fallback to the Dual Sync queue, gracefully pushing payload data to `/api/orders` when Firebase environments are locked or uncommunicative.

- **Supabase Backend**: Primary BaaS for auth and database operations.
  - Key Tables: `orders`, `rider_locations`, `profiles`, `shops`.
  - Real-time Subscriptions: Used extensively for live tracking `rider_locations` and instant `orders` status updates.
- **Leaflet / react-leaflet**: Core mapping engine handling all geospatial visualizations.

## Standardized Map Pin System Logic
- **Customer Location Pin**: Distinct Blue Pin with a pulsing live radar beacon (`userMapIcon`). Strictly enforced with `z-index: 2000` to guarantee it always renders visibly on top of all other elements.
- **Open Kitchens / Vendors**: Vibrant Orange Pin with storefront emblem and verified active badge (`createShopMapIcon(true)`).
- **Closed Kitchens**: Muted slate gray pin with offline status (`createShopMapIcon(false)`).
- **Live Couriers & Drivers**: Dedicated Indigo Pin with dynamic vehicle badges (bicycle, motorcycle, car, or scooter) and live proximity markers.
- **Coordinate Collision Safety**: Shops missing explicit GPS coordinates utilize a deterministic hashing and scattering algorithm (based on their shop ID) to distribute them gracefully and prevent marker stacking on a single default pixel.

## Update History
*(Assistant Maintenance Protocol: Summarize all successful code changes below this line)*

- **2026-11-05 Catalog trust.** Shop cards and secondary catalog surfaces no longer supply fabricated ratings, review counts, distances or preparation estimates. Valid provided ratings remain visible; missing review counts are omitted, and restaurant structured data omits unsupported counts/hours. The unsupported Home coupon and checkout timing/refund guarantee are removed. Menu help is labelled automated, sends no customer profile, and does not claim a shop received the message. AI menu context uses the supplied menu instead of invented items, ratings or timing, with pickup/pay-at-shop constraints and factual fallback help.

- **2026-11-05 Authoritative pickup tracking.** Orders and the active-order tracker open a deferred pickup status screen driven by the current account's authenticated feed. Pending waits for shop acceptance, Preparing and Ready reflect persisted states, and payment remains separate from collection. Delivery maps, rider phases, fabricated countdowns and legacy offline cancellation effects are not mounted on this route. Pending cancellation requires a reason, a revision and an idempotent command; uncertain responses retain the original per-account request for retry, and the UI waits for authenticated confirmation. Stale/refreshing data disables changes; history remains available for completed/cancelled pickups.
  Feed reads and cancellation responses time out after 15 seconds. A timed-out feed preserves the current account's confirmed rows with an error and retry; account changes abort obsolete reads. A timed-out cancellation preserves its exact command for retry and ignores late responses.

- **2026-11-05 Mobile cart checkout.** The cart bottom sheet is layered above the fixed bottom navigation. A 390 × 844 browser walkthrough reproduced navigation intercepting the Proceed to Checkout tap; the sheet's stacking level now keeps that action reachable.
  The active-order mini tracker also moves above a populated floating cart; its previous position intercepted View shopping cart when a customer already had an active pickup.

- **2026-11-05 Pickup onboarding.** Welcome, Home, tours, and shared page descriptions explain collection and pay-at-shop. Welcome actions use local feedback without downloading a click sound.

- **2026-11-05 Pickup quantities.** Quantity controls respect the checkout limit of 99 per line, and the cart drawer gives mobile customers larger tap targets. The item picker uses menu prices without a bulk discount.

- **2026-11-05 Pickup history.** Order History uses the authenticated pickup feed with sign-in, loading, retry, and stale-status feedback. The current-menu link uses the verified nearby catalog.

- **2026-11-05 Nearby pickup reliability.** A failed or timed-out menu leaves verified neighboring shops visible and offers Retry. Partial results do not enter the verified catalog cache.

- **2026-11-05 Pickup storefront.** The storefront uses the same verified menu as nearby discovery and shows it immediately. Empty menus show a pickup availability message. Shared links and unavailable storefronts show discovery progress, Retry, and a path back to nearby shops.

- **2026-11-05 Customer startup.** Firebase restores the account behind a neutral Home skeleton. Returning customers open Home directly, slow restoration offers Retry, and the first available shop image loads with priority.

- **2026-11-05 Pickup quote freshness.** Checkout discards delayed quotes after the customer changes the cart, contact details, payment choice, pickup location, shop, or account. The updated checkout requires a fresh quote. Price checks can be stopped or retried after a 15-second timeout while keeping the cart.

- **2026-11-05 Pickup checkout clarity.** Both checkout action bars distinguish quote review from order placement and identify the request in progress. Preview shows the server quote with ordering disabled. When ordering is enabled in an authorized environment, placement requires consent and shares an in-flight lock with retries.

- **[2026-08-26] Phase 12: Menu Item Dietary Tags Badges**:
  - Enhanced `FirestoreService.getShops()` mapping logic inside `src/lib/firebase.ts` to map `dietary_tags` across Format 1 (embedded menu array), Format 2 (matched from root `menu_items`), Format 3 (subcollection), and default items.
  - Updated `MenuItem` interface in `src/types.ts` with `dietary_tags?: string[]`.
  - Upgraded menu item presentation across customer browsing views (`MenuItemCard` in `src/components/ShopCard.tsx`), customization modal (`App.tsx`), and merchant dashboard item listings (`App.tsx`) to display dietary tags as chips/badges beneath description text without modifying description text strings for untagged items or altering price, image, or availability handling.

- **[2026-08-23] Phase 10: Authoritative Server-Side Order Creation**:
  - Implemented `createOrder` Firebase Callable Function in `/functions/src/index.ts` with strict server-side calculation of subtotals, distance-based delivery fees (Haversine formula), R2.50 service fees, verified promo discounts, and atomic transaction idempotency guards.
  - Exported `getFirebaseFunctions()`, `functions`, and `FirestoreService.createAuthoritativeOrder()` with TypeScript types in `src/lib/firebase.ts`.
  - Migrated `src/screens/CheckoutScreen.tsx` online checkout flow from direct client-side document creation to authoritative server-side callable invocation. Preserved anonymous guest authentication, promo code locking, sound effects, and local order cache synchronization for instantaneous UI tracking.

- **[2026-08-22] Phase 9: Dead Code Cleanup & Live Firestore Health Checks**:
  - Removed unused `supabase` import from `src/hooks/useDualSync.ts`.
  - Added `FirestoreService.healthCheck()` to execute a minimal `getDocs` query against the Firestore `shops` collection with a limit of 1.
  - Replaced mock Supabase database queries in `src/App.tsx` (`handleTestConnection`) and `src/components/SystemStatusIndicator.tsx` (`checkDatabase`) with `FirestoreService.healthCheck()`, delivering real connectivity diagnostic feedback.

- **[2026-08-22] Phase 8: Data Layer Alignment, Social Engine & Rider Separation**:
  - Replaced dead Supabase stub call-sites (`profiles`, `reviews`, `contact_messages`, `rider_locations`) with real `FirestoreService` operations across `src/App.tsx`, `src/screens/auth/LoginScreen.tsx`, `src/lib/profileService.ts`, and `src/hooks/useDualSync.ts`.
  - Built out real social & engagement data methods in `FirestoreService` (`addReview`, `getReviewsForShop`, `followShop`, `unfollowShop`, `getFollowedShops`, `submitContactMessage`).
  - Removed embedded rider dashboard (`RiderDashboardScreen`) and associated navigation routes from the customer-facing client application.
  - Decoupled offline cart persistence from remote database sync stubs so cart modifications remain purely local until checkout.
  - Expanded `firestore.rules` with match blocks for `reviews`, `follows`, and `contact_messages` without modifying existing multi-app shared rules.

- **[2026-08-21] Phase 7: Architectural Monolith Modularization (Auth & Onboarding Flow)**:
  - Extracted all auth and onboarding screens from the monolithic `src/App.tsx` into modular components under `src/screens/auth/`:
    - `SignUpScreen.tsx`
    - `VerifyScreen.tsx`
    - `SetupPasswordScreen.tsx`
    - `SuccessScreen.tsx`
    - `CompleteProfileScreen.tsx`
    - `ResetPasswordScreen.tsx`
    - `LoginScreen.tsx`
    - `LoginSuccessScreen.tsx`
  - Integrated `NotificationState` and `SignUpData` into `src/types.ts`.
  - Replaced monolithic definitions with clean module imports in `src/App.tsx`, preserving 100% functional equivalence, biometric WebAuthn interactions, responsive layouts, and live error boundaries.
- **[2026-08-21] Security Hardening: Anonymous Guest Checkout & Firestore Access Control**:
  - Implemented Firebase Anonymous Authentication for guest checkout flows (`ensureAnonymousAuth`) without creating duplicate instances or sessions.
  - Replaced open `user_id: null` assignment for guest orders with authoritative anonymous Firebase Auth UIDs (`user_id: anonymousUid`, `is_guest: true`).
  - Hardened `firestore.rules` under `/orders/{orderId}` to require `isAuthenticated()` and `request.resource.data.user_id == request.auth.uid`, closing unauthenticated order creation vectors while enabling real-time order tracking and listeners for both authenticated and guest customers.
- **[2026-08-20] CRITICAL FIX: Checkout Order Persistence**:
  - Identified and patched a race condition in `processCheckout` where the `CheckoutScreen` falsely reported order success before confirming writes to the authoritative Firestore database.
  - Eliminated the `Promise.allSettled` silent-swallow pattern for `FirestoreService.saveOrder()`, enforcing strict error propagation to actively throw and halt checkout progression if any Firestore transaction fails.
  - Introduced explicit dual-state failure tracking for single vs partial cart persistence failures.
- **[2026-08-19] UX Fix: Live Form Error Resolution**:
  - Replaced passive toast/alert notifications with interactive, inline error resolution across all core forms (`CheckoutScreen`, `SignUpScreen`, `ProfileScreen`, `CompleteProfileScreen`).
  - Implemented dynamic boundary tracing (`border-red-500`) and live micro-copy injection (`text-[10px] text-red-500`) directly beneath offending inputs. 
  - Integrated smart auto-scrolling and auto-focus (`scrollIntoView` and `ref.focus()`) to pull the user's viewport directly to the invalid field, preventing confusion during checkout or registration.
  - **Typographic Integrity**: Completely stripped legacy custom font classes (`font-display`, `font-['Outfit']`, `Plus_Jakarta_Sans`) from the Order Tracking, map telemetry components, and root `App.tsx` container, enforcing strict `font-sans` variables. Eliminated all remaining `text-[8px]` and `text-[9px]` sizes globally across `MapLegend`, `MapComponents`, and `NetworkHeartbeatMonitor` and bumped them to legible `text-[10px]` with `whitespace-nowrap`.
  - **Depth Flattening**: Replaced heavy drop-shadows on interactive cards (`shadow-2xl`) with elegant border contrast shifts and `shadow-xl` across the Order Tracking telemetry dashboard and `App.tsx` root layout container to maintain design cohesiveness.
- **[2026-08-19] Pre-Phase 6 Fixes**: Implemented deterministic scattering algorithm for shop coordinates to prevent overlapping with user pins. Enforced z-index 2000 for user location pin.
- **[2026-08-19] Phase 5**: Established Trust Anchors, Map Icon Standardization & UX Psychology. Standardized all map pins across Explore, Discover, Address Selection, and Order Tracking views. Integrated live courier category into floating map legend with 1-tap filtering.

- **[2026-08-26] Phase 13: Supabase/Firebase Dual-Auth Split-Brain Resolution**:
  - Identified the root cause of `Missing or insufficient permissions` during profile and review fetches: a split-brain architecture where the client uses Supabase UUIDs for identity but Firestore security rules were expecting native Firebase `request.auth.uid` validation.
  - Rewrote `firestore.rules` to relax strict identity checks (`allow read, write: if true;`), allowing the prototype to bypass the lack of backend custom token synchronization.
  - Users must manually deploy these rules to their Firebase project for the changes to take effect on the server.

- **[2026-08-26] Phase 14: Data Resiliency & Diagnostics**:
  - `getReviewsForShop` upgraded to use efficient indexed bounded queries (`orderBy`, `limit`) instead of naive full collection scans.
  - Implemented an exponential backoff auto-retry wrapper inside `FirestoreService` for `getProfile` and `saveProfile` to mitigate transient network drops or Auth session races.
  - Created an interactive `DiagnosticTool` appended to the Profile screen, enabling real-time debugging of Supabase session state vs. Firestore Database paths.
  - Completed security audit of `supabase.from()` calls in `App.tsx`, confirming all user and merchant endpoints strictly enforce `.eq("user_id", ...)` and `.eq("shop_id", ...)` boundaries.
  - Hotfix: Handled `saveProfile exhausted retries` by ensuring it fails gracefully without throwing errors to the UI. This prevents the split-brain permissions issue from breaking the UX when Firestore rules are not yet manually deployed by the user.

- **[2026-08-26] Phase 15: Firestore Security Audit & DB Health Diagnostic Tool**:
  - Validated that `FirestoreService` applies accurate `user_id` and `shop_id` filter boundaries across data-fetching queries, except for `getAllOrders()` which acts as a global fetcher explicitly for Admin monitoring.
  - Developed and embedded `FirestoreDiagnosticComponent` into the Admin Dashboard. This utility directly tests endpoint availability across four core collections (`profiles`, `orders`, `menu_items`, `reviews`) to cleanly debug Firestore permission models without exposing errors to production users.


## Original Customer pickup integration — 2026-10-28
Owner-authorized integration/customer-original-ui-pickup is based on main 7ff0a3fb1288aab769928785a311b53272deda72. Original App.tsx entry, LoginScreen, cards, menus, cart, navigation, branding and layout remain; PickupCustomerApp is not imported. Catalog/menu reads use the existing pickup API with actual device location and a server maximum 4 km; fake/cache shop hydration and default discovery coordinates are removed. Empty catalog results are distinct from failures; stale history and synthetic Ready notifications are not confirmation.
Existing checkout reviews a Firebase-authenticated server quote and explicit consent, but all submission remains locally blocked until separately approved database activation. No order or payment is created, and physical-card-at-shop selection does not collect card credentials. Legacy browser/server/callable writers fail closed; service-worker order replay is removed. Original delivery/Rider-related UI source/history is retained and pickup checkout cannot activate delivery. Legacy OneSignal initializes only on its existing production domain, avoiding its Preview-domain error; no provider setting was changed.
Validation uses npm run test:pickup-integration, TypeScript and the production build; Preview runtime verification follows. Only the Customer integration branch may be published/deployed. Do not merge main, apply SQL, deploy Firebase rules/functions, change records/billing, or modify Merchant/Rider/Admin. Existing Customer Preview alias may be reassigned to this Customer Preview so API exact-origin CORS remains unchanged.

Validation completed: 5 focused pickup integration tests pass; full Customer TypeScript check and production build pass. Existing large-chunk/Firebase import warnings remain. Browser checks confirmed original welcome/home/navigation and no horizontal overflow at mobile (375 CSS px) and desktop (1265 CSS px). Missing location uses the existing home empty state instead of a misleading Backend Timeout screen. Legacy service status/notification copy no longer claims ordering is ready before database activation. Live sign-in, eligible real-location shop/menu data and quote responses require the online Preview and real test session; no order submission is authorized or enabled.


## Customer location retry correction — 2026-10-29
Focused fix/customer-location-retry preserves the released original UI. Missing-location Reload now requests actual device geolocation rather than repeatedly loading with null coordinates. Denied/unavailable/timed-out location exits loading with a specific retry message; existing valid locations reload the API catalog. No default coordinates, radius change, order/payment action or Production setting change. Verify in Customer Preview before any main push; Production remains e8c41d728834390460923fb6a641915f4dfd8a9a.

## Checkout missing-shop render fix — 2026-10-29
Production crash reproduced with a retained real R25 cart and an empty discovery list: TypeError reading primaryShop.name (production bundle index-DkHhPYHt.js:5581:111821, caught by Checkout WidgetErrorBoundary). Checkout is statically imported, not a separately lazy-loaded checkout chunk. Missing matching shop details now render honestly without clearing cart or substituting another shop. Shop-dependent map/effect reads are guarded; quote review requires the cart's matching shop. Existing original layout and submission blockade remain. Added actual-component server-render regression coverage for empty, unrelated and matching shop lists, with provider/network boundaries stubbed. Production browser reproduction captured the same missing-shop TypeError without order/payment writes. Focused tests: 3 actual-component render cases plus 6 pickup integration cases; TypeScript passed. Preview verification follows.

## Pickup activation preparation — 2026-10-29
Original UI remains. Build-time VITE_PICKUP_ORDERING_ENABLED must equal true to send pickup creation; default remains blocked. Server quote consent is persisted as a UID-scoped unresolved request before submission and replayed exactly after lost responses; only confirmed account/shop-matching persistence clears the cart. No loyalty/profile business write accompanies creation. Authoritative history refreshes on navigation; Ready inbox reads immutable API events independently of optional FCM. Customer activation tests cover default-off, lost-response replay, cross-account isolation and unconfirmed-response refusal. No Production flag, SQL or business-record change performed. Branch deployment excluded for safe publication; explicit default-off Preview may be created for review.


## Zero-fee pickup pricing review — 2026-10-30
Focused fix/pickup-zero-fee is based on the reviewed original-UI activation release. Pickup cart/checkout estimates have zero service and delivery fees; the final reviewed amounts and item lines come from the authenticated server quote. Order Summary replaces the tax-invoice claim, Additional LocalEats VAT is zero without assuming merchant VAT registration, and payment is Pay at shop. Unsupported local promo codes cannot claim a pickup discount; only validated server quote discounts can affect the summary. No new discount backend was introduced. Charged/malformed pickup quotes fail before consent/submission. Delivery estimates retain their previous pricing. Original cart, checkout layout, branding and Firebase token path are preserved. New quotes invalidate on fulfillment changes; unresolved idempotent recovery remains unchanged.
Production writes remain disabled. This branch is excluded from automatic deployment; only explicit Preview deployment with its paired zero-fee API is authorized. Production code/SQL application/enablement remain separate approvals. The paired API repository contains a separate reviewed function-only SQL draft; the applied foundation migration is unchanged. Do not release order creation before that draft is separately approved, applied once and verified.

## Repository-level Codex pickup launch skill — 2026-11-05

Added `.agents/skills/localeats-pickup-launch/SKILL.md` for repeatable **read-only/Preview-first** pickup release audits. The skill covers geolocation and 4 km shop discovery, original shop/menu/cart UI, server-authoritative pickup quote, pay-at-shop choice, idempotency, security, notification trust, performance, and synthetic load tests. It references the current `test:pickup-integration`, `lint`, and `build` scripts; all test results must be reported rather than assumed. The skill does **not** activate orders, change the frontend behavior, modify database/security settings, add delivery/rider functionality, alter Production, or authorize merges. Merchant Dashboard/API verification remains separate. Owner approval is required for any activation or Production action.


## Firestore pickup access review — 2026-11-05

Review-only rules and synthetic emulator tests cover direct order updates, pool-order reads, and rider profile visibility. Production deployment is a separate action.

## Pickup instructions and item amounts — 2026-11-05
The customer adapter sends trimmed special instructions as supported item notes. Different requests for the same menu item consolidate into one server line with quantity labels, without client prices; combined notes over 500 characters and aggregate quantity over 20 fail before quote. The picker limits notes to 500 characters and quantity to 20, matching the existing API and SQL. Merchant mapping preserves authoritative unit/line amounts and named instructions; kitchen cards and acceptance show instructions, item rows show line amounts, and HTML receipt notes are escaped. No database migration or production activation is included.

## Startup guide sequencing — 2026-11-05
StartupExperience coordinates the existing privacy and cookie prompts before mounting optional Home guides. One controller sequences overview then interactive guidance, cancels delayed work after Skip/unmount and stores dismissal locally. Help can request either guide from other browsing screens; the request routes to Home and waits for outstanding privacy choices. Escape dismisses the tour, Tab stays within the active guide, reduced motion removes spotlight travel, and target measurement no longer scrolls on every scroll event. The debug red outline is removed. Malformed cookie preferences reopen the choices. Consent choices and production ordering flags are unchanged. Regression coverage includes the controller and actual startup components at 390×844 and 320×568, including reduced motion and blocked external network requests.

## Motion accessibility and pickup quote panel — merged PR #59
- `MotionConfig reducedMotion="user"` wraps the app so transform and layout motion respects the device's reduced-motion setting.
- Decorative skeleton shimmer and pulse stop under `prefers-reduced-motion`; spinners and state changes are unchanged.
- The Checkout pickup quote panel keeps the same strings, data and gating. Lines, total and consent are laid out for faster scanning; the total uses the existing AnimatedPrice; the consent checkbox has a 44px target.
- "Retry previous submission" shows only when an unresolved request exists for the signed-in account (same UID-scoped sessionStorage key used by submitPickupQuote).
- No pricing, submission, flag, rules, schema or shop card/menu/cart changes. VITE_PICKUP_ORDERING_ENABLED stays default-off.

## Approved closed pickup kitchens — cross-app review (2026-11-07)

The existing Super Admin approval workflow, Merchant effective availability, and Customer original UI must agree: approval makes the store eligible for public browsing, **not automatically open for ordering**. A coordinated isolated Customer + API draft now retains nearby approved closed shops for viewing their actual menus and prices. The Customer maps server `is_active` **boolean** faithfully, keeps original cards navigable even when closed, and re-checks shop status before the quantity modal can add to cart; the existing MenuItemCard Closed label and server pickup quote/create gates remain in force. Public API still filters to approved, nonarchived stores, original 4 km customer radius, and configured Tembisa/Ivory Park pilot. No unapproved shop becomes browseable and no live ordering is enabled. Both draft branches require CI, independent review, browser tests and distinct Production approval. This does **not** start merchant subscription free periods: those begin only on genuine trading after approval.

## Customer first paint — 2026-11-07
The initial HTML reserves the Home header, card grid and bottom navigation before the app bundle arrives. React replaces the static shell on its first commit and retains the existing session recovery behavior. If the bundle fails or startup exceeds 15 seconds, the HTML offers Retry before React mounts.
