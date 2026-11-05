# Proposed Client Firestore rules — REVIEW ONLY (2026-11-05)

**Not a deployment plan.** This proposal belongs to `security/firestore-review-only-20261105`, a separate draft PR **based on the unmerged Customer P0 repair branch**. Never merge this branch into `main` or deploy rules without a distinct owner-approved rollout plan, source-of-truth verification, backups, actual deployed-rules inspection and an exact Firestore database ID. The Client and Merchant repositories contain *different* rule files; the Merchant repository uses a named Firestore database. Neither file proves what is deployed.

## Existing vulnerability and proposed policy

The current Client `firestore.rules` grants `allow read, write: if true` to profiles, orders, shops, nested shop documents, messages, rider telemetry, and push tokens. The previous local emulator run confirmed four unauthorized private-record operations succeeded. This branch replaces those insecure rules with default-deny and these narrow grants:

| Path | Customer / anonymous reads | Browser writes | Compatibility notes |
| --- | --- | --- | --- |
| `shops/*`, `menu_items/*`, `shops/*/menu/*` | Public GET and query | Denied; authenticated merchant API required | Public shop document fields must be reviewed for secrets/customer data; rules cannot redact selected fields |
| `reviews/*` | Public | Denied pending authenticated moderation | Legacy client review submission will need a server endpoint |
| `profiles/{uid}`, `users/{uid}` | Only matching Firebase UID GET; no broad list | Denied | Customer P0 profile writes go to server-authorized Supabase API; Merchant legacy `users` bootstrap may need separate handling |
| `orders/*` | Customer owns `user_id`; merchant owns the `shops/{shop_id}` record | All creation, payments, kitchen status, collection and deletion denied; server authority only | Shop-owner query filtering, mixed numeric IDs and existing orders need dedicated integration acceptance |
| `follows/*` | Owner read/query by `user_id` | Owner can create/delete matching `uid_shopId`; cannot update | Repeating a legacy follow without checking its existence may fail; aggregate follower reads need API |
| `user_push_tokens/*` | Owner only | Owner create/update/delete with constrained fields | No unauthenticated token reads or writes |
| Other paths, including private shop subcollections, messages, rider/financial/promo/support/error logs, and legacy shadow store tables | Denied | Denied | These historical/direct Firestore features require separately reviewed server endpoints |

**Do not weaken the rules to preserve an unsafe direct-client write.** Restricting backend-authoritative actions is intentional, but any dependent UI must fail explicitly and be migrated to verified API operations before rollout.

## Source-code and backend compatibility assessment

- Customer source still contains legacy direct Firestore methods for review submission, shop/profile mirroring, chat, rider telemetry, contact messages, menu/shop editing and get-all-orders. Some are dead/disabled by pickup P0; others may remain reachable elsewhere. This proposal intentionally blocks those direct writes.
- Merchant source has authenticated queries for `users`, `shops`, `menu_items`, `orders`, `rider_profiles`, `reviews` and other collections, and its own materially different rules. Do **not** deploy this Client candidate to the Merchant named database without reviewing its active rules, shop ownership/approval, existing data and auth bootstrap. Review the exact Firebase project and database mapping first.
- The customer storefront has an API-backed 4 km pickup catalog, while legacy shop discovery still reads public `shops` and `menu_items`; these remain readable in the candidate.
- Orders are server-created and must not be client-forged. Merchant pay-at-shop confirmation and handover require separate server transitions, not rule-enabled direct writes.
- Firestore rules are not filters. The emulator explicitly tests a customer query constrained by `user_id`; nonconforming queries should be changed, not given broad read access.
- Firebase Admin SDK service access bypasses these Firestore rules; verify IAM and API ownership/authorization separately. No claim of live-backend coverage is made by emulator tests.

## Emulator evidence and exact commands

Tests operate against **only** `demo-localeats-p0` locally. CI installs Node 22, Java 21, pinned `firebase-tools@15.34.2`, and existing package-lock dependencies. Run from this branch:

```sh
npm ci
npx --yes firebase-tools@15.34.2 emulators:exec --project demo-localeats-p0 --only auth,firestore "npm run test:p0-auth-emulator && npm run test:p0-firestore-rules-gate && node --experimental-strip-types --test tests/customer-firestore-rules-compat-review.test.mjs"
```

The existing exploit regression checks denial of anonymous and cross-account profile/order reads and writes. The new tests check public catalog reads, owner-only profile and customer order reads, merchant ownership, server-only order/payment mutations, restricted shop/menu writes and owner-only follows/push tokens. All data is synthetic.

## Mandatory owner release gates — not approved here

1. Read the **actually deployed** Firestore rules in both the Client default/named and Merchant named database, and obtain a verified mapping from Firebase project/database ID to each frontend and API.
2. Inventory real collection document schemas **without exposing PII** and check whether `orders.shop_id` is numeric/string, whether `shops.owner_id` equals Firebase Auth UID, and whether saved profiles use Firebase UID as document ID.
3. Run multi-account Customer + Merchant read-only and isolated mutation smoke tests against the actual API, not just mock/emulator data, including rejected out-of-shop, account switching, and pickup accept/ready/collected transitions.
4. Identify and migrate/disable all reachable legacy client writes that this proposal denies (review posting, shop/menu updates, contact forms, merchant bootstrap, cached fallback). Preserve original UI, tell users when a save failed; never claim data persisted from local cache.
5. Review controlled rollout/rollback, PWA cache, existing Firebase rules versions, IAM/security, frontend error handling and query performance. **Separate approval** is required before any Firebase rule deploy, live database change, merge to `main`, or pickup activation.

No real Firebase database, profile, payment, order or notification was changed by drafting this file.
