# Pickup local testing

The active entry is src/pickup/PickupCustomerApp.tsx. LocalEats API owns business authorization; legacy delivery/Firestore/fake-success flows remain unmounted in retained source.

If dependencies are absent: npm ci --ignore-scripts --no-audit --no-fund
Checks: npm run test:pickup, npm run lint, npm run build

Full two-account isolated tests and browser instructions are in sibling Merchant/API docs/PICKUP_LOCAL_JOURNEY.md. Current layout: work/customer-pickup beside work/merchant-api-pickup.

Start that API's disposable fixture with ./tests/pickup/validate.ps1 -Serve after its npm run build. In this Customer root run ./node_modules/.bin/vite.cmd --host 127.0.0.1 --port 5173 --strictPort. Open http://127.0.0.1:5173/?fixture=1 and use customer@example.test / fixture-pass-only only in the visibly labelled fixture. Merchant uses port 5174 and merchant@example.test / fixture-pass-only. These are synthetic identities, not real Firebase accounts.

Development fixture mode forces the loopback API, uses local mock identity/location and disables real FCM. Production builds cannot enable it through query strings. Real operation needs approved API/Firebase configuration and real browser location. There is no fake catalog, GPS or order-success fallback.

Customer build/full type check/four client tests and the browser pickup journey pass locally. Live Firebase identity alignment, PostgREST/schema rollout, secure-origin optional push and commercial hosting eligibility remain separately approved dependencies. No environment/provider setting, production database, push or deployment was changed.
