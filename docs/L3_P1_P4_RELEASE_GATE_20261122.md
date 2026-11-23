# LocalEats L3 — P1–P4 Combined Release Gate

**Evidence checked:** 2026-11-22 (Africa/Johannesburg)  
**Decision:** **HOLD for Production**. A combined **zero-write source integration branch is now prepared**; its acceptance is documented in [L3_P1_P4_INTEGRATION_20261122.md](L3_P1_P4_INTEGRATION_20261122.md). No real pickup activation.  
**Owner:** Founder; explicit approval needed for merging, deployment or live-order testing.  
**Release target:** Browse-only Customer first, with all pickup/availability write flags OFF. Merchant UX follows an independently verified release. Real My-Kota pilot is a different, subsequent gate.

This is a current-evidence document, not a release ticket, production change, or claim that isolated test fixtures tested the real application.

## 1. Immutable branch and CI evidence

| Phase | Draft pull request / head SHA | Status when audited |
|---|---|---|
| P1 Customer faster verified catalog and image widths | [#134](https://github.com/mehey9184-maker/LocalEats-app/pull/134), `73374e2c` | **16/16** individual PR workflows passed; real mobile/data proof pending |
| P2 Customer Data Saver and names-only offline references | [#135](https://github.com/mehey9184-maker/LocalEats-app/pull/135), `01de56bf` | **17/17** passed individually; source and isolated browser tests only |
| P3 Customer animation/accessibility/navigation | [#136](https://github.com/mehey9184-maker/LocalEats-app/pull/136), `8dc131d9` | **18/18** passed individually; reduced-motion synthetic browser fixtures |
| P4 Customer truthful explicit inactive/closed shop-state display + canonical company idea register | [#137](https://github.com/mehey9184-maker/LocalEats-app/pull/137), `2a81618d` before this release-gate document | **5/5** individual workflows passed, including pickup/GPS/closed-shop checks; this document's commit will need fresh checks |
| P4 Merchant API-confirmed feedback | [#220](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/220), `66901eaf` | **4/4 standard workflows** passed; 21/21 focused pickup confirmation tests had passed earlier. **Root lint is not clean** (196 errors, 22 warnings in previous full-root run), so do not advertise complete quality sign-off. |

Source repos' main SHAs when checked: Customer `57c0f826`, Merchant `10556f75`. All five PRs are **open, draft and individually mergeable**; **none is merged**. This table deliberately distinguishes an individual PR's green CI from an integrated release.

## 2. Conflict and combined-release gate — BLOCKED

P1–P4 are sibling PRs branched from the same Customer main. Merging each in sequence **without rebase and integration** risks losing newer changes or creating semantic conflicts.

- **P1 ∩ P2:** `src/App.tsx`, `src/components/BlurUpImage.tsx`, root docs.
- **P1 ∩ P3:** `src/App.tsx`, `src/components/CartDrawer.tsx`, `src/components/ShopCard.tsx`, root docs.
- **P1 ∩ P4:** `src/components/ShopCard.tsx`, `tests/customer-public-browse-without-gps.test.mjs`, root docs.
- **P2 ∩ P3:** `src/App.tsx`, `src/screens/SettingsScreen.tsx`, root docs.
- **P3 ∩ P4:** `src/components/ShopCard.tsx`, root docs.
- **P2 ∩ P4:** root docs only.

Before any Customer Production merge:
1. **Prepared:** disposable combined integration branch `integration/l3-p1-p4-zero-write-20261122` with P1→P2→P3→P4 code and a documented conflict-resolution review. The branch now needs independent CI and human review. Preserve each phase's original UI, tests and docs; do not overwrite an entire shared file with another phase's version.
2. Run every phase's tests together plus the original Customer baseline, pickup-security and signup/QR/notification regressions, TypeScript, build, production-secret and service-worker cache checks. Verify the new canonical idea register remains present.
3. Render one **isolated combined actual-React browser fixture** at 320px, 390px and desktop, ideally on a verified read-only branch-specific Vercel Preview. Test home/guest menu, real-item images, Data Saver, photo opt-in, offline/reconnect, 4km browse-only, cart, keyboard focus, notifications and low-motion navigation. Synthetic network timing cannot be reported as real mobile transfer savings.
4. Run actual Android on genuine GPS (3.9km, 4.0km, 4.1km if safely available), browser permissions, slow mobile data, login continuation, closed/away/unknown-status truth, and image-reuse bytes; do not spoof real pickup coordinates.
5. Only after complete evidence and owner sign-off, merge scoped changes **one controlled step at a time**, verify the exact Vercel deployment SHA and alias, execute read-only live smoke, and retain a rollback reference. Do not change pricing, flags or order permissions as part of this release.

Until combined branch CI and real-device/hosted checks finish, P1–P4 cannot be declared fully **jointly release-tested**. A combined branch now exists, but its initial source assembly is not a Production acceptance claim.

## 3. Hosted Preview and API release dependencies — BLOCKED

A read of the authorized Vercel deployment history returned **no branch-matched Preview deployments** for Customer P1 #134, P2 #135, P3 #136, P4 #137 or Merchant P4 #220. Existing CI tests use isolation fixtures, not a full hosted app with real GPS or auth.

- Customer latest Vercel Production: READY from main `57c0f826`.
- Merchant latest Vercel Production: READY from main `10556f75`.
- **API latest recorded Vercel Production: READY from main `a5168ccb`.** Its [apex WWW CORS patch PR #215](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/215) is **merged in GitHub**, but its deployment history still lists the older Production SHA. Verify domain aliases and exact `Origin` preflights for **both** `https://www.localeatssa.co.za` and `https://localeatssa.co.za`; only the allowed origins should get expected CORS behavior. Do not claim the patch is live based only on GitHub's merge state.
- Historical readiness and security issues in [Merchant/API production readiness register](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/blob/main/docs/LOCALEATS_PRODUCTION_RELEASE_READINESS_2026-11-21.md) must be refreshed against current deployments. The old note about API PR #215 being unmerged is outdated; the code merge happened, but API rollout remains unverified.

## 4. Write controls and potentially unsafe Previews — HOLD

Vercel plain env settings checked **without decrypting secrets**:
- **Customer Production** `VITE_PICKUP_ORDERING_ENABLED=false`.
- **Merchant Production** `VITE_PICKUP_ORDERING_ENABLED=false`.
- **API Production** `PICKUP_WRITES_ENABLED=false`, `MERCHANT_AVAILABILITY_WRITES_ENABLED=false`.

Older branch-targeted Preview settings with `true` were also observed:
- Customer `repair/customer-collection-tracking-01` and `integration/pickup-release` have `VITE_PICKUP_ORDERING_ENABLED=true`.
- Merchant `repair/pickup-ready-and-price-display-01` and `integration/pickup-payment-availability` have `VITE_PICKUP_ORDERING_ENABLED=true`.
- **API Preview** `integration/pickup-payment-availability` has `PICKUP_WRITES_ENABLED=true`, and READY deployments were found for that branch.

These do not prove unsafe real writes are possible. **They do require a concrete database/project isolation and backend authorization check before any Preview-based write or acceptance test**. Do not issue test orders or toggle gates. Review existing branch-specific flags and invalidate dormant write-enabled previews by a separate, approved operations action if they are unneeded.

## 5. End-to-end acceptance — NOT DONE

**Browse-only Release A must pass**:
- Genuine approved pilot shop list, test-fixture visibility and effective availability reviewed by owner; **My-Kota remains effectively unavailable until shop owner confirms actual readiness**, even if historical base `is_active=true`.
- Both Customer domains and API `/health` and shop catalog CORS GET/OPTIONS checked from read-only browser paths; HTTPS redirects, PWA/manifest/install, 320px/390px navigation and data-saving behavior accepted.
- Genuine customer GPS, outside-4km browsing, accurate real prices/stock/closed/away claims, and no real orders or uploads.
- Production and Preview flags for this release verified OFF; correct source SHA deployed only after owner sign-off; rollback proof available.

**Restricted pilot Release B is separately blocked** until all of:
- Shop owner consent, approved My-Kota effective open state (historical hours 08:00–22:00), one consenting genuine Customer physically within 4km, safe authenticated shop ownership/allowlist and migration/state guards.
- Production Firebase Auth/security rules, actual FCM browser+OS delivery and a fallback confirmation channel, customer/merchant order reconciliation, payment-at-counter event and actual handover receipt all proved.
- Separately approved shop/user-scoped activation and rollback. No public delivery/Rider, LocalPay wallet, subscriptions, online payments or broad public pickup activation.

## 6. Evidence-led go/no-go decision

| Gate | Current status | Decision |
|---|---|---|
| Individual Customer P1–P4 CI | PASS, isolated | Continue |
| Merchant P4 focused tests and build | Focused tests PASS, build through existing gate PASS; root lint has documented debt | Continue only with scoped review |
| Combined P1–P4 integration and conflict reconciliation | **BRANCH PREPARED**; combined CI/visual acceptance pending | **HOLD** |
| Branch-matched full hosted Previews | **NOT FOUND** | **HOLD** |
| API apex+WWW live CORS after source merge | **NOT VERIFIED on current API deployment** | **HOLD** |
| Old Preview write-enabled isolation | **NOT VERIFIED** | **HOLD for write tests** |
| Genuine-device GPS, bandwidth, visibility and FCM | **NOT VERIFIED** | **HOLD** |
| Owner shop/menu/test-fixture readiness | **NOT CONFIRMED** | **HOLD** |
| Public ordering, real payment and delivery | **OUT OF SCOPE** | **OFF** |

**Overall:** P1–P4 are *individually code-ready*, **not jointly release-ready**. Merge, Production deployment, schema, flags and actual customer orders were intentionally not performed.

**Next authorized technical step:** validate the combined zero-write integration PR's exact CI SHA and screenshot evidence, then prepare only a **read-only hosted Preview** for genuine-device acceptance with owner review. For the business concept catalog, the source of truth is [LocalEats Scalable Idea & Decision Register](LOCALEATS_SCALABLE_IDEA_REGISTER.md); architecture proposals such as versioned CDN image caches must remain unimplemented until expressly approved.
