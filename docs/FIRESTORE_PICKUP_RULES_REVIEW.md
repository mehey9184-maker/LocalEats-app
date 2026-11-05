# Pickup Firestore access review

Review candidate only. Deployment requires a separate approval and is not part of this PR.

The baseline is the deployed ruleset from the named LocalEats database, read on 2026-11-05. Its SHA-256 is ed2ea3db7dd7f896b25b91573b2d1ccd472656f477739329383cb1906aee3496.

The candidate denies direct browser order updates, removes unaffiliated rider-pool order reads, and restricts rider profile reads to the matching authenticated document ID. Customer-owned and shop-owner order reads remain available. The pickup API writes business state to Postgres.

The emulator test reproduces the baseline access, then verifies the candidate with synthetic identities. It also checks public shop/menu reads, own profile access and unrelated-account denial.

Before deployment, refresh the deployed ruleset and compare it with this baseline, confirm legacy order/rider consumers are inactive for pickup, verify a recoverable backup, and obtain owner approval. Test current Client and Merchant flows in isolated staging. The root firestore.rules remains the existing repository file and is not the reviewed deployment candidate. No migration, deployment flag, live order or production data changes are included here.

This focused candidate does not certify all existing collections or the deployed Cloud Functions. Supabase legacy rider-notification permissions require their separate reviewed repair.
