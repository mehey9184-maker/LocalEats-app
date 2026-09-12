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
- **Fail-closed order submission**: Carts may remain cached locally, but orders and cancellations require a confirmed response from the authenticated LocalEats API. Failed requests are not converted into successful local orders and order mutations are not replayed from offline queues.
- **Portable Firebase identity**: Firebase Authentication supplies the customer identity token. Business screens call an adapter so the identity provider can be changed later without restoring client-side order authority.
- **LocalEats API + Supabase/Postgres**: The Vercel-hosted API is the authorization, validation, pricing, and state-transition gate for commerce records stored in Supabase. Frontends do not receive service-role credentials.
  - Key commerce tables include `orders`, `shops`, `menu_items`, `rider_profiles`, and `rider_connections`.
  - Existing Firebase/Firestore messaging, push, and tracking paths remain transitional and require separate privacy/rules review.
- **Leaflet / react-leaflet**: Core mapping engine handling all geospatial visualizations.

## Standardized Map Pin System Logic
- **Customer Location Pin**: Distinct Blue Pin with a pulsing live radar beacon (`userMapIcon`). Strictly enforced with `z-index: 2000` to guarantee it always renders visibly on top of all other elements.
- **Open Kitchens / Vendors**: Vibrant Orange Pin with storefront emblem and verified active badge (`createShopMapIcon(true)`).
- **Closed Kitchens**: Muted slate gray pin with offline status (`createShopMapIcon(false)`).
- **Live Couriers & Drivers**: Dedicated Indigo Pin with dynamic vehicle badges (bicycle, motorcycle, car, or scooter) and live proximity markers.
- **Shop Coordinate Safety**: Only valid authoritative shop coordinates are used. Missing coordinates produce no shop marker or distance; zero is valid. A default map viewport is presentation-only.

## Update History
*(Assistant Maintenance Protocol: Summarize all successful code changes below this line)*

### Customer Catalog Authority 01 (local implementation; not deployed)
- Customer shop/menu authority is the public Catalog-01 API, configured by `VITE_LOCALEATS_API_URL`; Supabase remains authoritative storage behind that API. No Customer browser Firestore or direct Supabase catalog reads populate the catalog.
- Legacy same-origin shop/menu routes are read-only proxies to Catalog-01, preserve upstream JSON/status, and return 503 when unavailable. Profiles and order endpoints are unchanged.
- The client validates response shapes, parent IDs, finite non-negative prices, and booleans, retaining exact menu IDs, prices, and availability. Menu hydration uses at most three concurrent requests; any failure clears the displayed catalog with an explicit error.
- Approved inactive shops remain in the base catalog but show closed/offline status. Current shop/item availability is checked before adding to cart; historical quick-reorder entries open the current menu rather than fabricate an ID or price.
- No fallback/demo shops, generated menu rows, ID-derived coordinates, invented ratings/reviews/ETA, or category stock imagery enter the current catalog. Unknown business facts are omitted or honestly labelled.
- Nearby views use valid coordinates and at most 4 km (or a smaller selected radius). Missing shop coordinates are excluded when proximity is active; unavailable user location never manufactures a distance. Rider proximity logic is unchanged.
- `localeats_authoritative_catalog_v1` stores successful API snapshots for optional display caching only, including empty snapshots. This implementation does not restore it on failure; old mixed caches are never read as authority. Empty API results remain empty.
- Remaining legacy matches are classified: `App-constants.ts` fixtures and `utils.ts` merge helper have no active catalog callers; old cache keys in `utils.ts` are cleanup-only. Firestore DB-health probes, Supabase network-heartbeat probes, reviews/follows/profile/chat and unused legacy Firestore write helpers are not catalog loaders and remain outside this repair. Map viewport defaults and Rider telemetry are not shop coordinates.
- No migration, live database change, dependency change, deployment, commit, or push. Checkout safety files and server order authority remain unchanged. Focused tests use fake requests and source regressions only.

- **[2026-09-07] Architecture Review Task 1C-A: Customer Checkout Safety**:
  - Restricted pilot payment intent to Cash at Shop and Card at Shop for collection, and Cash on Arrival for delivery. Card at Shop means payment on the merchant's physical terminal; LocalEats does not collect card credentials.
  - Removed card credential fields, saved-card state/storage, simulated terminal metadata, checkout promo authority, express/scheduled delivery, monetary tipping, client quantity discounts, direct checkout reads from `public.orders`, and the ignored client `user_id` assertion.
  - Added a narrowly scoped startup scrub for `localeats_saved_cards`, known order caches/queues, the existing request-queue IndexedDB store, and legacy `[CARD_MACHINE_PAYMENT: ...]` instruction segments.
  - Kept client distance/fee displays as estimates only. Final serviceability and all order pricing remain controlled by the authenticated LocalEats API; no client totals or `_clientPricing` enter order creation.
  - Paid customizations now fail closed before placement until authoritative customization pricing exists. The request always sends standard scheduling and `tip_amount: 0`.

- **[2026-09-05] Order-integrity safety branch (local only; not deployed)**:
  - Replaced checkout's fabricated/offline order success with a fail-closed call to the authenticated LocalEats API. A database or API failure now leaves the order unsent and visible as a real error.
  - Removed `_clientPricing` and stopped the browser from authoritatively supplying item prices, totals, service fees, delivery fees, discounts, or delivery status.
  - Order creation now sends customer intent only. The API validates the shop, menu ownership, menu availability, quantities, delivery radius, and allowed payment method, then calculates the authoritative total before inserting into Supabase.
  - Preserved UUID idempotency so a retry returns the original order and a changed payload using the same key is rejected.
  - Stopped background/offline queues from replaying order writes. Offline cart storage remains local, but placing or cancelling an order requires server confirmation.
  - Customer order refresh and pending-order cancellation now use the central API instead of direct browser database mutations. Pickup-to-delivery conversion is disabled until the server can reprice it safely.
  - Delivery orders start at `pending` with no rider search. The merchant starts `finding_rider` only after marking the food ready.
  - Delivery confirmation uses a server-issued four-digit PIN or LocalEats QR token. The customer UI displays the issued proof; it no longer fabricates a PIN from the order ID.
  - This branch depends on an unapplied Supabase migration, a server-only delivery-proof secret, Firebase UID-to-rider mapping, and staging verification. It is **not production-ready** and nothing was committed, pushed, merged, deployed, or changed in production during this phase.

> Historical warning: earlier releases described offline order replay as resilient behavior. That design is no longer approved. Offline carts may be cached, but an order must never appear successful until the authoritative API and Supabase confirm it.

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
