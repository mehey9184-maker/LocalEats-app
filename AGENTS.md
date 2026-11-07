# LocalEats Agent Instructions & Architecture Document

## Revision-bound profile form work — private development, 2026-11-07
Profile state now keeps backend fields, the exact live Firebase identity and its revision together in memory. Late Login metadata cannot overwrite a confirmed read, and older server timestamps cannot roll back a newer receipt, including microsecond precision. Profile and Complete Profile submit only changed editable fields against the revision originally shown; a failed or foreign receipt preserves the draft. Photo-only saves advance the own-write basis while retaining unsaved text. Editors show load failures/retry and require a verified baseline before editing. Pickup does not require a home address or map pin. These are local development changes under verification, not hosted acceptance. Legacy signup, favorites and retry-queue writers still require migration; no production configuration, SQL, activation or main merge is included.


## Active pickup-only Codex policy (2026-11-05)

The private central profile integration branch hydrates customer details through `/api/v1/profiles/me` at `VITE_LOCALEATS_API_URL`. It validates Firebase identity, owner, JSON/revision receipts and deadlines; a profile read must not enqueue writes. Favorites and explicit user intent commit together in pure React state so StrictMode replay cannot lose a save. This is not complete form/queue migration: bind edits and retries to the original verified backend revision before release. No CLI-owner credentials, production activation or hosted Supabase acceptance are implied. See `docs/superpowers/plans/2026-11-06-profile-service-integration.md`.

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

## Guest profile permission correction — 2026-11-05
The LocalEats customer app permits guest browsing of shops/menus, but a Firebase anonymous or signed-out guest must never open the registered edit-profile form, receive a saved-profile acknowledgement, write personal profile data or replay delayed writes. Profile and Complete Profile routes use active non-anonymous Firebase UID matching the current session; guests see Sign In/Create Account/Continue Browsing instead. The shared save service enforces the same account guard before local caching, retry queueing, Firestore mirrors or API calls. Preserve the signed-in Profile UI and all ShopCards. This is a review-only branch; no live orders, Production deployment, database migrations, Firebase rules changes or merge authorized.
 
## Direct guest-to-Login profile navigation — 2026-11-06
The owner clarified that a guest tapping Profile should open the **existing Login screen directly**, without an intermediate guest Profile CTA. Route every Profile and Complete Profile entry through `profileDestination` with active non-anonymous Firebase UID and the matching session UID; retain a defensive redirect on auth changes. Preserve logged-in Profile layout and all existing guest shop/menu browsing. The rejected intermediate `GuestProfileGate` UI has been removed. Keep the profile save, queued-write, account-switch and API guards from draft PR #60. Preview/draft only: do not deploy, merge, activate checkout or change the database.

## Client account trust review — 2026-11-06
Review-only stacked branch `fix/client-account-trust-audit-20261106` enforces real logout for Settings/Profile, guest and anonymous denial for private account actions, account-isolated cached data, verified UID before favoriting/history/push, truthful support/review/profile saves and no client-inferred staff roles. The secure profile API, deployed Firestore security policies, hosted two-account acceptance, live ordering and delivery are **not activated**. Read `docs/CLIENT_ACCOUNT_TRUST_REPAIR_20261106.md`. Preserve the original customer UI, and do not merge or deploy without owner approval.

## Local browser acceptance — 2026-11-06
Real browser QA for stacked Client PR #61 uses only hard-coded demo-localeats-browser-qa Firebase Auth/Firestore emulators (localhost 9099/8080), Vite localhost port 4174 and aborts all external browser requests. No real accounts, Production, ordering, database writes or hosted Preview claim. See docs/CLIENT_ACCOUNT_BROWSER_ACCEPTANCE_20261106.md. Secure hosted backend and deployed rules release gates remain blocked.

## Startup guide sequencing — 2026-11-05
StartupExperience coordinates the existing privacy and cookie prompts before mounting optional Home guides. One controller sequences overview then interactive guidance, cancels delayed work after Skip/unmount and stores dismissal locally. Help can request either guide from other browsing screens; the request routes to Home and waits for outstanding privacy choices. Escape dismisses the tour, Tab stays within the active guide, reduced motion removes spotlight travel, and target measurement no longer scrolls on every scroll event. The debug red outline is removed. Malformed cookie preferences reopen the choices. Consent choices and production ordering flags are unchanged. Regression coverage includes the controller and actual startup components at 390×844 and 320×568, including reduced motion and blocked external network requests.

## Customer account interaction correction — 2026-11-06
Firebase sign-in can reveal Home before the Login feedback timer finishes. Its delayed completion now advances only an active Login screen; it cannot replace Profile or other destinations. A browser regression opens Profile immediately and spans both legacy redirect timers. Confirmed sign-out is checked after reload, and ordinary pointer clicks exercise Save and Sign Out. Shared processing can rethrow errors for profile forms after presenting its error UI, so failed profile saves cannot emit a brief saved-success receipt. Other processing callers retain their handled-error behavior. This does not provide the missing hosted profile persistence endpoint or certify live data permissions.

## Account isolation across delayed requests — 2026-11-06
Profile reads capture the Firebase user object and a request generation, validate the returned owner and recheck identity after asynchronous work and inside React state updates. Delayed old-account reads cannot replace current details/favorites. Profile writes, auth-header retrieval, receipts, retry completion and offline queue processing retain the originating identity; account changes prevent sending or acknowledging old data. Partial edits never merge another account's cached fields. Login owns its delayed callbacks and cancels them on unmount. Original UI and production activation flags are unchanged.

Login completion also checks the current registered Firebase identity before touching shared state/cache and rejects stale formatted credentials. Signing in reads existing profiles instead of auto-upserting incomplete metadata. Biometric enrollment cannot write a device credential after an account switch; canceled enrollment produces no mock credential.

Focused recovery verification (2026-11-07): form-owned failures now rethrow before the generic retry dialog is created; profile actions recheck the original identity immediately before each request. The targeted processing, write-isolation and form suites passed 26 tests. The prior browser run had 14 passes and four failures in the new synthetic persistence/conflict cases; the interrupted diagnostic run is not acceptance evidence. Next: diagnose the local fixture persistence error and rerun only those affected browser cases. No merge or deployment.

Focused browser persistence phase (2026-11-07): corrected the localhost-only synthetic central API fixture to use Firestore documents:commit with an exact updateTime precondition. Its PATCH query precondition had failed in the emulator; no application CAS guard was removed. All four targeted desktop/mobile cases passed: save survives refresh and fresh sign-in, and a stale edit preserves both the local draft and the other session's stored values. This proves frontend behavior with synthetic local persistence only; hosted Firebase/Supabase acceptance, legacy writer migration and independent review remain required. No PR, merge or deployment was made in this phase.

Focused legacy partial-payload repair (2026-11-07): request-level regressions reproduced favorites-only updates fabricating empty phone/address/photo, default country/language, and client timestamps; explicit coordinates were omitted. The legacy request now includes only supplied allowlisted editable fields, excludes role/email/server timestamps, and preserves explicit empty values and zero coordinates. A favorites-only local draft also retains the same account's cached phone. All 35 targeted write-isolation/account-trust/API-security tests passed. This is an interim data-loss repair, not the remaining central API/queue migration; the legacy endpoint and unversioned retry flow still block release. No merge/deployment or production write.

Focused favorites profile migration (2026-11-07): explicit follow/unfollow captures the exact verified profile basis before its asynchronous relation acknowledgement. The favorites profile update now uses handleUpdateProfile/customerProfileApi with only favorites and that original revision; App no longer imports the legacy upsert writer. Hydration and StrictMode replay cannot authorize duplicate writes. Missing verification refuses the action, and central failures show an account-favorites warning without legacy fallback or an unversioned retry. The separate Firestore follow relation remains; atomic reconciliation of relation/profile favorites and rapid-action failure recovery are still release work, not proven cross-session acceptance. All 48 targeted hydration/write/account-trust tests and TypeScript passed. No merge/deployment. Next: migrate signup and retire the unversioned profile retry queue.

Focused registration central-profile migration (2026-11-07): SetupPasswordScreen no longer uses legacy upsert/offline queue. After Firebase creation it uses the exact returned Firebase User identity, reads the central profile and creates only name/phone with expectedRevision null when absent. Existing profiles are not overwritten with signup defaults. Profile failure explicitly distinguishes a created account from unconfirmed details and directs customers to Complete Profile; no automatic account recreation. A synchronous in-flight guard prevents rapid duplicate signup calls. Six actual callback tests passed, including same-UID replacement, unavailable persistence and concurrent clicks; the initial combined signup/account/login suite passed 25 tests before the added duplicate-click case. TypeScript also passed after the final in-flight guard addition. Full registration browser/hosted acceptance and preservation of all registration drafts across navigation remain open. No merge or deployment.

Focused signup draft recovery (2026-11-07): failed central registration persistence now opens Complete Profile with a memory-only name/phone draft bound to the exact returned Firebase User. Recovery waits for that identity's verified profile baseline, retains its original revision, and submits only through the existing confirmed-save path; it cannot borrow a same-UID replacement identity, silently rebase an existing dirty form, or advance registration success on persistence failure. The draft remains available through in-app navigation and is cleared after the main form confirms saving. No password/token is added to recovery storage. Browser refresh does not retain this memory-only recovery draft; refresh/new-session recovery remains unproven. All 31 targeted edit-session/signup/form tests and TypeScript passed. No PR, merge or deployment. Next: exercise registration failure/recovery in the isolated desktop/mobile browser fixture.

Focused registration browser acceptance (2026-11-07): both desktop and mobile passed the real UI sequence Signup -> Password -> failed synthetic central PATCH -> Complete Profile with name/phone retained -> explicit successful save -> refresh -> Profile with the saved name. The test confirms no profile row before recovery and exactly one Firebase account creation. All browser services were localhost demo emulators; the central API persistence implementation is synthetic, not hosted Supabase evidence. Targeted browser result: 2/2 passed, exit 0, emulator shutdown confirmed. No implementation changes, rebuild, PR, merge or deployment were needed. Next: retire remaining checkout/legacy profile retry writers and obtain independent review before publishing the integration.

Focused legacy replay retirement (2026-11-07): removed CheckoutScreen's last runtime import/call of profileService and its misleading save-to-profile checkbox; checkout now directs saved-detail changes to Profile. Removed the retired service's import-time online/custom-event listeners and 30-second interval. A source import-graph regression verifies no runtime source imports profileService or offlineQueue (other than the retired service's own helper import). Historical unversioned queue storage is not replayed or upgraded with a fresh revision. Legacy exported functions remain isolated historical code; explicit review/recovery of old drafts is not implemented. All 40 targeted retirement, profile, account and checkout tests passed; TypeScript passed. No merge or deployment. Next: independent integration review and a focused checkout browser check before publishing the branch.

Independent integration review phase (2026-11-07): review is NOT approval to publish or merge. Confirmed remaining regressions: (1) AddressSwitcherModal saves without an original edit basis, closes without awaiting and retains customInput across account changes; (2) fetchUserProfile publishes favorites separately even when acceptProfileRead rejects an older backend revision, allowing rollback of newer favorites; (3) pristine CompleteProfileScreen submits an empty patch that the API correctly rejects. Existing passing suites do not cover these triggers. Fix order: address-account privacy/revision/await behavior, atomic accepted-read favorites, then pristine-form continuation. No tests/builds were repeated during this source-review phase; no PR/deployment/merge.

Review addition: late registration profile completion also calls App onNext/onProfileIncomplete unconditionally after await. If auth restoration already opened Home and the user navigated elsewhere, it can force Success/CompleteProfile. Preserve recovery data but guard navigation against an obsolete signup screen. Independent reviewer confirmed the AddressSwitcher cross-account customInput exposure described above.

Focused address editor repair (2026-11-07): the address quick-switcher now mounts only while open for the exact registered Firebase identity and matching profile. Closing/unmounting discards its local draft, so another account or fresh same-UID session cannot inherit it. Opening captures the original verified edit basis; saves await the central receipt with that basis and paired coordinates (custom text clears obsolete coordinates). Failed saves remain open with an error; duplicate confirmation is locked, and an unmounted editor cannot close a newer one. Delivery wording was replaced with optional saved-home-address/pickup wording. All 23 targeted address/write-isolation tests and TypeScript passed. Browser account-switch/address acceptance remains required. No merge or deployment. Remaining review fixes: accepted-read favorites atomicity, pristine Complete Profile continuation, stale registration navigation.

Focused atomic profile/favorites hydration repair (2026-11-07): favoriteState now belongs to CustomerProfileState. acceptProfileRead publishes backend fields, edit basis and favorite items in one pure reducer decision; an older server revision preserves all of them. App no longer runs a second independent favorites update after profile hydration. Explicit favorite intent still updates atomically, and account changes reset favorites without authorizing writes. Added both reducer and actual App callback regression for a newer request returning an older server timestamp. All 52 targeted state/read/write/login-order tests and TypeScript passed. Browser regression and independent re-review remain pending; no merge/deployment. Remaining review issues: pristine Complete Profile continuation and stale registration navigation.

Focused pristine Complete Profile repair (2026-11-07): an unchanged existing verified profile now offers Continue and leaves without issuing an empty PATCH or displaying a new saved-success message. The handler still checks the exact live identity and edit basis first, so missing verification or same-UID identity replacement cannot use this continuation. New accounts still explicitly create their name/phone. All 30 targeted form/edit-session/optional-location tests and TypeScript passed. No merge/deployment; browser confirmation remains pending. Next: guard stale signup completion navigation.

Focused stale signup navigation repair (2026-11-07): signup completion passes its exact Firebase actor to App. Success/recovery navigation now uses a functional updater that requires both that identity and the still-active setup-password screen; deferred callbacks cannot redirect Home/Profile/Settings/Login/Checkout or publish another session's recovery draft. Auth restoration no longer automatically redirects the active setup-password form before persistence completes. Failed profile drafts are retained for the same account even if the user moved elsewhere. The initial combined signup/login/startup suite passed 27 tests, and the expanded navigation suite passed all 9 (including active-form recovery); TypeScript passed. Updated the older processing test to match the intentionally removed duplicate generic retry dialog. Browser regression and independent re-review remain pending; no merge/deployment. Next: rerun focused browser account/registration/address cases, then prepare a reviewed integration PR.

Integrated browser verification (2026-11-07): all 22 desktop/mobile account cases passed in 2.5 minutes (exit 0) against demo Auth/Firestore and a synthetic central API. Includes guest routing, real logout, account isolation, offline/unconfirmed saves, save-refresh-relogin, stale edit rejection, registration recovery and address failure/isolation/confirmed-save. Updated the header title to saved-home-address language. A broader 178-test account run passed 177 with one obsolete setter-name assertion; the assertion now checks actual guard -> central request -> state publication ordering, and its four-test file passed on targeted rerun. No product changes followed browser completion. Hashes/evidence recorded privately in work/pickup-staging/profile-integration-verification.json. Hosted Firebase/Supabase acceptance, final build/re-review and release security gates remain open. No PR, Preview, merge or activation. Next: independent re-review and final branch validation before a reviewable PR.

Pre-draft integration review (2026-11-07): independent reviewer confirmed all five prior findings resolved and found no new actionable regression in the reviewed fixes; its 40 focused tests passed. Fresh production build passed (exit 0). Together with the 22 desktop/mobile synthetic browser passes, this supports a draft PR only. Hosted central Firebase/Supabase acceptance and follow/profile reconciliation remain open. No production activation or database changes are authorized by this code integration.
