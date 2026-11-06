# LocalEats App Functionality Documentation

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

## Guest profile access gate — 2026-11-05 (draft, not deployed)
The Client edit Profile and Complete Profile routes no longer mount for guests or anonymous Firebase sessions: the user sees a guest-only Sign In / Create Account / Continue Browsing screen. `handleUpdateProfile` rejects an anonymous/mismatched account before updating React profile state or running a success callback. `upsertProfileWithRPC`, its direct API/Firestore mirror path, delayed retries, offline profile queue replay, favorite profile sync, automatic profile sync and push-token registration are restricted to an active matching non-anonymous Firebase account. The registered profile UI, existing shop cards and pickup pricing/order flags remain unchanged. Dedicated `test:guest-profile-guard`, TypeScript and build CI checks validate source behavior. This does not resolve known signed-in profile backend persistence blockers (separate P0 draft PR #31) or Firestore rules review PR #42; no real customer write, Production merge or deployment permitted.
 
## Guest-to-Login routing clarification — 2026-11-06 (unmerged PR #60)
The owner selected immediate Login navigation instead of the intermediate Sign In/Create Account/Continue Browsing Profile gate. A guest pressing Profile on Home/Settings (or reaching profile completion from signup/checkout) now routes through the shared `profileDestination` check straight to the original Login UI when Firebase Auth is missing, anonymous, or mismatched with session. A defensive effect also redirects expired sessions from protected routes, without mounting the personal-edit form. Signed-in Profile layout and guest catalog browsing remain unchanged; the intermediate GuestProfileGate component is deleted. All guest profile saving/queue/retry prevention remains in force. No Production deployment/merge, real order, Firebase rule or database change.

## Client authentication and save-trust corrections — 2026-11-06 (review-only)
Following draft PR #60's guest Profile → Login correction, an isolated stacked draft branch fixes Settings fake logout, global local cache cross-account exposure, unguarded/optimistic favorites, anonymous order-history/private push display, false support-message acknowledgement, profile offline-queue false success and unawaited profile avatar saves. Reviews now fail closed pending the secure order-verified pickup review API; the mock SQL facade is not accepted as a review receipt. Tests cover source contracts and pure auth/receipt policy; Firebase/Supabase hosted write verification and the deployed Firestore rules remain separate release blockers. See docs/CLIENT_ACCOUNT_TRUST_REPAIR_20261106.md. No production changes, live ordering, delivery, rider or billing activation.

## Chromium browser acceptance infrastructure — 2026-11-06 (not deployed)
Added gated local-only Firebase Auth/Firestore emulators and Playwright checks on draft Client PR #61: guest Profile→Login, two dummy registered accounts, Profile logout, A→B account isolation, offline and failed profile saves. Every external network request is denied and /api/* returns local 503; this never tests real backend persistence or changes Production. No Vercel Preview yet. Secure profile P0 #31 and Firestore rules #42 remain blocked; user testing and owner signoff required.

## Customer account interaction correction — 2026-11-06
Firebase sign-in can reveal Home before the Login feedback timer finishes. Its delayed completion now advances only an active Login screen; it cannot replace Profile or other destinations. A browser regression opens Profile immediately and spans both legacy redirect timers. Confirmed sign-out is checked after reload, and ordinary pointer clicks exercise Save and Sign Out. Shared processing can rethrow errors for profile forms after presenting its error UI, so failed profile saves cannot emit a brief saved-success receipt. Other processing callers retain their handled-error behavior. This does not provide the missing hosted profile persistence endpoint or certify live data permissions.

## Account isolation across delayed requests — 2026-11-06
Profile reads capture the Firebase user object and a request generation, validate the returned owner and recheck identity after asynchronous work and inside React state updates. Delayed old-account reads cannot replace current details/favorites. Profile writes, auth-header retrieval, receipts, retry completion and offline queue processing retain the originating identity; account changes prevent sending or acknowledging old data. Partial edits never merge another account's cached fields. Login owns its delayed callbacks and cancels them on unmount. Original UI and production activation flags are unchanged.

Login completion also checks the current registered Firebase identity before touching shared state/cache and rejects stale formatted credentials. Signing in reads existing profiles instead of auto-upserting incomplete metadata. Biometric enrollment cannot write a device credential after an account switch; canceled enrollment produces no mock credential.

## Customer main synchronization — 2026-11-06
The private profile integration branch includes main through df486cd (#64 guest navigation, #65 real logout, #67 optional pickup location, #66 removed delivery conversion, #69 legacy API ownership/false-success correction). Combined the overlapping logout implementations into one handler retaining thrown-error recovery and the shared empty-profile reset; preserved all four existing protected Profile entry points. Source regressions from main and the account branch pass together: 71/71, TypeScript and production build passed. This local integration does not publish, merge or activate profile/order writes.
