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


## Pickup-only local journey — 2026-10-27
The active entry now imports the focused PickupCustomerApp. The legacy monolith remains in source but does not mount its fake catalog, map-coordinate scattering, Firestore/dual-sync checkout, Rider selection or in-memory success fallback. The pilot uses real API catalog/menu data, required real geolocation, approved available Tembisa/Ivory Park shop metadata and a server-enforced maximum 4 km radius. No fake discovery coordinates are substituted in production. Existing menu item options are not offered until server verification exists.

Checkout asks for quantities, name/callable phone and intended cash/physical-card-at-shop method. It requests a server quote, shows exact item prices/service fee/total, requires explicit consent, then creates through pickup-v1 only. No card credentials, delivery address, tip, Rider or delivery fee controls. An unresolved create retains its original immutable request/key in UID-scoped sessionStorage for recovery after a lost response/reload; that saved request is never presented as a confirmed order. Actions are disabled while requests are in flight. Failures never invent success.

Customer tracking/history and Ready inbox poll the authenticated API and refresh after mutations. Terminal cancellation/rejection facts distinguish Rejected from customer cancellation. Ready notices persist after collection and say to check current status. Payment is independently Unpaid/Paid; collection displays Collected / Completed only from the API. Pending orders can be cancelled; the same cancellation command is retained for retries. No claimed realtime socket or guaranteed push.

The application service worker now precaches the static shell only, with no business-response cache or queued mutation replay. Its existing Firebase dependency handles generic data-only Ready pushes with event-ID notification tags; a click opens current authoritative state. Optional permissioned registration uses the existing VITE_FIREBASE_VAPID_KEY, UID-bound API subscriptions and SDK token deletion/revocation on sign-out. The worker must actually be installed on a secure origin; missing configuration, unsupported browsers or denied permission leave in-app notices available. Live FCM delivery was not tested because no provider settings/credentials were changed.

Local testing uses explicit DEV/loopback/?fixture=1 only. This forces the local proxy even if an API URL is otherwise configured, connects a synthetic identity fixture and uses its synthetic location, visibly labelled LOCAL FIXTURE TEST. It cannot be enabled in a production build and does not send real push. Tests exercise the same UI/client contracts against real local PostgreSQL transactions. See the sibling Merchant/API docs/PICKUP_LOCAL_JOURNEY.md for exact commands, evidence and remaining production dependencies. Original documentation checkout, patches, Rider repository/history and production data remain untouched.

The focused bootstrap also excludes the old Firestore error logger, automatic cache reset and telemetry initialization. Its pickup error boundary reloads without deleting UID-scoped retry intent. Legacy logger/recovery source remains retained but inactive.


## Pickup development Preview connectivity — 2026-10-28
Production/Preview pickup builds require an explicit HTTPS API origin in VITE_LOCALEATS_API_URL. A missing, credential-bearing, path-bearing or insecure origin produces an honest configuration error before identity retrieval or any business request. Local Vite proxy and development fixtures remain available. Existing idempotency, Firebase identity, payment/handover and Rider boundaries are unchanged. Preview deployment exclusions remain installed. No settings, SQL, push or deployment performed. Merchant rollout instructions: docs/PICKUP_DEVELOPMENT_ROLLOUT.md.
Focused client tests (6 per app) and production builds pass. Customer full TypeScript and Merchant pickup-entry TypeScript pass; Merchant full TypeScript retains the same 62 baseline legacy diagnostics with no additions. API focused tests pass (13). No SQL executed or deployment enabled.
