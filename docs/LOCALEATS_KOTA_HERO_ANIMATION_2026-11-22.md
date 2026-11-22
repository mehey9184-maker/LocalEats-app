# LocalEats start-to-Home visual polish — 22 November 2026

Owner supplied screenshot of the **live Welcome screen** and requested removing the cartoon burger, showing appetising real local food (Kota or burger), modernising animations and icons through Home.

## Exact visual scope
- New real Kota hero photo in `src/components/LocalKotaHeroPhoto.tsx`, used by `SplashScreen.tsx` instead of the previously hand-drawn burger SVG. Source: [Kota, Bunnychow sa.jpg](https://commons.wikimedia.org/wiki/File:Kota,_Bunnychow_sa.jpg), author **Palesalepheana**, CC BY-SA 4.0. **Credit and license URL appear visibly below the photo**. The photo illustrates local food culture; it is **not a claimed listing, merchant's product, price, or ready order**. Network failure produces an honest local icon placeholder, not a broken photo.
- Welcome now uses a deliberate, responsive two-column layout on desktop while preserving the readable mobile order: headline → food image → browse/sign up/sign in actions. Brand logo, Outfit/Inter, cream/orange/navy remain.
- Entrance and action easing uses short spring/motion transitions. `useReducedMotion` disables entrance transforms on Welcome, signup steps, confirmation, Home, and bottom navigation.
- Signup step progress is a clear animated rail with appropriate user/lock icons; field icons use consistent Lucide 2px stroke; invalid password checks use hollow circles instead of appearing checked.
- Confirmation icon distinguishes an email sent attempt from a successfully created account without verified mail delivery; do not claim customer email is verified.
- Home has a small fade-up greeting only, no added loader, no reordering or fabrication of shops. Search icon no longer spins constantly when typing. Bottom navigation retains Home/Discover/Map/Orders/Profile labels, IDs, routing, active-order badge; new animated active glyphs, `aria-current`, and accessible nav label.

## Safety and limitations
- Work is on **design/kota-photo-motion-welcome-home-20261122**, not Production or main. No new ordering authorization, Supabase migrations, customer signups, real push or GPS simulation; preserve open/closed and 4km browse-only restrictions.
- The image is hosted by Wikimedia Commons. It is a licensed photograph, not the user's own shop image; before long-term marketing, a photo of a consenting real local merchant's menu item would be even better.
- Synthetic browser CI blocks external requests; it therefore verifies the honest **offline fallback** but does not confirm Wikimedia image CDN loads on actual device or a real customer signs in. The photo was verified at the source/licensing page.
- The 320/390/1440 browser screenshot tests exercise real Welcome, signup/password/confirmation React components and a representative Home fixture using actual ShopCard/BottomNavigation. Full live Home, PWA service worker, real device, real signup email receipt and user GPS remain independent gates.
- Validate all Customer tests, TypeScript, Vite build and browser screenshots before merge; do not merge a failed candidate. Live ordering remains disabled throughout this UI phase.
