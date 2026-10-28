# Firestore order-only safeguard — local review, 2026-10-28

## Scope and preserved baselines

Both pickup worktrees were clean. Pre-edit LOCAL rules are preserved in Git: Customer 276e8354e9a066bdd4002907c4171c12c72e5937:firestore.rules; Merchant/API 5f143800b89c47bb6587541f73e51e6d15f0d675:firestore.rules. The structural tests read these exact Git objects. No authenticated Firebase rules connector/CLI is available to retrieve live releases: CURRENT DEPLOYED RULES ARE NOT CAPTURED. Do not label the Git baselines as deployed backups. Export actual deployed source, ruleset/release identifiers and database binding before approval to deploy.

Observed old Customer helpers/callable/HTTP server and Merchant helpers/bridge/batch migration write root orders/{id}. Both candidates now deny client create/update/delete there for all identities, including set/merge, financial/payment/status/assignment writes, batches and transactions. Order reads and every non-order rule are unchanged. Merchant payments/{id} was already server-write-only; Customer has no root payments allowance. Admin SDK writes bypass rules and require the separately prepared callable/HTTP rejection deployment. A web Preview does not deploy Firebase rules or callables.

Customer still has broad recursive policies beneath shops/stores/merchants/vendors. No observed order writer targets nested orders in these worktrees, and the pickup API does not read shadow Firestore business documents. Unknown nested/catalog/social policies are deliberately unchanged; this is not a general Firestore security approval. Customer's existing public order reads are retained, not endorsed or expanded. Never replace a divergent live ruleset wholesale with either local file.

## Rider preservation and uncertainty

Phase 1 registration, verification, availability and pairing in localeats-api/src/routes/riderAccess.ts use authenticated API/Supabase operations. Rider progression/history in routes/riderOrders.ts use Supabase too. These files and every Firestore rider_profiles/rider_connections/rider_locations/users/chat/payment policy remain unchanged. Merchant order-participant reads used by chat remain unchanged.

An unverified older Rider client directly updating Firestore orders would be rejected. No live client/assignment inventory was performed. Before deploying, establish whether such a path is active and preserve verified authorized continuation through API or a separately reviewed narrow legacy rule. Do not invent Firebase/Postgres Rider identity mappings or permit pickup mutations as a workaround.

## Deployment references needing verification

Customer firebase.json references firestore.rules with no explicit named-database binding; .firebaserc defaults to demo-project. Both committed browser configs identify localeats-5e26e and named database ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe. Customer may override its database through VITE_FIREBASE_FIRESTORE_DATABASE_ID and contains fallback logic. Merchant has firestore.rules but no Firebase deployment configuration in this worktree. Actual active project/database/rules release is therefore unverified. Do not run an unqualified Firebase deploy. Active deployment files/settings were not modified.

## Validation

Both test:rules:static suites pass: all non-order policies are preserved, root order reads are identical, root writes are false, and there is one root orders match. JSON/JS syntax, whitespace and added-line secret checks are run before commit. Static assertions do not replace a Firebase rules compiler/emulator.

Firebase CLI and emulator JAR are absent; only Java 8 was found. Nothing was downloaded, installed or started. Emulator rules compilation and allowed/denied operation results remain UNVERIFIED. Existing @firebase/rules-unit-testing is reused. The harness exits unless FIRESTORE_EMULATOR_HOST is exactly 127.0.0.1:8089 and uses only demo-pickup-rules-* project IDs; it cannot fall back to production or Admin credentials. The old log-only test-rules.cjs now invokes this harness and propagates failures.

After compatible free Java and official CLI/emulator are available, from Customer worktree:

```powershell
firebase emulators:exec --only firestore --project demo-pickup-rules-customer --config firebase.rules-emulator.json "node tests/firestore-pickup-rules.cjs customer firestore.rules"
firebase emulators:exec --only firestore --project demo-pickup-rules-merchant --config firebase.rules-emulator.json "node tests/firestore-pickup-rules.cjs merchant ../merchant-api-pickup/firestore.rules"
```

The second path uses the current sibling worktree layout; otherwise pass the reviewed Merchant rules path. The emulator-only config binds loopback and is not active firebase.json. Tests seed only synthetic emulator records, then check denial for customer/merchant/Rider/outsider/anonymous order creation, totals/payment/status/assignment patches, merges, deletes, batches, transactions and payment creation. They check unchanged history reads, Rider registration/availability/pairing and existing Merchant verification/payment restrictions. These behavioral tests were prepared, NOT executed.

## Approval and non-destructive rollback

Local candidates are ready for review, NOT provider deployment. Required: exact live rules backup/source, correct named-database/project binding, both emulator suites, and legacy Firestore Rider continuation preflight. Patch only the verified live orders write clauses while retaining its other policies. Independently release guarded Admin callable/services before declaring complete closure, then follow approved pickup schema -> API -> Merchant -> Customer cutover.

Rules changes do not delete records. Retain data and exact pre-deploy release export. If unrelated access regresses, restore its verified policies while retaining root order write denial; do not blindly restore permissive order writes or fake-success handlers after cutover. No rules, settings, billing, SQL or production data changes were made in this pass.
