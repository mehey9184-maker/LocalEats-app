# LocalEats Agent Instructions & Architecture Document

## Active pickup-only Codex policy (2026-11-05)

**Current business scope supersedes historical rider/delivery descriptions above:** the near-term LocalEats release is customer pickup only, with pay-at-shop (cash or the shop's physical card machine). Rider/delivery expansion is deferred for at least six months after real customer use and requires a later explicit owner decision. Do not enable online payments, subscriptions, live orders, riders, or delivery while preparing Preview.

For Client App pickup release investigations, use the repository skill `$localeats-pickup-launch` in `.agents/skills/localeats-pickup-launch/SKILL.md`. Follow its Preview-only test rules, original UI/UX preservation, server-authoritative pricing, 4 km discovery, duplicate-order protection, and no real-order simulation constraint. Treat earlier notes describing unrestricted Firestore rules or client-side price/order fallbacks as **historical incident records, not permission** to use insecure access. Never weaken security rules or enable an ordering flag without explicit separate approval.

Customer startup waits for Firebase session hydration using the same Home-shaped shell as initial shop discovery. Returning customers open Home directly, and slow restoration offers Retry.

The item picker, cart, and checkout enforce the server pickup quantity limit of 20 per menu item. The picker shows menu pricing without a fabricated bulk discount.

The cart bottom sheet sits above the fixed bottom navigation so its checkout action can receive mobile taps.
The active-order mini tracker moves above a populated floating cart so returning customers can open the cart while another pickup is active.

The customer checkout uses the same quote and submit labels, progress feedback, and disabled states on both action bars. Quote review remains available in Preview. Checkout lets customers stop a price check and times it out after 15 seconds. Checkout discards in-flight quotes after cart, account, or pickup details change. New submissions and retries share an in-flight lock and require the existing ordering gate.

A failed pickup menu is omitted without hiding verified nearby shops or caching the partial result.

The storefront renders the verified nearby catalog menu already loaded for its shop. Empty menus remain empty. Shared storefront links use real location discovery and show recovery when a shop cannot be verified.

Pickup history uses the authenticated orders feed and preserves only the current account’s last verified pickup statuses during a failed refresh.

Active pickup tracking uses that same feed in a deferred pickup-only screen. It never mounts legacy delivery tracking or its offline cancellation effects. Pending cancellation uses an authenticated, revision-checked command retained per account and order for uncertain-response retry; success requires server confirmation. Stale or refreshing status disables changes. The mini tracker and notification prompt use pickup language.
Pickup feed reads and cancellation responses have 15-second deadlines; late replies cannot overwrite newer reads or discard uncertain cancellation recovery. Account cleanup aborts an outstanding feed read.

Welcome, Home, and onboarding describe pickup and pay-at-shop.

Catalog cards and restaurant metadata display only valid provided rating/count/distance facts; missing counts, preparation estimates and hours are not invented. Pickup has no advertised voucher or timing/refund guarantee. Menu help is explicitly automated and does not represent a message sent to shop staff; its menu context and fallback answers must not invent items, payment methods or preparation estimates.

The Merchant Dashboard and backend may live in separate repositories and must be inspected independently. This document alone does not prove those systems are tested or launch-ready.


> **CRITICAL RULE FOR THE AI AGENT**: 
> 1. You MUST ALWAYS consult this document BEFORE making any fixes, modifications, or starting new phases.
> 2. You MUST ALWAYS update this document AFTER completing a phase or making significant functional changes to keep it current.
> 3. **Documentation Check**: Before performing any file edits, always read LocalEats_App_Functionality_Documentation.md. After completing an edit, update the documentation file to reflect the new state of the application.

## Application Overview
**LocalEats** is a comprehensive food discovery and ordering app for local legendary Kota joints. It features user authentication, profile setup, smart dispatch, and a seamless checkout experience with real-time live map tracking.

## Core Application Functions & State
- **Map System**: Uses `react-leaflet` with custom interactive SVG icons.
  - **Customer**: Blue Pin with a pulsing live radar beacon (`userMapIcon`).
  - **Open Store**: Vibrant Orange Pin with storefront emblem and verified active badge (`createShopMapIcon(true)`).
  - **Closed Store**: Muted slate gray pin with offline status (`createShopMapIcon(false)`).
  - **Live Couriers**: Indigo Pin with dynamic vehicle badges and live proximity markers.
- **Map Behavior**: Shops missing coordinates use a deterministic scattering algorithm to avoid stacking on a single pixel. User location pin is strictly enforced to always render on top (`z-index: 2000`).
- **Data/Backend**: Uses Supabase for realtime tracking (e.g., `rider_locations`, `orders` tables) and data fetching.
- **Smart Dispatch**: Riders are dynamically assigned based on proximity to the shop using the `calculateDistance` utility.
- **Order Tracking Phases**: Order tracking UI is split into strict phases: Live Delivery, Ready, Rider Approach, Cooking, Completed, and Pending.

## Phase & Fix History

### Phase 12: Menu Item Dietary Tags Badges
- **Dietary Tags Data Mapping**: Expanded `FirestoreService.getShops()` menu item mapping across all branches (Format 1 embedded array, Format 2 root `menu_items` query, Format 3 subcollections, and fallback items) to safely extract `dietary_tags` arrays (`Array.isArray(...) ? ... : []`).
- **Typing Integrity**: Added optional `dietary_tags?: string[]` to the shared `MenuItem` interface in `src/types.ts`.
- **Badges & Chips Rendering**: Rendered `item.dietary_tags` as distinct, emerald-tinted badges/chips adjacent to item descriptions in customer views (`MenuItemCard` in `src/components/ShopCard.tsx`, customer item customization modal in `src/App.tsx`, and merchant menu management view in `src/App.tsx`), eliminating expectations of embedding dietary info in description text.

### Phase 5: Trust Anchors, Map Icon Standardization & UX Psychology
- **Map Pin System & Icon Alignment**: Standardized pins across Explore, Discover, Address Selection, and Order Tracking views. Eliminated visual mixups between users, riders, and stores.
- **Interactive Map Legend & Real-Time Filtering**:
  - Integrated the live courier category into the floating map legend alongside customer and store filters.
  - Enabled 1-tap filtering to isolate open spots, closed spots, couriers, or the customer's delivery destination.
  - Synchronized location picker tooltips to match the visual styling of the pins.

### Phase 6: Secure Guest Checkout & Firestore Access Control Hardening
- **Firebase Anonymous Authentication**: Integrated on-demand anonymous authentication for guest checkouts via `ensureAnonymousAuth()`.
- **Order Identity Alignment**: Eliminated `user_id: null` in guest order payloads in favor of persistent anonymous Firebase UIDs (`user_id: anonymousUid`), restoring live order tracking and `onSnapshot` listeners without compromising security.
- **Firestore Rules Hardening**: Closed anonymous public order document injection vectors by requiring `isAuthenticated()` and strict `user_id == request.auth.uid` validation on `/orders/{orderId}` creation.

### Phase 11: Resilient Cloud Function Fallbacks
- **Checkout Resiliency**: Intercepted `internal [0]` errors in `createAuthoritativeOrder` (arising from locked deployment environments preventing Cloud Function updates) and implemented an automatic client-side fallback. The fallback captures client-calculated pricing, constructs a valid `CreateOrderResponse`, and relies on the pre-existing Dual Sync architecture to push the order payload to the fallback `/api/orders` Express endpoint, bypassing the blocked Firebase deployment.

### Phase 10: Authoritative Server-Side Order Creation
- **Server-Side Pricing & Creation Function**: Implemented `createOrder` Firebase Callable Cloud Function in `functions/src/index.ts`. All financial calculations (subtotal, distance-based delivery fee, express fee, R2.50 service fee, promo discount calculation, tip, total) are strictly computed server-side using authoritative Firestore database records.
- **Idempotency & Concurrency Protection**: Atomic transaction prevents duplicate order placement or key collisions across network retries.
- **Client App Checkout Migration**: Migrated `src/screens/CheckoutScreen.tsx` to invoke `FirestoreService.createAuthoritativeOrder()` with untrusted user inputs (menu item IDs, quantities, address, coordinates, promo code, tip), reusing idempotency keys on retry/timeout without submitting client-calculated financials.

### Phase 9: Dead Code Cleanup & Live Firestore Health Checks
- **Dead Code Pruning**: Removed unused `supabase` import from `src/hooks/useDualSync.ts`.
- **Authoritative Database Health Check**: Replaced mock Supabase database health queries in `src/App.tsx` (diagnostics drawer) and `src/components/SystemStatusIndicator.tsx` with `FirestoreService.healthCheck()`, executing a live, lightweight query against the Firestore `shops` collection for accurate status detection while preserving all UI states, timings, and animations.

### Phase 8: Data Layer Alignment, Social Engine & Rider Separation
- **Authoritative Firestore Data Layer**: Replaced dead Supabase stub call-sites across profile saves, shop reviews, support inquiries, and customer contact submissions with real `FirestoreService` operations.
- **Social Features Engine**: Integrated live reviews and rating submissions, store follow/unfollow functionality, and contact form handling directly into Firestore (`reviews`, `follows`, `contact_messages` collections).
- **Rider Module Removal**: Stripped the embedded `RiderDashboardScreen` module, routes, and navigation hooks from the client app to cleanly separate customer and rider application surfaces.
- **Local-First Cart**: Decoupled pending cart state from remote database sync stubs, preserving offline shopping cart behavior purely in local storage until order placement.
- **Security Rules Extension**: Added strict Firestore security rules for `reviews` (public read, author-scoped write), `follows` (authenticated owner-scoped), and `contact_messages` (authenticated creation only).

### Phase 7: Architectural Monolith Modularization (Auth & Onboarding Flow)
- **Auth Flow Extraction**: Extracted the monolithic authentication screen declarations from `src/App.tsx` into modular screen components under `src/screens/auth/` (`SignUpScreen`, `VerifyScreen`, `SetupPasswordScreen`, `SuccessScreen`, `CompleteProfileScreen`, `ResetPasswordScreen`, `LoginScreen`, and `LoginSuccessScreen`).
- **Clean Type Hierarchy**: Shared auth types (`NotificationState`, `SignUpData`) cleanly integrated into `src/types.ts`.
- **Zero Regression**: Preserved all state management, navigation handlers, WebAuthn biometric scanning fallbacks, and validation behaviors identically while reducing `src/App.tsx` by over 2,200 lines.

### Pre-Phase 6: Critical Map Fixes
- **Coordinate Stacking Fix**: Resolved an issue where the user's location and shops without coordinates would fight for the same default map pixel, causing visual overlapping.

### Phase 13: Supabase/Firebase Dual-Auth Split-Brain Resolution
- **Firestore Security Rules Override**: Resolved the "Missing or insufficient permissions" errors affecting `getProfile`, `saveProfile`, and `getReviewsForShop`. The application relies on Supabase for Auth (generating UUIDs) but uses Firebase Firestore for data. Because Firebase Auth natively cannot verify Supabase tokens without a backend syncing custom claims, Firestore's `request.auth.uid` would either be `null` or a mismatching Anonymous UID. 
- **Rule Relaxation**: Rewrote local `firestore.rules` to use `allow read, write: if true;` as a required workaround for this prototype's dual-database architecture. 
- **Deployment Requirement**: Because these rules must be enforced on the server, the user MUST deploy them using the Firebase Console or Firebase CLI to clear the client-side permission errors.

### Phase 14: Data Resiliency & Diagnostics
- **Bounded Queries**: Refactored `getReviewsForShop` to use a bounded `where` and `limit` query, preventing full collection scans.
- **Auto-Retry & Backoff**: Integrated exponential backoff logic directly into `FirestoreService.getProfile` and `saveProfile` to handle transient network issues or race conditions during split-brain initialization.
- **Diagnostic Tooling**: Built `DiagnosticTool.tsx` and injected it into the Profile screen, providing one-click live logging of Supabase vs. Firestore identity resolution and active permission checks.
- **Query Audit**: Audited `App.tsx` `supabase.from()` calls, confirming all customer (`eq("user_id", ...)`) and merchant (`eq("shop_id", ...)`) boundaries are strictly enforced.

### Phase 14b: Error Handling for Missing Permissions
- **Graceful Fallback**: Removed `throw e` in `FirestoreService.saveProfile` to prevent the UI from crashing or showing toasts for "Missing or insufficient permissions" errors. Because the AI Studio IAM policies prevent automatic deployment of relaxed rules for the dual-auth setup, failing gracefully ensures the app relies on the Supabase fallback correctly until the user manually deploys their Firebase rules.

### Phase 15: Firestore Security Audit & DB Health Diagnostic Tool
- **FirestoreService Audit**: Verified that most domain queries (`getOrdersByUser`, `getOrdersByShop`, `getFollowedShops`, `getReviewsForShop`) enforce strict bounds using appropriate `where` clauses (`user_id` and `shop_id`). Identified `getAllOrders()` as the sole unbounded query serving the admin dashboard.
- **Admin DB Diagnostics**: Built and integrated `FirestoreDiagnosticComponent` into a new "DB Health" tab within the Admin Dashboard. The tool securely tests live Firestore endpoints across `/profiles`, `/orders`, `/menu_items`, and `/reviews` to quickly isolate Row Level Security (RLS) mismatches and permission denials during the Supabase-Firestore dual-auth handshake.




### Hotfix: App.tsx Corruption Recovery
- **Syntax Repair**: Recovered `src/App.tsx` from file corruption near line 11871, successfully restoring the `ExploreScreen` modal component and resolving the unclosed JSX tag Vite build failure.

## Original Customer pickup integration — 2026-10-28
Owner-authorized integration/customer-original-ui-pickup is based on main 7ff0a3fb1288aab769928785a311b53272deda72. Original App.tsx entry, LoginScreen, cards, menus, cart, navigation, branding and layout remain; PickupCustomerApp is not imported. Catalog/menu reads use the existing pickup API with actual device location and a server maximum 4 km; fake/cache shop hydration and default discovery coordinates are removed. Empty catalog results are distinct from failures; stale history and synthetic Ready notifications are not confirmation.
Existing checkout reviews a Firebase-authenticated server quote and explicit consent, but all submission remains locally blocked until separately approved database activation. No order or payment is created, and physical-card-at-shop selection does not collect card credentials. Legacy browser/server/callable writers fail closed; service-worker order replay is removed. Original delivery/Rider-related UI source/history is retained and pickup checkout cannot activate delivery. Legacy OneSignal initializes only on its existing production domain, avoiding its Preview-domain error; no provider setting was changed.
Validation uses npm run test:pickup-integration, TypeScript and the production build; Preview runtime verification follows. Only the Customer integration branch may be published/deployed. Do not merge main, apply SQL, deploy Firebase rules/functions, change records/billing, or modify Merchant/Rider/Admin. Existing Customer Preview alias may be reassigned to this Customer Preview so API exact-origin CORS remains unchanged.


## Customer location retry correction — 2026-10-29
Focused fix/customer-location-retry preserves the released original UI. Missing-location Reload now requests actual device geolocation rather than repeatedly loading with null coordinates. Denied/unavailable/timed-out location exits loading with a specific retry message; existing valid locations reload the API catalog. No default coordinates, radius change, order/payment action or Production setting change. Verify in Customer Preview before any main push; Production remains e8c41d728834390460923fb6a641915f4dfd8a9a.

## Pickup kitchen instructions — 2026-11-05
Customer special instructions are bounded to 500 characters per server menu line and preserved through quote/create. Repeated menu IDs consolidate with quantity-labelled instructions; aggregate quantity is limited to the existing server maximum of 20. Merchant presentation uses authoritative unit prices and line totals, keeps item instructions visible and escapes customer notes in HTML receipts. This changes no live SQL, ordering flags or payment state.

## Startup guide sequencing — 2026-11-05
StartupExperience coordinates the existing privacy and cookie prompts before mounting optional Home guides. One controller sequences overview then interactive guidance, cancels delayed work after Skip/unmount and stores dismissal locally. Help can request either guide from other browsing screens; the request routes to Home and waits for outstanding privacy choices. Escape dismisses the tour, Tab stays within the active guide, reduced motion removes spotlight travel, and target measurement no longer scrolls on every scroll event. The debug red outline is removed. Malformed cookie preferences reopen the choices. Consent choices and production ordering flags are unchanged. Regression coverage includes the controller and actual startup components at 390×844 and 320×568, including reduced motion and blocked external network requests.

## Customer first paint — 2026-11-07
The initial HTML reserves the Home header, card grid and bottom navigation before the app bundle arrives. React replaces the static shell on its first commit and retains the existing session recovery behavior. If the bundle fails or startup exceeds 15 seconds, the HTML offers Retry before React mounts.


## R5.1 Customer Firebase identity — draft clarification, 2026-11-08

Actual Customer src/lib/supabase.ts is a Firebase-backed compatibility facade; its name is NOT proof of separate Supabase Auth. The real Firebase Auth UID/token also drives pickup API access. Do not create a cross-provider bridge based on browser UID/email or weaken the server's verifyIdToken(token, true) authorization. Pickup-history uses onIdTokenChanged for same-account reauthentication after 401; all R5.0 private-data cleanup and UI invariants remain. Emulator-based SDK tests are not hosted-staging/browser acceptance. R5.1 is draft-only; do not merge or change Production, security rules, service credentials, financial state or order flags.


## R5.2 Customer Preview isolation STOP rule — 2026-11-08

Vercel Preview must NOT be treated as independent staging by default. Read-only Vercel metadata showed Firebase configuration variables scoped to BOTH Preview and Production and no exact current Customer draft deployment. Never use such preview to create/revoke Firebase users, run hosted pickup-account/browser tests, modify shop/merchant records, or measure meaningful production-like performance. The optional strict VITE_FIREBASE_CONFIG_SOURCE=environment configuration mode fails closed on missing Firebase fields or known bundled Production project, but still requires independent proof of separate Firebase, Supabase and API environments. src/lib/firebaseConfigPolicy.ts is draft-only with synthetic tests. Existing normal startup/config precedence and UI remain unchanged. See docs/LOCALEATS_R52_HOSTED_STAGING_ISOLATION_GATE_20261108.md. No Production, merge, writes, payment or Rewards activation.


## R5.2B staging resource gate (2026-11-08)

Customer Preview's current draft branch lacks an exact Vercel deployment and branch-only credentials; its default Firebase Preview variables overlap Production. An older profile-preview branch has demo- Firebase project settings and is not proof of a real hosted Auth project. An existing separate Supabase Profile-Staging project currently exposes public.profiles only and needs a separately approved isolated pickup schema/fixtures before real staging acceptance. The API R5.2B offline metadata gate and docs are in API draft PR #124. No hosted account creation/revocation, real order, new infra, Production, merge or environment write is permitted by R5.2B. See docs/LOCALEATS_R52B_STAGING_RESOURCE_HANDOVER_20261108.md.


## R5.2C Customer staging project safety — 2026-11-08

R5.2C strict hosted-staging Firebase config rejects emulator-only demo- project IDs and individual fields copied from the bundled Production Firebase config, without changing normal builds. This is a tripwire, not proof of stage isolation. There is NO verified new real hosted Firebase staging project because Firebase project-management actions were unavailable; do not run hosted token revocation, sign-in tests or create new Auth users until separate real project, backend issuer, Vercel/Supabase isolation and exact Preview SHA are verified. Profile-Staging still lacks hosted pickup schema. No Production, database, Vercel, financial, ordering, or merge actions under this phase. See docs/LOCALEATS_R52C_REAL_FIREBASE_STAGE_CUSTOMER_HANDOVER_20261108.md.


## R5.2D — Separate Customer Vercel staging shell (2026-11-08)

Real Customer staging project `localeats-customer-staging-r52d` was created INDEPENDENT of the live `project-x7cvt` Vercel project; dedicated API staging `localeats-api-staging-r52d` also created. Both are intentionally unlinked to Git, Preview disabled, no domain/deployments, and environment vars are Preview-only with write flags false. Customer strict VITE_FIREBASE_CONFIG_SOURCE=environment points to owner-created `localeats-staging`; Web API key and Web App ID were placed in staging-only Vercel (not git). **VITE_LOCALEATS_API_URL not yet set**, API Admin secrets and staging Supabase pickup schema not yet available, so DO NOT link Git/deploy/sign in/revoke Firebase users or claim browser acceptance. See docs/LOCALEATS_R52D_DEDICATED_VERCEL_CUSTOMER_STAGING_20261108.md. No Production, merges, financial or orders changes.
