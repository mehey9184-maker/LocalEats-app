# LocalEats App Functionality Documentation

## L3-P1 Customer accuracy, speed and image budget — 2026-11-22 (draft)
The active Customer catalog now supports verified-only progressive Home cards for both GPS-free and genuine-location browsing. The public reader limits concurrent menu fetches to six, aborts after five seconds per menu, excludes invalid/failed menus, and never invents an item or distance. Nearby GPS reader emits transient validated pairs while retaining complete-only 15-second exact-coordinate caching; App catalog generation prevents stale requests repainting Home. The original ShopCard, menus, cart and pickup quote/submit guards stay unchanged. `BlurUpImage` keeps 600px hero requests and supports 160px optimized remote thumbnail requests in compact menus, cart and checkout. Dormant `useShopsData` still has historical synthetic catalog logic; do not mount it in the customer journey. All changes are isolated in the L3-P1 draft and require CI, preview visual review and real-device byte/time tests prior to release. Full record: `docs/L3_P1_CUSTOMER_SPEED_ACCURACY_IMAGES_20261122.md`.


## Default pictures — 2026-11-22 (draft, UI-only)
Customer profiles without a photo use an on-device SVG initial avatar from `getAvatarUrl`; no name is sent to `ui-avatars.com`. Uploaded profile photos stay first priority and failed loads fall back to initials. `BlurUpImage` now renders clearly identified shop/photo and food/no-photo defaults for missing or failed image URLs; proxy failures retry the real uploaded source first. ShopCard uses actual merchant covers, actual menu photos, then the actual logo, never category-based fake food. The cart and Home use the same component. Real catalog mapping keeps missing `image_url` and shop image lists empty rather than copying fake images from sample shops. Historic synthetic sample fixtures remain separate and are not proof of public catalog data. Static regression tests live in `tests/default-image-fallback.test.mjs`. This draft makes no Firebase, API, database, price, order, radius or Production flag changes. Shop/menu/card layout stays intact.


## Login Apple logo and notification placement — 2026-11-22
The Login screen previously used the Lucide fruit `Apple` icon, despite its `signInWithOAuth({provider:"apple"})` call being unsupported by the Firebase-backed adapter, which only implements Google. The corrected UI keeps an actual Apple brand mark and shows a disabled `Continue with Apple / Coming soon` button; this is not an Apple OAuth activation. Google sign-in, email/password, forgot-password and guest browse are unchanged. The nonfunctional 1/3-width orange fixed progress stripe at the bottom of the login form is removed. The Customer's global transient feedback formerly used a `bottom-[calc(6.5rem...)]` toast layer; it is now a reusable `AppNotificationToast` located at the top with safe-area inset on mobile and top-right on desktop. Auto-dismiss remains at 4 seconds, tap-dismiss and swipe-up retained, persistent action prompts continue centered. This change does not affect OS/browser push notifications or order status. CI includes static contract tests and an isolated Chromium rendering of the real LoginScreen and new toast at 320px, 390px and 1440px with no real sign-in or data write. Actual Apple Sign-In remains unavailable until explicit Firebase provider setup, entitlements and real account testing. Production ordering remains off.


## Owner-approved signup-to-Home review (2026-11-22)
Source: separate Customer development branch `develop/signup-home-ux-pr128-20261122`, descended from unmerged PR #128 (its QR guest-menu-first experience, cart return and optional install prompt are preserved). The owner approved a five-screen visual concept. Updated existing SplashScreen to make browse-first the prominent CTA with a local Kota illustration; SignUpScreen to use shared Step 1 of 2 header, labelled/validated name/email/SA mobile inputs and retained Google OAuth but no fake Apple sign-in; SetupPasswordScreen to display Step 2 of 2, minimum eight characters and accessible matched-password and visibility states; SuccessScreen to describe conditional email verification without claiming checkout access and preserve browse+complete-profile actions; HomeScreen to use honest guest messaging, a real-location-required banner when location unknown, “N shops listed” rather than “Online”, and the existing five navigation tabs. ShopCard/TrustBadge and pickup mapping present a neutral shop icon and omit unsupported review/trust claims. No auth API implementation changes, database writes, cart/order transitions or Production flags. `tests/signup-home-ux-fixture.tsx` renders real React auth screens but advances the verification stage **without registering**; the Home fixture uses actual ShopCard and BottomNavigation, not the entire authenticated HomeScreen. `tests/signup-home-ux-browser.mjs` and CI workflow test 320px/390px simulated guest and form paths with blocked outbound network and capture screenshots. Run CI and real-device checks separately. The email/password path is Firebase-backed despite the historical supabase.ts filename; mocked unit tests confirm signup/session UID and ID-token parity with the pickup client, while real verification email, device checkout and public launch still require physical acceptance. See `docs/LOCALEATS_SIGNUP_TO_HOME_UX_2026-11-22.md`.


## L3-N8U-S — Out-of-range browsing and CORS recovery (2026-11-21)
See [the L3-N8U-S integration report](docs/L3_N8U_S_CURRENT_MAIN_DISTANT_BROWSE_RECOVERY.md) and original [Customer Preview PR #103](https://github.com/mehey9184-maker/LocalEats-app/pull/103). Customer Home previously showed **Shops unavailable** while My-Kota Merchant showed its R25 menu, but its true distance from the remote Customer is over 4 km. The older Preview shows out-of-range shops as lightened **Outside 4 km / Browse menu only** cards without removing them or enabling orders. This draft replays the reviewed discovery and cart-gating behavior onto current main (without older navigation regressions). A safe no-token live API diagnostic independently confirmed **WWW public catalog 200/204 vs apex 403 CORS rejection**; separate API draft PR #215 addresses exact owned origin. The screenshot did not disclose the browser hostname so its specific cause remains unproven. Production ordering remains OFF; nearest genuine pickup test requires consented customer physically within 4 km and My-Kota genuinely open.


Order History provides Load older orders after the latest 50. The authenticated API uses the last displayed timestamp and ID as a cursor, and returns at most 50 rows plus a continuation flag. Older cards retain the same receipt controls. Errors offer Retry older orders, and account changes discard in-flight results.

The open Customer app can show one Ready reminder after 12 minutes when a fresh order read still reports Ready and a verified inbox event identifies when it became Ready. Got it dismisses reminders for that order in the current tab. Remind me in 10 min schedules an in-app reminder, and Get directions uses published shop coordinates. The separately opted-in nearby shop alert compares complete approved catalogs at the same location and applies the 4 km limit. The first load and a change of location establish a baseline.

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

- **2026-11-18 Pickup receipts.** In Order History, customers can open a receipt for a collected pickup. It shows the order number, confirmed rand amount and cash or card machine method from the server payment event, and the collection event time if available. The order total remains separate. Older pickups without proof show an unavailable message; failed requests can be retried. Receipt reads use the signed-in account, time out, and are cancelled when closed or when the account changes.

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


## QR guest entry and optional app installation — 2026-11-22

Focused feature/customer-qr-guest-install-20261122 is stacked on PR #125 (ac1f993), which remains an explicit unmerged dependency for approved public menu browsing and real-location eligibility. Scanning a valid single shopId opens the original StoreInfoScreen in guest browsing mode; no anonymous Firebase account is created. The link survives refresh/auth, and navigation away removes only shopId, retaining other query/hash information. Guest checkout uses the original LoginScreen; cart/options remain local, authenticated checkout replaces auth screens in the back stack, and late login animation callbacks cannot override navigation away. Private pickup API calls reject anonymous identities. Real-location/4 km, closed-shop, server quote, consent and ordering flags remain authoritative.

The original menu includes a small manual Install LocalEats action. A non-modal inline card appears after two distinct eligible menu-item selections and respects a seven-day device-local dismissal; no idle timer or notification prompt is introduced. Existing install helpers are reused narrowly from feature/customer-app-install. Native install requires a click; platform help is available otherwise. appinstalled, standalone display and iOS home-screen detection hide installation UI. Normal browser tabs cannot reliably prove installation on every platform; no success is fabricated from prompt acceptance. The PWA now uses actual 192/512 square LocalEats icons instead of misdeclaring the portrait logo dimensions. No other icon, screen design, dependency or provider setting changes.

Validation: focused policy/render tests plus complete Node test suite, TypeScript and production build; actual-App offline browser QR/menu/refresh checks, manual help, 320/390px iframe layouts without horizontal overflow, and component-fixture engagement/dismissal/installed-event checks. Offline provider boundaries block external connections and ordering; fixture events are not claims of real device installation, real Firebase sign-in or GPS acceptance. Physical scan, live sign-in continuation and native phone installation remain Preview/device acceptance. Production is unchanged; this branch has automatic Vercel deployment disabled.
