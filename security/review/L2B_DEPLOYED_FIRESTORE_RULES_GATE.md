# L2B — Customer Firebase Rules deployment gate (review only)
Date: 11 November 2026. Status: DRAFT; **do not publish** any Firebase rules or update Production.

## Confirmed source discrepancy
1. The root firebase.json config selects root firestore.rules for a manual firebase deploy.
2. The current root firestore.rules has numerous unconditional allow read/write if true declarations. They include profiles, orders, shop documents, message collections and Rider records. It is unsafe to deploy this source file.
3. security/review/firebase.json selects security/review/firestore-pickup-phase1.rules for **local emulator tests**. tests/firestore-pickup-review.test.cjs is wired into an existing CI workflow and compares a previous restrictive baseline with the stricter Pickup candidate. Its synthetic tests check unauthorized order reads, arbitrary order state mutations, financial field deletion and rider visibility.
4. The restrictive candidate is not necessarily the active deployed ruleset and is not automatically safe to deploy: verify all required queries, two-account user switching, shops/menu, merchant ownership, profile writes, chat, notification permissions and legacy compatibility.
5. No Firebase Rules release export or named-database metadata is available in this conversation's connected tooling. A GitHub filename labelled "deployed baseline" is **not** proof of actual deployed rules.

## L2 release freeze
- Do not run firebase deploy --only firestore, database migrations, or any production Firebase rule command using root firebase.json.
- No production release may rely on root firestore.rules until this permissive source is replaced with owner-approved tested rules and the live Firebase ruleset is independently read.
- Use Firebase console Rules or authenticated provider export to obtain: project ID, named Firestore database, active rules release/version, and effective rules text; never paste private keys or ID tokens into chat.
- Compare the exported actual live rules to the known repository baselines. Run Firebase emulator permission matrix with guest/customer A/customer B/merchant A/merchant B, orders, profiles, chats, shop/menu, rider-denied and auth revoke test cases.
- Check that API-only operations (creating orders, marking paid, pickup collected, financial totals, pricing, rewards and rider stats) are denied to all untrusted client roles. Preserve public shop/menu reads only after confirming safe field shapes.
- Test real auth UID mapping, sign-up, account switch and offline/online transitions. Firebase claim check must use the Firebase account actually logged in; never trust user-editable profile role.
- Deploy to isolated staging first with separate approval. No source-to-Production rules auto sync. Verify the installed release and negative permissions before asking owner permission for Production.
- Keep Production pickup ordering and payment/rewards/rider writes OFF throughout L2.

## Evidence expected before L2B acceptance
A sanitized exported deployed rules version, CI emulator pass, a specific isolated staging deployment, zero unauthorized cross-account reads/writes, and a tested rollback/roll-forward that does not restore unrestricted rules.

## This PR
Only this review note; existing emulator CI is triggered by changes under security/review. No active rules, app code, Firebase config, Vercel environment, API, or Production changes.
