# Customer unanswered-pickup recovery

Separate draft layered on Customer PR #115. No Production, ordering flag, database, payment, installation/icon or real Firebase notification change is activated.

The existing tracking screen reads optional server acceptance deadlines. Before acceptance it shows remaining minutes; an elapsed device clock only requests a server refresh. It does not claim cancellation or offer a second-order recovery action. A persisted expired cancellation offers Find another shop and View order details, and an unpaid expired request says No payment due. Preparing updates still need no acknowledgement.

Acceptance foreground push is a refresh hint, not order truth. Background clicks focus only the same origin; an existing signed-in window opens pickup tracking and fetches the account's verified order feed. Payload URLs and order statuses are never trusted.

Passed locally: 160 root tests; TypeScript; build; actual tracking screen at 320, 390 and 1280px using synthetic data with external requests blocked. Browser checks verify uncertain deadlines, absence of second-order action before confirmation, persisted expiry, real pointer clicks, account-feed clearing and no horizontal overflow. Screenshot customer-expired-390.png contains only a synthetic fixture.

Commands: node --experimental-strip-types --test tests/*.test.mjs; npm run lint; npm run build; node tests/pickup-acceptance-browser.mjs. Browser test uses local Chrome (CI uses Playwright Chromium).

Requires the separately reviewed Merchant/API acceptance draft, unapplied review SQL and approved recurring worker. No hosted schema/scheduler was changed and no cloud message was sent. Real staging foreground/background/Windows delivery and lost-device recovery remain unverified. Existing API write gates stay off. All release/Production/merge decisions require separate owner approval.
