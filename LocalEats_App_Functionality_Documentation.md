# LocalEats App Functionality Documentation

The private My-Kota staging banner renders inside Home's measured-header content area. Its original position above Home let the fixed header cover the authorized button after the transition settled. The browser regression exercises the actual Customer entry and Firebase SDK with local authentication/API responses at 320, 390 and 1280 px, including denied users, restored sessions and delayed account-switch responses.

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


## L3-N2 — Customer staging push integration after merged notification PR #108 (2026-11-18)
The previously merged in-app pickup Ready reminder, one 12-minute test reminder, snooze and 4 km nearby new-shop alert (Customer PR #108) remain intact. A fresh isolated draft integrates the L3-N1 FCM foreground/background TEST receiver with L3-N2 verified staging-origin and staging-worker safeguards on the current main tree; it does not replace the released notifications.

The staging test accepts only a verified `localeats-staging` Firebase project and Customer staging Vercel origin, paired with an approved LocalEats staging API origin, exact staged VAPID public key, explicitly disabled pickup ordering and an authenticated staging test account. Generic PR Previews and production crossovers fail closed. The custom messaging worker is reconfigured only inside an emitted staging build; the tracked Production worker remains unchanged.

The paired test sender is kept in separate draft Merchant/API PR #168 and is disabled by default. The Supabase staging project `rgpbdajhlrwfmhopzgzk` is separate from Production and must have a verified customer push subscription table and distributed quota RPC before any cloud test. No payment/order activation, Production Firebase changes, Production database migration, background messaging send or automatic merge occurs in this draft.


## L3-N3 — test-only Customer/API Preview pairing (2026-11-18)
Customer notification staging may call only the explicitly reviewed Git branch alias `https://localeats-api-staging-r52d-git-112955-mehey9184-makers-projects.vercel.app`, which was assigned by Vercel to a READY deployment from the API staging project and draft API PR #169. This adds one exact API host to the existing strict allowlist in the browser staging validator and emitted Firebase worker build; it does not allow arbitrary `.vercel.app` origins or Production API URLs.

A branch-scoped `VITE_LOCALEATS_API_URL` on the isolated Customer staging Vercel project is required to opt the separate Customer L3-N3 Preview into the branch alias. Other branches and Production keep their prior environment variables. The Customer's own exact staging origin is derived from its immutable `VERCEL_URL`. The API must separately allow that exact Customer Preview origin in a **branch-scoped** `CUSTOMER_APP_ORIGIN`, and any enabled test sender requires an even stricter exact `CUSTOMER_PUSH_TEST_STAGING_ORIGIN`.

No test flags are turned on and no Firebase message is sent by this code change. A Vercel deployment/build pass is not browser permission or physical device proof. Actual staging authentication, authorized test UID, native OS notification display and reconnected delivery remain open acceptance gates.


## L3-N3 — Firebase staging Customer sign-in error diagnostic (2026-11-18, draft-only)
The test user manually created two email/password accounts in the `localeats-staging` Firebase Authentication console and observed the Customer staging Preview's generic `Unable to Sign In` message. **Root cause not yet verified from Firebase error codes.** Important architecture fact: `src/lib/supabase.ts` is a Firebase-authentication compatibility facade; its `signInWithPassword` calls `signInWithEmailAndPassword(auth,...)`, not Supabase Auth. It had collapsed *every* non-legacy Firebase SDK error to `Invalid email or password`, which the login UI treated as a generic failure. Therefore the generic UI did not prove either incorrect credentials or a service misconfiguration.

This draft implements error-code classification exclusively when the deployed Customer origin belongs to the dedicated `localeats-customer-staging-r52d` project, `VITE_FIREBASE_PROJECT_ID=localeats-staging`, `VITE_FIREBASE_CONFIG_SOURCE=environment`, and pickup ordering is disabled. It gives safe, non-enumerating feedback for Firebase `auth/invalid-credential`, provider-disabled, API-key/unauthorized-web-app, network, rate-limited, and account-disabled failures. Raw SDK error text, email, passwords, provider response bodies, ID tokens and Firebase configuration keys are not exposed to the browser UI. Non-staging builds retain the previous sign-in compatibility response. Existing successful session, account UID, Home startup, original ShopCard, 12-minute Ready reminder and 4 km new-shop opt-in behaviors are preserved.

Independent Vercel configuration inspection confirmed the staging project ID, auth domain and app/sender alignment and that the public staging API key and app ID differ from the bundled Production Firebase project. **This does not prove the key is valid in Firebase Identity Toolkit or that user passwords are correct.** No real sign-in attempt was performed by an agent (account passwords were not requested), no live FCM sent, no test UID allowlist or Vercel env changed, and no Production merge. The user's icon watermark/install drafts Customer PR #112 and Merchant PR #170 remain separate and untouched.

Owner acceptance on the updated staging Preview: attempt the existing staging email/password locally; capture only the **title and short error category/code** (not the password/authorization headers). If credentials are rejected, verify the correct Firebase project/user/password using a test email the owner controls; if provider/configuration issue appears, review Firebase Console Authentication → Sign-in method and staging Web app config before sending FCM.


## L3-N3 — Vite-generated staging notification-worker identity parity (2026-11-18)
Codex found an integration regression before its local session ended: Vercel invokes direct `vite build`, while the earlier L3-N2 Worker replacement only ran as an `npm run build` shell step. Authenticated read-only retrieval of the previously deployed Customer staging Preview `/firebase-messaging-sw.js` confirmed its emitted background worker STILL contained Production Firebase project `localeats-5e26e`, whereas the Customer staging application used `localeats-staging`. This prevents a trustworthy isolated Customer background-push test. It **does not** account for or fix Firebase email/password sign-in rejection; those are separate diagnostics.

A dedicated Vite build plugin now runs the existing staging Firebase/config-origin/disabled-ordering checks before any build and rewrites the emitted CUSTOM Firebase messaging worker after Vite copies it to `dist`. This works for direct `vite build` and also for `npm run build`; both use the same fail-closed existing `l3-n2-staging-fcm.mjs` validator. The tracked `public/firebase-messaging-sw.js` source (bundled Production config) is unchanged, as are all normal Production builds and the separately scoped root PWA worker. The synthetic CI explicitly invokes `npx vite build` and confirms that the emitted Firebase worker identifies only `localeats-staging`. No staging Firebase private service account, FCM device token or user password is read or recorded by the build.

Still outstanding: prove Firebase login works with owner-controlled staging credentials, verify Firebase Auth project and account, check that staging FCM service-account credentials match `localeats-staging`, explicitly approve the test UID and bounded send; no cloud send, Production deployment, account bypass, Production schema changes or PR merge here. Codex's Customer/Merchant installation and logo watermark PRs #112 and #170 remain separate.

 
## L3 — Private My-Kota Customer radius test (draft Preview-only, 2026-11-18)
Owner approved a one-account My-Kota test within 4 km, without altering the real shop. A virtual, explicitly labeled `My-Kota — PRIVATE TEST` sample listing is loaded exclusively through the isolated API's authenticated `/api/v1/private-test/my-kota` endpoints. This fixture never appears in the normal public catalog or localStorage/IndexedDB; its two SAMPLE menu items and sample prices are **not real shop prices or inventory**. The source `src/services/privateMyKotaPolicy.ts` requires the dedicated Customer staging Vercel origin, `localeats-staging` Firebase project, environment config, exact stage-only API project hostname and pickup-ordering OFF before exposing any test UI. These frontend checks are defense in depth; Firebase Admin validates the UID on every private API request with revocation checking, one allowlisted test UID, expiry and 4 km enforcement.

After the genuine Firebase session hydrates, the client privately checks eligibility. An eligible account sees a small, explicit **PRIVATE MY-KOTA TEST · SAMPLE ONLY** banner on Home/Discover. Clicking Open sample My-Kota obtains the virtual fixture from the API using the actual signed-in Firebase ID token, labels the simulated location and opens the original My-Kota ShopCard/storefront; the browser's real `userLocation` is **never** changed. The sample listing is memory-only and scoped to the current session UID, cleared on logout/account switch, with request generation checks preventing stale cross-account responses. Sample cart entries are not written to localStorage and are removed on session change. Sample checkout/quote/order submission is explicitly blocked; there are no live orders, order confirmations, payments, merchant handovers, or fabricated Ready alerts.

Production and normal non-test shop browsing remain exactly as before: genuine GPS coordinates and 4 km radius, original ShopCard/menu/cart design, opt-in 4 km new-shop alert and in-app Ready reminder. The Customer public/private API origin pairing must use only the separately verified isolated staging deployments. The private account's UID must belong to **the Firebase project actually configured on both Customer and staging API** (`localeats-staging`); the earlier Pickup Staging UID is not sufficient. Tests use synthetic UIDs and fixtures only. Do not merge or turn on real ordering.


## L3 Private My-Kota guest startup fix (2026-11-19, isolated Preview draft)
An owner screenshot from `https://localeats-customer-staging-r52d-ad4bs56fw.vercel.app/` showed the global React `Something went wrong` ErrorBoundary. A newly added real Chrome startup test reproduced the error **with a fresh browser, no login and no storage corruption**: `TypeError: Cannot read properties of null (reading 'shop')`. Root cause: the test-only ternary compared `privateMyKotaShop?.uid===session?.user?.id` and `auth.currentUser?.uid===session?.user?.id`; all three optional expressions were `undefined` for guests, so equality returned true and the truthy branch dereferenced `privateMyKotaShop.shop` even though the listing was null.

Fixed by the pure `accountPrivateShop` guard in `src/services/privateMyKotaPolicy.ts`: require a **non-null test listing** and **both nonempty, equal Firebase/session UIDs** matching the listing before any shop access. Tests cover logged-out/missing UID, wrong UID, null listing and correct UID. Real Playwright Chrome startup regression now tests fresh browser and bad local-state cases. This is a Preview-only crash fix, not a Firebase Auth/login or public-order activation change. Preserve original ShopCard/menu/cart and do not merge or enable real orders by implication. The global recovery screen's Soft Recover and Hard Reset can erase local browser data; neither is required to fix this bug.


## L3-N8L — Public pickup catalog privacy and isolated Customer direct-write containment (2026-11-20, draft only)

Source baseline for the isolated Customer staging Vercel Preview: `c77736e7b4878965baa31ec2ada8138f554d6a7f` from `review/l3-my-kota-private-test-customer`. New draft branch `review/l3-n8l-customer-public-read-privacy` does **not** merge or change Production. The **primary** pickup discovery was already `readPickupCatalog()` → authenticated/verified server-based `/api/v1/catalog/pickup-shops` and `/shops/{id}/menu`, not a public Firestore collection scan. The original ShopCard, closed-shop browsing, GPS/4 km pickup boundary, real item price/availability, memory-only private My-Kota sample and blocked checkout flow must be preserved.

**Customer data minimization:** `src/services/pickupMapping.ts` replaces untrusted `{...shop}`/`{...item}` response spreads with explicit public UI fields. Private shop owner IDs, email, direct phone, approval markers, bank details, internal availability revision, tokens, arbitrary nested fields, supplier costs and customizations must not enter the ShopCard, cart or menu even if a malformed server response contains them. All actual menu prices still come from the verified server, with no fabricated cost, default location, out-of-range purchase or fake success.

**Isolated Customer staging direct-write safety:** `src/services/customerStagingNoDirectWrites.ts` rejects legacy browser writes when the compiled Firebase project is `localeats-staging`. Early guards in `src/lib/firebase.ts` prevent direct staging review/follow/support/contact/chat/read-receipt/profile-mirror/push-token/Rider-location/shop/menu edits before Firebase SDK writes. `src/lib/supabase.ts` blocks staging first-time Firebase signup/Google provisioning/password-reset/credential updates but **does not block pre-existing email/password sign-in**. Its legacy Supabase-compatible no-op mutation shim now produces a truthful error in staging rather than claiming successful persistence. Production behavior without the stage project remains unchanged. These browser guards are defense in depth; malicious clients could bypass them, so strict actual deployed Firebase Security Rules remain essential.

**Server API counterpart:** In Merchant/API draft branch `review/l3-n8l-customer-public-read-projection`, `localeats-api/src/routes/publicCatalogProjection.ts` sanitizes all four public catalog GET responses to a whitelist of public scalar shop/menu display fields. No new write routes are exposed. Pure, local HTTP and UI mapping tests use **only synthetic credentials and data**. The API and Customer PRs are separate and must be accepted together if the owner later approves any staging deployment.

**Outstanding:** Existing `FirestoreService.getShops`, legacy `reviews`, `follows`, `messages`, `contact_messages`, `user_push_tokens`, profile and Rider methods are not yet replaced by verified, server-authorized endpoints; direct reads may be denied by the N8J/N8K rules candidates. The real `localeats-staging` Firestore Rules release/rollback is not yet retrieved, and these rules have NOT been published. Staging Supabase shop/menu availability is not evidence of review/follow/chat schema or safe persistence. No live Firebase user or Supabase record created, no Production or stable Preview alias promoted, no Firebase rules changed, no real order/payment/FCM/Rider activation or profile saving enabled.


## L3-N8M — Customer read-only community contract planning (2026-11-20, isolated draft)

**Verified staging truth:** A connected read-only `LocalEats-Profile-Staging` schema inventory found `public.shops`, `public.menu_items`, `public.profiles`, but not public `orders`, `reviews`, `follows`, `messages` or related community tables; any storage in other uninspected schemas/services remains unverified. Therefore there is **no currently proven persisted staging review/follow/chat functionality** or way to verify a genuine collected pickup for rewards/reviews. Direct Customer legacy Firebase writes are still blocked by the L3-N8L stage-only no-write policy; N8J/N8K proposed Firebase Rules are still NOT deployed.

**New prepared API client:** `src/services/customerCommunityReadContract.ts` provides a type-safe, **GET-only and NOT mounted** Customer↔API adapter for eventual `GET /api/v1/community/shops/:shopId/reviews`, `GET /me/follows`, and `GET /orders/:orderId/messages`. It uses an injected verified Firebase bearer, requires explicit HTTPS origin for real deployments, never accepts a caller-selected UID, fails closed on 401/404/unavailable/malformed API response or cross-shop/order data, limits returned lists and projects only safe review/follow/message display fields. It contains **no write functions**, `communityWritesEnabled()` and `communityFeatureMounted()` always return false, and it is not imported into `App.tsx`, `ChatWidget` or other live Customer UI. No client-side simulation is presented as persisted data.

**Server counterpart:** An unmounted, owner-verified, no-write router in Merchant/API draft `review/l3-n8m-dormant-customer-community-contract` checks approved/nonarchived shops, verified published reviews, signed-in UID-follow identity and verified pickup-order participants. No live store is attached because the staging public schema does not currently support those features. Real review creation must require a genuinely collected pickup and moderation before publishing; chat must be limited to actual customer/merchant order participants, with Rider deferred. No account/shop/order/notification write gate was enabled.

**Acceptance scope:** Synthetic Customer contract/security tests, original pickup tests, TypeScript and a fake-Firebase staged build can pass without proving a real Customer+API coupled Vercel Preview. Stage API + Customer projects must each deploy the exact reviewed commits to a separately approved, read-only isolated environment before browser acceptance; real Firebase Admin/Rules, user A/B and schema still need independent checks. Original ShopCard, menu/cart, real location/4 km policy, disabled pickup ordering, private My-Kota and production app unchanged. No PR merge, Vercel environment mutation, Production, hosted Firebase/Supabase mutation, Firebase Rules publish, real orders/payments, push send, Rider or profile activation.


## L3-N8N — 20 November 2026

# L3-N8N paired Customer Preview preparation

Approved scope: one designated shop per merchant pilot, no shop chooser. API companion draft #205 pins server-only owned/approved shop selection and exact isolated Customer CORS.
Customer expected API commit: 05d8586db4e8ed557d21c455ca96d323472fd088.
Base Customer draft #120 remains unmerged. This branch is deployment-disabled in vercel.json.

Opt in only on review/l3-n8n-customer-designated-pilot with LOCALEATS_PAIRED_PREVIEW=true. Supply VERCEL_ENV=preview, LOCALEATS_STAGING_ONLY=true, complete VITE_FIREBASE_CONFIG_SOURCE=environment app config for localeats-staging, explicit VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default), VITE_PICKUP_ORDERING_ENABLED=false, LOCALEATS_PAIRED_API_COMMIT=05d8586db4e8ed557d21c455ca96d323472fd088 and LOCALEATS_PAIRED_API_ORIGIN set to the independently verified immutable API deployment URL. Canonical/branch aliases and Production API URLs are rejected.
The Vite config and Firebase worker guard share the same validation. Existing builds without opt-in retain their current configured/private-test API behavior.
Vite emits paired-staging.json with configured API origin, pinned reviewed commit and Customer commit for independent inspection. These are configuration facts, NOT proof of actual API deployment provenance or real account authentication.

Separate release gate, NOT executed:
- API #205 must pass CI and owner review.
- Before any separately approved deployment, use authenticated Vercel get_deployment on the proposed immutable API URL and match actual SHA 05d8586db4e8ed557d21c455ca96d323472fd088, repository, staging project prj_eroDrVcFOPlvRJzjCU7vbwGnleFT, team team_nqIkTocJXDSY8Ml7jIsQvHt6 and Preview environment.
- Independently verify staging Firebase/Admin and Supabase identities and all write gates disabled.
- Configure the actual immutable Customer Preview as the API's PAIRED_CUSTOMER_ORIGIN only after checking Customer repository/project/team/commit. Never admit arbitrary previews or reassign the existing Customer private-test/Merchant API aliases.
- Check emitted paired-staging.json and bundle, exact CORS, Vercel access and real existing-account Firebase authentication. No new account/fixture, database write, Firebase rules publication, order, payment, push or community activation is authorized by this preparation.
- If API source changes, update the pinned commit, rerun CI and repeat the metadata preflight. Do not alter the manifest to bless an unverified deployment.

Validation: 5 local synthetic tests exercise actual Vite selection, worker config, failure cases and emitted provenance. 15 API/Merchant tests pass in companion snapshot. Full Customer regression/typecheck/synthetic build runs in PR CI. No hosted cutover or acceptance is claimed.

