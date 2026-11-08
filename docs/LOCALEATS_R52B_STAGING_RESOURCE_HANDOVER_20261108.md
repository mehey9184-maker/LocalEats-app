# LocalEats R5.2B — Customer staging resource acceptance

**8 November 2026 | Draft-only, still blocked for hosted testing.** No Customer runtime change in R5.2B; the R5.2 explicit `VITE_FIREBASE_CONFIG_SOURCE=environment` guard remains in place with default behavior unchanged. Existing original ShopCard, Home, login, menu, cart and pickup-history recovery remain.

Read-only Vercel inspection: Customer project `project-x7cvt` has Firebase variables shared across Preview/Production, **no exact hosted deployment for Customer draft PR #82**, and no complete branch-only staging variables for that draft. An older profile-testing branch has scoped settings but uses a Firebase project ID starting with `demo-` and an API origin not parsing as an HTTPS URL. Firebase demo IDs are emulator-only; that older branch cannot satisfy hosted authentication recovery.

Connected Supabase metadata verifies separate active projects named LocalEats and LocalEats-Profile-Staging, but the staging project's public schema currently contains `profiles` only. It does not yet establish pickup history or merchant acceptance tables. No production data was read or copied and no staging schema or credentials were modified.

**Do not** point the Customer draft at an existing Preview assuming it is isolated, and do not create/revoke Firebase users or run browser login against Production. First prove a separate REAL hosted Firebase project, use a reviewed isolated Supabase staging schema, and attach Customer/API/optional Merchant staging-only variables and HTTPS endpoints without Production credential fallback. Verify the exact draft head deployment before enabling an explicitly approved synthetic-identity test. Keep all ordering, profile, Merchant, payout, Rewards and LocalPay writes disabled.

The canonical cross-repository plan and offline resource-snapshot tests are in API draft PR #124: `docs/R52B_DEDICATED_STAGING_SETUP_AND_ACCEPTANCE_20261108.md` and `localeats-api/tests/rewards/r52b/*`. These snapshot tests are NOT hosted sign-in tests or infrastructure approval. Customer PR #82 and API PR #124 remain draft, unmerged.
