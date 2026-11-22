# L3-P3 — Smooth animations, accessible feedback and navigation

**Prepared:** 2026-11-22
**Branch:** `review/l3-p3-motion-feedback-navigation-20261122`
**Base:** original Customer `main` commit `57c0f82608784dfdac3b0e4fca8ff491e0252561`.
**Approval gate:** draft review only. This phase is independent of unmerged P1 #134 and P2 #135. Do not merge or activate Production, orders, delivery, subscription, payments, database, location bypass, photo caching, shared merchant photo API or image CDN.

## Reason for change
The original UI is mostly polished but has expensive spring interactions that ignore the operating-system reduced-motion preference in individual modules, repeated active-tab actions that can restart the current screen, a cart sheet with no keyboard focus containment/return, a Settings profile card that works only with a pointer, and a short 4-second timeout for Ready/error feedback.

## L3-P3 targeted improvements
- **Responsive animation:** the existing ShopCard and MenuItemCard preserve their original artwork/layout/click routes but disable card hover, entrance movement and tap scaling for users with reduced motion. Cart item transitions and floating cart appearance/exit also respect that preference. The floating cart's AnimatePresence now remains mounted so a real exit animation is possible. Normal-motion durations remain subtle.
- **Navigation without extra work:** the original Home/Discover/Map/Orders/Profile 5-tab navigation remains untouched visually. Tapping the already-active screen does not reroute or vibrate, helping both performance and human feedback. Active tab badges are stable, no perpetual ping. Keyboard users get visible focus outlines; Orders announces the actual active pickup count.
- **Trustworthy cart:** the floating cart's client-side subtotal explicitly says **Est. R**, and its accessible label makes clear the final authoritative pickup amount is checked at checkout. Its bottom offset is safe-area-aware and leaves a measured gap above the five-tab bar on narrow screens. No pricing/order authority moves to client-side code.
- **Pickup sheet accessibility:** the BottomSheet has dialog semantics, an accessible title/description and named Close buttons. It contains keyboard focus while open, allows Escape/close handle, restores focus to the original trigger, and disables slide motion when reduced motion is requested. Parent renders do not disrupt its focus lifecycle.
- **Feedback:** in-app transient toasts honor reduced motion; each changed message is announced distinctly. Persistent action prompts receive dialog semantics, while ordinary error notices remain alerts. Errors and Ready announcements remain visible for seven seconds instead of four, while ordinary success/info remains four seconds. This does not change browser/OS push or notification permissions.
- **Settings navigation:** the original profile card becomes a proper keyboard-accessible button, back navigation gets an accessible name, and Dark Mode/Data Saver toggles expose their checked state to assistive technologies. Historically misleading "Manage delivery profile" copy becomes "Manage your profile" for pickup-first launch.

## Release verification
- `tests/l3-p3-motion-navigation.test.mjs`: source contract for motion preference, all five tabs, correct pickup labels, focus behavior, safe pricing labels, preserved order rules.
- `tests/l3-p3-navigation-fixture.tsx`, `tests/l3-p3-navigation-browser.mjs`: real React components, isolated synthetic carts/notifications, Chromium at 320px/390px/1440px with reduced motion. Check active-tab idempotence, heading and focus containment, Escape/restored focus, top toast, centered persistent dialog, estimated cart total, no overflow and no real HTTP writes. Screenshots are labeled as synthetic, not actual Production.
- `.github/workflows/customer-l3-p3-motion-navigation.yml`: source/Pickup/Login regression tests, TypeScript, build, Chromium screenshots. Other PR workflows remain mandatory.

## Open gates before Production
Keep P1/P2 independent. Owner reviews screenshots and real Android navigation/tap/voiceover, the 320px cart bottom bar under a physical keyboard and safe area, and actual performance/memory on budget phones. Real GPS, shop pickup acceptance and data-byte savings remain unverified. **Nothing in P3 authorizes merging P1 or P2, storing images locally or turning on pickup orders.**

## Long-term photo architecture principle (no implementation)
Avoid full re-download whenever a user reconnects. Fetch authorized public merchant images from central object storage through a CDN; use resized variants, stable versioned URLs/cache validators and bounded cache retention. Treat private/user uploads as permissioned data, never copied across accounts. Do not implement picture caching or any external photo API in L3-P3. Scalability is an architectural release criterion, not a reason to add premature features.
