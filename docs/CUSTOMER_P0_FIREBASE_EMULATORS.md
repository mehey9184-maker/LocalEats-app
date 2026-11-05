# Customer P0 — Local Firebase emulator-only verification (2026-11-05)

**No real Firebase resources and no real orders.** Use the demo project only: demo-localeats-p0. The tests run on local loopback Authentication port 9099 and Firestore port 8080.

## Run on your PC (Node 22+ and Java 21+)

From the Client P0 repair branch:

```sh
npm ci
npx --yes firebase-tools@15.34.2 emulators:exec --project demo-localeats-p0 --only auth,firestore "npm run test:p0-auth-emulator && npm run test:p0-firestore-rules-gate"
```

The Auth test uses the actual local Authentication emulator to issue two fake account tokens, which the Firebase Admin SDK verifies. It then exercises a deliberately **in-memory simulated profile store**, not the real Vercel profile API or Supabase. Tests cover owner-only saves, own reads, cross-account denial, and client role-field stripping. Passing these does not establish hosted end-to-end persistence.

The Firestore release gate loads this repository's actual checked-in firestore.rules into the local emulator. It tries unauthorized private-profile and order reads/writes. It is **expected to fail** while source rules permit public access. Do not weaken or skip this test. Deployed Firebase rules have not been inspected and are not affected by these tests.

GitHub Actions runs a separate emulator security job. The pre-existing Production profile API contract gate also remains blocking. No Firebase deploy command, cloud credentials, Production data, real order, profile record, or billing action is required.

Hosted staging validation with an independently configured Firebase testing project and the existing isolated Supabase profile staging database is still a separate release gate; local tests cannot replace it.
