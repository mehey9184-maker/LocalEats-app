# LocalEats — AI handover and engineering decision register
Status: review draft | Snapshot: 2026-11-24 (Africa/Johannesburg)
Owner: founder / product owner. Target launch: 2027-01-01, conditional on acceptance. Additional infrastructure budget: R0 unless separately approved.

## Read this first (five-minute orientation)
This is the canonical cross-app orientation and decision register, not authorization to deploy. Read root AGENTS.md, then the relevant pickup skill and only the functionality-document sections needed for the task. Older documents preserve history and can describe superseded architecture. Confirm branch, SHA, implementation, flags and environment before claiming anything current. If guidance conflicts, pause the risky action and reconcile with owner decisions, source and tests. A merged PR is not a deployed release. Never expose credentials, real customer data or private backups.

## Product contract
- Customer: find genuine local food shops, browse menu, cart, authenticated server-authoritative pickup quote/create, order progress, collect and pay at shop. Closed/outside-4-km shops remain browsable; no checkout when ineligible. Genuine GPS; never invent coordinates, prices, ratings, status or availability. Preserve original ShopCard, five tabs, branding and approved interaction.
- Merchant: owner-scoped dashboard, menu, truthful hours/status, accept/prepare/ready, record physical payment and confirm handover through server. Marketing QR/poster tools must not imply a live campaign, discount or revenue that does not exist. Demo uses fictional data only.
- Rider/delivery, LocalPay, online payment, subscriptions, Super Admin expansion and wider product family are retained/deferred, not launch-enabled. Do not delete retained modules merely because they are inactive.
- Launch first with a consenting shop and a distinct consenting nearby customer. Pay at shop; no fabricated payment/order. Broader rollout is a separate owner decision.

## Architecture: intended versus observed
Target: React/Vite PWA Customer and Merchant -> authenticated LocalEats API -> Supabase Postgres. Firebase Auth and FCM; Cloudflare API/hosting and R2 media are the direction, not a claim that migration is complete. Cloudinary/legacy integration may still exist; inspect actual adapters. Frontend must not bypass API for protected business operations. API derives identity, ownership, prices, eligibility and allowed transitions; idempotency/revisions prevent duplicate orders and stale commands. Push is a notification, never authoritative order state. Offline reference is noninteractive shop names/categories only, max 24h, not cached menu/price/availability/auth/order truth. Local storage may retain retry intent, never prove persistence/payment. Keep public read caching bounded; do not cache authenticated responses across accounts.

## Repository and evidence map
| Project | First files / evidence |
|---|---|
| Customer | AGENTS.md; LocalEats_App_Functionality_Documentation.md; .agents/skills/localeats-pickup-launch/SKILL.md; src/App.tsx; package.json; tests/; .github/workflows/ |
| Merchant/API | [repository](https://github.com/mehey9184-maker/LocalEats-Dashboard.2); AGENTS.md; Vendor_LocalEats_App_Functionality_Documentation.md; .agents/skills/localeats-merchant-pickup/SKILL.md; src/App.tsx; package.json; tests/; locate API roots from actual tree/config |
| Product ideas | [Scalable idea register](LOCALEATS_SCALABLE_IDEA_REGISTER.md): proposals are not approvals |
| Source release | [Customer #139](https://github.com/mehey9184-maker/LocalEats-app/pull/139) merged Nov 23; combined tested head f035dc2f3964a7aabab282819248d2abf0d4bab3 (20/20 PR workflows reported); merge commit 7872fc844b442219be86ffafc19092124f8e8e42. [Merchant #240](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/240) merged Nov 23; merge commit 45eb99d93c60efc0bfafcaa866d7a17f829fab28. These are verified PR snapshots, not guarantees about current main/hosting. |
| Other candidates | [#141](https://github.com/mehey9184-maker/LocalEats-app/pull/141) draft cross-repo source gate pins older candidates; [#239](https://github.com/mehey9184-maker/LocalEats-Dashboard.2/pull/239) draft isolated fictional workshop reports 319 passing tests, zero TS/ESLint errors, 22 warnings; real-device visual hold. Do not combine stacks blindly. |
| Production history | Merchant docs/LOCALEATS_PRODUCTION_RELEASE_READINESS_2026-11-21.md (dated historical snapshot, recheck current flags and deployments). |

## Decision log (append, do not erase history)
| ID | Date | Decision / rationale | State and evidence |
|---|---|---|---|
| ADR-001 | 2026-11-24 recorded | Pickup-first, physical pay-at-shop; minimize operational/payment risks. | Existing owner direction; ordering activation separately gated. |
| ADR-002 | 2026-11-24 recorded | Central API, server-authoritative business truth, isolated environments; no direct protected browser writes. | Target contract; audit legacy paths, not a completed migration. |
| ADR-003 | 2026-11-24 recorded | Preserve approved UI; real low-end phone and slow-data acceptance; truthful offline and availability states. | Customer #139 source evidence; device/hosted gates open. |
| ADR-004 | 2026-11-24 recorded | Prefer bounded, versioned media/cache and measured usage; no costly infrastructure or bulk photo downloads without evidence. | Idea register; future CDN reuse not implemented. |
| ADR-005 | 2026-11-24 | Record backup restoration and security reconciliation, protect recoverability before enabling orders. | Owner terminal evidence: 55/55 exported COPY content hashes, PostGIS separately matched, 48/48 check/FK tests, 7/7 scoped security categories after 97 local excess grants corrected, 78 exact constraint fingerprints + one equivalent grouping. Local encrypted 8-file archive passed test; separate medium/offsite copy pending. Managed-schema adaptation and permission correction needed. No claim of full external-service recovery. Keep private recovery materials outside Git. |
| ADR-006 | 2026-11-24 | Prioritize maintainability/security/reliability before feature expansion; maintain a repository AI handover and decision log. | Founder requested; L4-H1 draft. |
| ADR-007 | 2026-11-24 proposed | Adopt small, reversible cleanup PRs with trace evidence, test baselines, owner review. | Proposed execution procedure, no blanket deletion/merge authority. |

For new decisions append ID/date, owner approval or proposal status, problem/options, chosen rationale, affected repos/files, security/cost/data implications, test evidence (SHA/run), rollback, and follow-up. Mark superseded decisions explicitly; don't rewrite past events. Update current status and relevant functionality doc with each material change.

## Release acceptance / open work
- Recheck exact deployed Customer/API/Merchant SHA, CORS apex and www, write flags, environment isolation, commercial hosting eligibility. PR CI is insufficient.
- Genuine Android GPS/4-km and mobile bytes, real foreground/background FCM, separate consenting accounts, shop availability, pickup/physical payment/handover, retry and pause/rollback.
- Backup: external verified copy and independent offsite storage pending; staging restore and Firebase/media/config recovery not proven by this Production database rehearsal. No raw SQL, credentials, tokens, personal data or backup location in Git.
- No production write/flag, migration, deployment, spend, new live orders or main merge as part of H1. Separate release sign-off.
- H1 initial findings: see docs/LOCALEATS_L4_H1_AUDIT.md. Next H2 API architecture, H3 security, H4 performance, H5 resilience, H6 load simulation, H7 maintenance/observability, H8 release acceptance. No invented completion percentages.

## Agent handoff template
Task / owner intent; exact base+head SHA; environment and permissions; files and dependency graph coverage; decisions changed (ADR IDs); tests run, counts, logs/links; defects and unknowns; cost/security impact; rollback; next smallest safe step. Label each claim observed, reported, target, proposed or unverified. Keep the next agent's reading limited to relevant files; use Graphify if indexed at the right SHA, then verify with source and runtime tests. An absent edge is not proof of dead code.
