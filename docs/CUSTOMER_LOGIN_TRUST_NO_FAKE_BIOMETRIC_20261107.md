# LocalEats Customer — verified sign-in only (2026-11-07)

## Real bug fixed without a new paid service
The previous Customer Login screen treated a random string in `localStorage.remember_me_secure_token` as enough to announce "Biometric authentication successful!" and enter the app, **even if browser WebAuthn returned no server-verified session**. It also wrote a fake `fallback_mock_credential_id` after failed enrollment and let user-editable `user_metadata.role` populate both the local Customer role and background profile upsert.

**Release correction:** Remove the fake biometric sign-in path, simulated scanner, local WebAuthn enrollment without a server verification step, and false success badge. The Customer Login screen now honestly says Fingerprint/Face ID sign-in is **coming soon**. The existing email/password login, account registration, password reset, Remember Me (email only), Google/Apple sign-in and original UI layout remain. After a successful password login, clear legacy fake biometric tokens and keep the ordinary UI role `user` and the background profile API role `customer` regardless of raw user metadata. This reduces browser-origin role spoofing, but **does not fix Production's Supabase `public.handle_new_user()` trigger**, which remains a separate controlled SQL security issue.

No new Supabase tables, projects or auth providers are introduced. No Firebase Auth/Firestore rules, real orders, online payments, subscription billing, delivery or rider activation. The API ordering flags remain OFF.

## Verification
- `tests/customer-biometric-signin-trust-main.test.mjs` rejects any remembered-token-onLogin bypass, generated fake keys, use of editable metadata as Customer role, or misleading biometric sign-in claim.
- Customer CI includes previous real logout, guest login guard, startup routing and original pickup regression checks, TypeScript and build.
- GitHub/Production deployment READY is not an end-to-end login test. Owner may verify registered email/password, remembered email (password not remembered), profile access requiring login, and no fake biometric sign-in. Never report a customer password or token.

## Follow-up, kept separate
Live Production user metadata signup-trigger role escalation (`public.handle_new_user()`) requires the reviewed SQL security fix and an independently backed-up, scoped Production cutover; the broad 53-file profile rewrite in Customer draft #71 requires hosted Firebase/Supabase acceptance and must not be blindly merged. Published named Firestore rules require verification. Full pickup transaction pilot still requires server checkout cutover, actual order creation and merchant receipt with customer/merchant account isolation.
