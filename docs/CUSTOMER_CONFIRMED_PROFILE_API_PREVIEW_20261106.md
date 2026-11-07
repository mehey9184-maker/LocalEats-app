# Customer profile integration preview — confirmed backend receipts

**Status: draft Preview only, 2026-11-06. Do NOT merge until real hosted account acceptance.**

## Current defect
The original Customer profile used a legacy `/api/profiles` URL, a Firestore fallback/mirror and a local offline queue which could report success even without durable Supabase confirmation. The active Client Vercel project rewrites unknown paths to `index.html`; its old separate Express handler is not the active standalone API service.

The active Merchant/API now has read-only `GET /api/v1/profiles/me` and explicitly disabled `POST /api/v1/profiles/me` (merged API PR #70). Identity is server-verified and user role is not accepted from the Client.

## This Client Preview branch
1. Adds a pure `confirmedCustomerProfile` transport that requires the **matching Firebase registered identity** before and after every request, uses a separately configured HTTPS API origin and only `Bearer fb-` token, and rejects mismatched account replies, HTML, unconfirmed status, missing fields and client-supplied role/user IDs.
2. Adds two separate **default OFF** frontend switches: `VITE_PROFILE_BACKEND_ENABLED` for authoritative read, `VITE_PROFILE_WRITES_ENABLED` for save. Old behavior remains until a controlled pilot enables the new backend. API-side `PROFILE_WRITES_ENABLED` remains OFF even if the Client flag is mistakenly enabled.
3. When the backend-read flag is enabled, profile loading uses the **authenticated GET** and never falls back to a potentially cross-account Firestore cached profile. Editor saves use only the new confirmed API; no optimistic profile state or false success tick after a failed response. Name and address remain optional beyond existing basic pickup validation; original UI unchanged.
4. Profile photo upload is separate from *profile save*. The screen only says the photo is **saved** after the server confirms it; otherwise it shows failure. Delete-photo awaits server confirmation too.
5. Server-derived `customer` role maps to the existing UI `user` role. Admin/merchant role cannot come from a caller-supplied patch.

## Required release gates
- This is **not** positive hosted integration testing. CI uses two fictional account identities and fake HTTP responses; backend tests use synthetic repositories, not live Firebase tokens.
- Provision a separately isolated API Preview with only the **LocalEats-Profile-Staging** Supabase project and explicit owner-approved *staging-only* profile writes. Do not reuse Production credentials with a write-enabled Preview; the current shared-DB API Preview intentionally blocks all POST requests.
- Authorize and carry out a **real hosted A/B test** with two actual Firebase accounts against that isolated staging API: A saves/reads, B cannot read/write A, account switch cancels stale saves, sign-out hides old profile, phone/photo/address persist across browser refresh and app restart.
- Run original ShopCard/cart/pickup regression, Android/mobile acceptance, and check that the user role never changes through metadata. Fix Production `handle_new_user()` role trust after encrypted backup and explicit cutover approval; see security PR #71.
- Turn on backend+Client profile flags only after staging acceptance, owner sign-off, and actual API Production deployment of the exact merged verified backend source. Client and API pickup ordering remain OFF. No delivery/riders for six months of real pickup usage.

**Do not merge this branch or activate profile saves based on synthetic tests alone.**
