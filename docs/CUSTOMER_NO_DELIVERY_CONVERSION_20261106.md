# LocalEats — Remove legacy delivery conversion during pickup-only launch

**November 6, 2026.** Pickup remains the only active fulfillment method for at least six calendar months of genuine customer use, followed by separate owner approval before any rider/delivery development.

## Verified production-main risk
`src/App.tsx` retained a legacy `changeToDelivery(orderId)` callback that built a payload with `is_delivery: true`, `delivery_status: finding_rider` and an invented R15 delivery fee. It attempted direct browser writes to both Firebase Firestore and the old Supabase facade, updated local order state and displayed “Finding a rider now!” even though the pickup-only backend cannot dispatch riders. The HomeScreen accepted this prop but did not call it in the current code; it was still a dangerous dormant write entry point for future UI changes.

## Fix
Remove the callback, prop, destructuring and type entirely. No visual redesign, data model change, DB migration or added feature flag. This is a one-way **removal of unused delivery conversion**, not deletion of dormant Rider App code or rollout of online payments.

Existing pickup collection checkout, correct zero pickup fee, nearest-shop discovery, original shop cards and customer order history remain untouched. The API remains the server authority for all actual pickup order mutations.

## Release gate
CI asserts the write-capable conversion path and fake rider success message are absent, plus Client original pickup/catalog/cache, TypeScript and production build pass. Before merging, verify production `VITE_PICKUP_ORDERING_ENABLED=false`, exact diff, and that live pickup remains disabled. The merge may trigger a new Vercel production build. Do not activate delivery/riders, payment processing, or real orders. The substantial hosted profile-security and database/backup cutover blockers remain independent.
