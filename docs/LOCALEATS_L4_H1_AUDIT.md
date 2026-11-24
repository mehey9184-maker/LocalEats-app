# L4-H1 — Initial code-health audit (2026-11-24)
Status: first-pass source/documentation inventory, not full dependency audit. No runtime code deletion or new paid service.

## Evidence and findings
1. Customer [src/App.tsx](../src/App.tsx) inspected on main: 10,542 lines; imports legacy Supabase helpers at lines 188–189. Size is a maintainability hotspot, not a proof of defect. Map mount paths, lazy imports, side effects, state ownership and tests before splitting.
2. Customer [src/hooks/useShopsData.ts](../src/hooks/useShopsData.ts) inspected: 309 lines, Supabase import at line 3 and seedDemoShops at 285–287. AGENTS.md describes it as unmounted and unapproved; this is a candidate for reachability audit, NOT confirmed removable. Check imports, dynamic imports, routes, tests, scripts and demo-only use. Never reattach fake catalog fallbacks to Production.
3. Both package.json files include @supabase/supabase-js, @google/genai, mapping and PDF/QR packages. Customer also declares react-onesignal while Firebase FCM is intended. Customer Vite appears in both dependencies and devDependencies (same range). Merchant includes Leaflet and Pigeon Maps, React 18 vs Customer React 19. Dependency presence is not evidence of execution, vulnerability or redundancy. Audit usage, build output, lockfiles and runtime paths; do not align versions or remove libraries blindly.
4. Existing AGENTS.md and functionality docs preserve historical guidance mixed with current decisions. Customer README describes old Supabase backend setup and manual SQL, whereas current pickup instructions demand server authority. Treat README as historical pending reconciliation. Merchant older Firestore model/cache fallback notes must not override current pickup safety. Added a canonical handover entry rather than silently deleting history.
5. Graphify graph_stats unavailable (index busy); no graph coverage or dead-code claim. Exact current main SHA must be re-read in the audit checkout. No local build, lint, dependency scanner, tests or bundle measurement executed in this first pass. Existing PR evidence is not fresh validation.

## H1 completion plan
- H1B pin both main SHAs, inventory tracked source/entrypoints, routes, dynamic imports, workers, feature gates, migration scripts, CI and package locks. Use Graphify if available at pinned SHA plus static search. Build baseline with locked dependencies; run existing test suites in truly isolated mode.
- H1C classify candidates as live, deferred, test/demo, unknown or confirmed dead. Gather references, import/call paths, tests, runtime coverage and bundle contribution. Use duplication scan for application code (exclude generated/vendor/lockfiles); inspect high-cost hotspots. No secrets in reports.
- H1D one small reviewable cleanup at a time; tests before/after, no UI regression or authorization change, preserve deferred features and rollback path. Source-only draft PRs; owner signoff for merge/release.
- H1E rerun full Customer/Merchant/API checks, compare bundles and lint, record exact SHAs and findings. Do not call H1 complete until audit evidence and cleanup disposition are recorded. Continue only then to H2.

## H1B update — 2026-11-24
See [pinned source inventory](LOCALEATS_L4_H1B_SOURCE_INVENTORY.md). Graphify recovered and matched both main SHAs. Initial inventory and sampled route/SDK inspection complete; reachability, duplicate analysis, exact method/permission matrix and fresh isolated baseline remain pending. Future C++ policy is proposed, not launch work.
