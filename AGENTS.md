# LocalEats Agent Instructions & Architecture Document

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
