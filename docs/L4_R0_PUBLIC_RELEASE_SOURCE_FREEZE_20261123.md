# L4-R0 — LocalEats public-release pre-deployment source freeze

**Date:** 2026-11-23 (Africa/Johannesburg)  
**Decision:** Source-only cross-project acceptance while the Vercel Hobby team is paused. **Do not deploy/merge/enable public ordering**.

## Goal and authorized scope
The founder is pausing Oracle/LocalAI, has approved the existing Cloudflare fictional Merchant workshop and wants the *real Customer, Merchant and API* prepared for public use before spending time pitching. Finish source builds, static performance, browser UX checks, pickup contract and security validation now. Production safety remains non-negotiable.

The original Customer shop-card, auth, home, checkout and Merchant Orders UI remain unchanged in this PR. This branch adds **documentation and CI only** and remains stacked on the Cloudflare Customer staging PR #140, which itself depends on the Customer P1–P4 integration PR #139.

## Immutable source matrix under test

| Component | Repository | Candidate SHA | Role |
|---|---|---|---|
| Customer P1–P4 + CF1 static staging | `mehey9184-maker/LocalEats-app` | `af9b2d6b077fe702259529baaea5dd2f5ed31a44` | Original Customer UX, Data Saver, honest shop status, no-write staging |
| Merchant P4 | `mehey9184-maker/LocalEats-Dashboard.2` | `66901eafd064e499ba712a78b715c14ed5e47f30` | Pickup action feedback, original Merchant UI; *NOT* the fictional pitch demo |
| Restricted catalog API | `mehey9184-maker/LocalEats-Dashboard.2` | `52110da7eec98813aed3021c7bdac60c0ead9a4c` | Exact opt-in public shop allowlist, fail closed, ordering off |
| Cloudflare Merchant/API static staging | `mehey9184-maker/LocalEats-Dashboard.2` | `4e63cb9f7c5368fc2a135c2808809322dbe424f1` | Separate CF1/CF2 staging rehearsals; API currently bootstrap-only |

These branches are **not a combined deployable full stack**. Passing independent suites proves their *source* regressions, not their live cross-service compatibility. In particular, a Customer preview cannot consume the CF1 API bootstrap as a production catalog.

## L4-R0 CI
The `l4-r0-crossapp-predeploy.yml` workflow checks these exact source snapshots without Vercel, Cloudflare, Supabase, Firebase, passwords, GitHub write permissions or Production orders:

1. Customer: focused P1–P4 integration, truthful status, pickup safety and login regressions; TypeScript, Vite/build, forbidden browser secrets; gzip JS/CSS size report. Synthetic performance data is not real 4G/5G speed.
2. API: full existing TypeScript/API test suite for the allowlist candidate with all pickup/order/merchant write flags OFF. **No hosted SQL**.
3. Merchant: existing pickup, handover, push registration, no-customer-leak and unread/recovery tests; TypeScript baseline is reported but not silently normalized.
4. CF1 API: existing no-deploy Cloudflare and role/security rehearsal workflow remains separate.

This workflow has no deployment, checkout-write, infra, migrations or service secrets; no GH CLI deployment tools. Build artifacts are only source metrics, no personal data.

## Gates that *cannot* be pre-certified offline

| Gate | Status / owner |
|---|---|
| Customer↔API exact SHA/origin/CORS pairing and true menu data | **PENDING:** hosted read-only API and Customer pair |
| Original Customer browsing on physical Android (GPS, mobile data, 4-km boundary, 320px) | **PENDING:** physical phone |
| Genuine shops vs test records, menu accuracy, owner readiness / consent | **PENDING:** business owner |
| Merchant account identity isolation and live pickup acceptance | **PENDING:** signed-in, consent-based live tests |
| Real FCM receipt on devices in foreground/background/closed | **PENDING:** real devices and messaging credentials |
| Current staging backup + disposable restore after Nov 20 migrations | **BLOCKED:** CF2-E local encrypted V: backup verification |
| Invite-only first real R25 My-Kota pickup including pay-at-shop + collect | **BLOCKED:** separate explicit controlled release gate; hard-off until secured |
| Real public customer orders, refunds, availability, stop/rollback, monitoring | **BLOCKED:** depends on all above |
| Commercial hosting compliance | **BLOCKED:** connected Vercel team is Hobby; Hobby is non-commercial only (official terms https://vercel.com/legal/terms). Return of Vercel quota does **not** authorize commercial orders. |
| Operational performance under genuine requests and peak loads | **PENDING:** real hosting/resources; synthetic tests are only early evidence |

## Currently known platform state

Connected Vercel Hobby projects include Customer `project-x7cvt`, Merchant `local-eats-dashboard-2-6m8o` and API `localeats-api`. Existing Vercel deployment metadata may show a historic `READY` Preview even when an account-level pause causes requests to be denied. Check the actual HTTP response, not only status metadata, before reporting availability.

User-shared previous Vercel pause message (2026-11-22) indicated 273% of free Fluid Active CPU usage with a pause apparently extending through **2026-12-22**; *do not promise the project will resume automatically on a fixed date*. Check actual dashboard billing/usage on the day, without upgrades or purchases.

## Release sequence — no shortcuts

**Browse-only pilot:** Pin exact integrated API and Customer source; source/tests pass; isolate staging + CORS + legitimate/closed shops; obtain owner's physical-phone proof; approve compliant hosting; deploy read-only static Customer and API with writes OFF; confirm real HTTP and rollback. This can permit safe *browsing* and vendor onboarding, not public orders.

**Invite-only real pickup:** Verify current staging restore and actual security rules; bind correct owner shop + authentic near-shop customer; explicit beta admission and timeboxed ability to stop; one real R25 pay-at-shop pickup with signed-in Merchant and push; log, reconcile, and pause/rollback. Approval separately required.

**Public pickup orders:** Repeat real success, reliability/scale/failure checks, then business owner authorizes. Rider delivery, LocalPay and online payments remain OFF.

**Meaning of 100%:** Every required CI check, live pairing, owner identity/GPS/FCM, backup restore, first supervised collection, cost/hosting/legal gate and rollback acceptance has evidence on the *exact release SHAs*. A green Vite build or fake order simulator does not equal 100% Production readiness.

No source or prod UI rewrite, no DNS/domain, no deployment, no database/Firestore/Firebase mutation, no paid upgrade, no real order, no push test sent by this PR.
