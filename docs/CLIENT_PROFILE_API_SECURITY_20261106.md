# LocalEats customer profile API — no anonymous bypass or fabricated saves

Prepared 2026-11-06 as a narrow security fix. It changes the legacy `server.ts` profile handler source only; it does not claim that Vercel currently runs this Express handler, and it does not activate or create hosted profile storage.

## Confirmed issues in repository source
- Profile GET and POST permitted requests when `req.user.id==='anon'`, bypassing normal ownership checks.
- Profile POST accepted client-controlled `role` and included it in the database upsert.
- When the Supabase Admin connection was missing, profile POST returned `success:true` from ephemeral process memory and GET returned that same memory. This was not a durable save.
- Firebase decoded claims were spread after the verified `decoded.uid` mapping, allowing a custom `id` field to overwrite the canonical identity.

## Scoped fix
Verify non-anonymous, matching account owner for GET and POST; no arbitrary 'anon' exception. Whitelist only non-privileged profile fields. When server persistence isn't configured, return 503 instead of inventing a saved profile. Derive canonical identity from `decoded.uid` after spreading claims. All behavior is tested without secrets or external requests.

This is a necessary defense-in-depth source fix but not sufficient for real customers. The Client profile service still needs server-confirmed receipts, real hosted routing and two-user save/read-back tests. Protected production DB backup and the existing rider_notifications function/GRANT exposure remain separate blockers. No order, rider, delivery or payment switch is changed.
