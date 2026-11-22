# CF1 Customer — Cloudflare static staging preparation (NO PRODUCTION CHANGE)

**Status:** repository-only candidate, **not deployed**, not merged. Base: L3-P1–P4 Customer draft PR #139, not Production main.

## Purpose

Prepare the approved original Customer React/Vite PWA for Cloudflare Workers **static assets**. This is a staging delivery change, not a redesign or feature activation. The Customer staging frontend must eventually pair with an independently verified **read-only** Cloudflare API staging Worker before browser acceptance.

## Hard gates

- Do **not** connect Cloudflare to a Production domain or change DNS. Keep www.localeatssa.co.za untouched until a separately approved cutover and rollback test.
- Do **not** use npm run build for staging static hosting: it also bundles server.ts into dist/server.cjs. Use node scripts/build-cloudflare-staging.mjs, which builds **only** Vite and rejects published server code.
- Require an explicit HTTPS origin ending in .workers.dev through VITE_LOCALEATS_API_URL. There is no fallback to a Vercel API or local /api SPA route.
- Customer ordering, LocalPay, rewards and profile writes stay OFF. No offline order replay, stale live price, fake GPS or real order submission.
- Never inject Gemini, Firebase private keys, Cloudflare API tokens, Supabase service-role keys or similar secrets into browser assets.
- Audit **all** browser write paths and complete isolated Firebase/Supabase staging identity verification before allowing real sign-in tests. This script's flags are necessary but not sufficient proof of account isolation.
- Do not change the original shop cards, navigation, push prompts, PWA branding or user flow.
- The .workers.dev hostname is created by Cloudflare on deployment, not assumed here. API bootstrap Worker responds only to /bootstrap-health until separately developed and accepted; do not configure the frontend to use that nonfunctional API yet.

## Local dry-run after a real read-only catalog API is ready

Run in the Customer repo:

    npm ci
    node --test tests/cloudflare-staging-gate.test.mjs
    VITE_LOCALEATS_API_URL=https://<actual-api-staging-name>.<your-subdomain>.workers.dev node scripts/build-cloudflare-staging.mjs
    npx wrangler@4 deploy --dry-run --config wrangler.cf-staging.jsonc

The example is a *template*, never paste as a live endpoint. Cloudflare account login and a real separate staging API are needed before an actual deploy. After successful dry-run, run a reviewed staging deployment using the same --config, without a custom domain.

## Acceptance before integration

Verify actual Cloudflare staging build from exactly pinned Git SHA, 320px/390px/desktop and real Android mobile-data GPS; guest public shops and exact R25 menu prices when live; outside-4km browsable but not orderable; PWA service worker / start_url / icons; images/data saver; offline directory names only; CORS origin exact; no login leakage; no network POST/PUT/PATCH/DELETE; no Production API URL or browser-secret bytes. Check performance and request volume. A bootstrap /health response alone is NOT a pass.

CF1 is intentionally staged; GitHub PR #139 must remain a draft, and this stacked PR must NOT be merged to main or treated as public-release permission.

Cloudflare docs: https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
