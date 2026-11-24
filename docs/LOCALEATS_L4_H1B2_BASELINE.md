# L4-H1B.2 — reproducible build and testing baseline
Date: 2026-11-24. State: completed baseline; HOLD on Merchant dependency-tree integrity. See exact measured results below.
Pinned source: Customer 7872fc844b442219be86ffafc19092124f8e8e42; Merchant/API 45eb99d93c60efc0bfafcaa866d7a17f829fab28. Both main refs rechecked unchanged. Local sandbox Node 22.16.0/npm 10.9.2 was available but git ls-remote failed DNS resolution; no dependencies installed or tests run locally.
Workflow: .github/workflows/l4-h1b2-baseline.yml, on changes to that file in draft PR #142; standard public GitHub-hosted Ubuntu runner, Node 22, npm ci using existing lockfiles. No paid infrastructure requested. Three independent jobs via matrix (Customer, Merchant, API), exact commit checkout, read-only contents permission, no credentials persisted, no provider secrets. Package install needs public registry access; build, lint and tests run with clean environment in a Linux network namespace with only loopback enabled and normal runner UID. Fail closed if namespace setup fails. Explicit write flags false; no hosted service calls. No unknown live diagnostics, deploy, SQL, real orders, production writes or merge.
Selected Customer and Merchant suites are from existing reviewed workflows customer-l3-p1-p4-integration.yml and l4-r1-integrated-source.yml; Merchant TS/ESLint from l4-r1-merchant-quality-audit.yml. API uses locked npm test and mock-only preview smoke; no cross-repo browser or real-phone tests in this gate. Each command logs elapsed seconds and exit status; JS/CSS raw/gzip aggregate measured after successful build. npm dependency tree check is not a vulnerability audit. Test counts are in TAP logs; any failure makes job fail. Preserve failure evidence and investigate before H1C/H1D.
Historical source CI reported by #139 and #240 is not a new baseline. GitHub listing for exact Customer merge SHA returned three completed failed signup-home workflow records (latest 45473683817, no jobs returned by jobs endpoint); cause unverified, do not equate earlier green PR with main health. Exact Merchant merge SHA listing returned no runs. New baseline addresses this evidence gap. Inspect live run at https://github.com/mehey9184-maker/LocalEats-app/actions/workflows/l4-h1b2-baseline.yml. After completion record run URL, job status, exact Node/npm, test counts, lint warnings/errors, build elapsed, output metrics and blockers. Do not change application code to force green.

## Completed baseline — 2026-11-24
Evidence: [run 45478820413](https://github.com/mehey9184-maker/LocalEats-app/actions/runs/45478820413), workflow revision 11e9d13e40bf59cd93a6cf6385c0c8a2892068d8; pinned source revisions above. Runner Node 22.23.5/npm 10.9.9. All three lockfile installs succeeded; all offline jobs reached execution. Overall HOLD: 2/3 jobs succeeded; 383/383 selected tests passed, but Merchant dependency tree failed. Builds succeeded; no deployment or live service test.

| Metric | Customer | Merchant | API |
|---|---:|---:|---:|
| npm ci seconds | 9 | 10 | 3 |
| npm ls exit | 0 | 1 | 0 |
| TypeScript | pass (10s) | pass (6s) | pass in build/test |
| ESLint | not separately run | 0 errors, 22 warnings (10s) | not separately run |
| Selected tests | 83/83 | 61/61 | 234/234 + 5/5 preview |
| Build seconds | 7 | 9 | combined build/test 3s |
| JS files | 7 | 4 | n/a |
| JS raw bytes | 2742790 | 3639425 | n/a |
| JS gzip9 bytes | 733350 | 969102 | n/a |
| CSS raw bytes | 271529 | 241078 | n/a |
| CSS gzip9 bytes | 36546 | 34116 | n/a |
| Job | [PASS](https://github.com/mehey9184-maker/LocalEats-app/actions/runs/45478820413/job/138746135721) | [FAIL](https://github.com/mehey9184-maker/LocalEats-app/actions/runs/45478820413/job/138746136062) | [PASS](https://github.com/mehey9184-maker/LocalEats-app/actions/runs/45478820413/job/138746136219) |

### Dependency findings — H1B.3 blocker
Merchant npm ls ELSPROBLEMS flags vite@5.4.21 and ajv@6.14.0. Pinned Merchant .npmrc contains legacy-peer-deps=true, explaining why installation can pass without enforcing peer compatibility. Lockfile shows vitest@5.0.0 peer vite ^6.4.0 || ^7.0.0 || ^8.0.0; @vitest/mocker@5.0.0 requires ^6.0.0 || ^7.0.0 || ^8.0.0. Root Vite 5.4.21 is outside both. Root AJV 6.14.0 satisfies ESLint 9.39.4 and @eslint/eslintrc 3.3.5; @apideck/better-ajv-errors@0.3.7 requires AJV >=8, pulled by workbox-build@7.4.1 (nested AJV 8.20.0), itself pulled by vite-plugin-pwa@1.3.0. Verify resolved peer paths using npm explain before proposing narrowly scoped repair; do not replace root AJV globally or upgrade all packages. Deprecation warnings (including tar/glob) are review candidates, not proof of exploitable vulnerabilities. No npm audit performed. Record exact before/after metrics, lockfile diff, test usage, security implications, rollback and clean npm ls. Do not disable the failing check. Existing signup-home workflow failed without job evidence; independent cause pending. 

### Measurement limitations and decision
Aggregate compressed asset bytes are sums of separately gzip9-compressed assets, not first-load network transfer or device performance. Timings are a single CI observation, not capacity guarantees. Only selected test suites ran; no real phone, production push, cross-repo end-to-end or live account/order tests. A successful build with a failed dependency integrity gate is not a clean baseline. Proceed with L4-H1B.3 dependency compatibility investigation before broad H1C/H1D cleanup. Keep all flags and production unchanged; no paid plan or runtime source change. This document-only update can trigger the pinned CI again; the historical measurements remain tied to run 45478820413.
