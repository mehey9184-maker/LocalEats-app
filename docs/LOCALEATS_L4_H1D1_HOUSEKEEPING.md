# L4-H1D.1 — conservative housekeeping
2026-11-24 | Rehearsal PASS; exact tested deletions saved in draft branches, merge approval pending.
Evidence: [CI run 45481424403](https://github.com/mehey9184-maker/LocalEats-app/actions/runs/45481424403), workflow revision 10e29638921f5a71be636bcfe1922b89105a6090. Pinned Customer main 7872fc844b442219be86ffafc19092124f8e8e42; Merchant verified dependency repair 5259101e7b3ccd3b8cc900a812efa851538d86ed (PR #242).
Decision: remove only empty placeholders and one exact redundant historical script; preserve workers, security snapshots, test source files and deferred features. Full tracked git grep filename checks (including docs/config/tests) passed; byte-size/identity proof passed before git rm in disposable CI. No historical diagnostic executed.

| Repo | Deleted | Evidence |
|---|---|---|
| Customer | src/App_recovered.tsx | 0 bytes, no tracked filename references |
| Merchant | app_tsx.txt | 0 bytes, no tracked filename references |
| Merchant API | localeats-api/test_api4.sh | byte-identical to retained test_api2.sh (422 bytes), no tracked filename references |

Offline tests (loopback namespace, no live credentials, explicit write flags off) after deletion: Customer 83/83, Merchant 61/61; both npm ls, type checks and builds pass. Merchant ESLint 0 errors, 22 existing warnings. Customer JS 733350 gzip9 bytes, CSS 36546; Merchant JS 969102, CSS 34116. Aggregate raw and compressed asset counts/sizes match H1B.2/H1B.3 baseline exactly; not a claim of binary or screenshot equivalence. API unit suite not rerun in this housekeeping test, no API runtime source changed.

Saved exact deletion commits [Customer a1f3886](https://github.com/mehey9184-maker/LocalEats-app/commit/a1f3886bb61e078921713265dcb64c7cca6392af) and [Merchant 6d25d11](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/commit/6d25d111f7faa7794013b6979a3cc4126b6a530a). GitHub compare confirmed only those three deletions relative to their respective pre-deletion parents. CI tested identical deletions in rehearsal rather than the later documentation commits. [Customer PR #144](https://github.com/mehey9184-maker/LocalEats-app/pull/144); [Merchant PR #243](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/243) deliberately stacked on repair #242; merge dependency first, then review/rebase housekeeping against main. External/manual references are not proven absent; review before merge. Rollback by reverting deletion commit or restoring exact file from parent. No main merge, requested deployment, live account/order, database or paid plan changes.
Next H1D.2: inspect all callers of disabled legacy cancelOrder callback, preserve early guard/message and active pickupCancellation service; remove proven unreachable body only after source-assertion/behavior regression tests. Do not reconnect offline direct writes or remove deferred functions without proof.
