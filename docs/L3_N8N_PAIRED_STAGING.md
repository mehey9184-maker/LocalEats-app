# L3-N8N paired Customer Preview preparation

Approved scope: one designated shop per merchant pilot, no shop chooser. API companion draft #205 pins server-only owned/approved shop selection and exact isolated Customer CORS.
Customer expected API commit: 734b858cec4d45dd61e87b765b05e11780200074.
Base Customer draft #120 remains unmerged. This branch is deployment-disabled in vercel.json.

Opt in only on review/l3-n8n-customer-designated-pilot with LOCALEATS_PAIRED_PREVIEW=true. Supply VERCEL_ENV=preview, LOCALEATS_STAGING_ONLY=true, complete VITE_FIREBASE_CONFIG_SOURCE=environment app config for localeats-staging, explicit VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default), VITE_PICKUP_ORDERING_ENABLED=false, LOCALEATS_PAIRED_API_COMMIT=734b858cec4d45dd61e87b765b05e11780200074 and LOCALEATS_PAIRED_API_ORIGIN set to the independently verified immutable API deployment URL. Canonical/branch aliases and Production API URLs are rejected.
The Vite config and Firebase worker guard share the same validation. Existing builds without opt-in retain their current configured/private-test API behavior.
Vite emits paired-staging.json with configured API origin, pinned reviewed commit and Customer commit for independent inspection. These are configuration facts, NOT proof of actual API deployment provenance or real account authentication.

Separate release gate, NOT executed:
- API #205 must pass CI and owner review.
- Before any separately approved deployment, use authenticated Vercel get_deployment on the proposed immutable API URL and match actual SHA 734b858cec4d45dd61e87b765b05e11780200074, repository, staging project prj_eroDrVcFOPlvRJzjCU7vbwGnleFT, team team_nqIkTocJXDSY8Ml7jIsQvHt6 and Preview environment.
- Independently verify staging Firebase/Admin and Supabase identities and all write gates disabled.
- Configure the actual immutable Customer Preview as the API's PAIRED_CUSTOMER_ORIGIN only after checking Customer repository/project/team/commit. Never admit arbitrary previews or reassign the existing Customer private-test/Merchant API aliases.
- Check emitted paired-staging.json and bundle, exact CORS, Vercel access and real existing-account Firebase authentication. No new account/fixture, database write, Firebase rules publication, order, payment, push or community activation is authorized by this preparation.
- If API source changes, update the pinned commit, rerun CI and repeat the metadata preflight. Do not alter the manifest to bless an unverified deployment.

Validation: 5 local synthetic tests exercise actual Vite selection, worker config, failure cases and emitted provenance. 15 API/Merchant tests pass in companion snapshot. Full Customer regression/typecheck/synthetic build runs in PR CI. No hosted cutover or acceptance is claimed.

