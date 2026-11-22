# LocalEats Group — Scalable Idea & Decision Register

**Owner:** LocalEats founder | **Started:** 22 November 2026
**Status:** Working ideas, **not** permission to implement, spend money, collect customer data, or deploy anything.
**Canonical home:** This file in the Customer repository. Merchant/API/Rider projects link to it; avoid parallel, conflicting registers.

## Why this exists
Our goal is a dependable, affordable company that can grow from a small South African pilot into other parts of Africa, then beyond. Every attractive idea competes for scarce development time, customers' phone data, merchants' attention and the company's money. We will **capture first, test assumptions cheaply, then approve or reject**. Ideas in this file do not override the existing pickup-only release or safety requirements.

## How decisions are made
A proposed feature moves through `Captured → Research → Cheap experiment → Approved for development → Preview verified → Owner-approved release` or `Deferred/Rejected`. "Approved" must record who approved it, when, which project, a cost ceiling and acceptance criteria. No AI or PR test automatically changes that status.

Before approval, answer: **Who needs it? What problem does it solve? What is the cheapest proof? How does it scale? What can go wrong? What data does it collect? How much does each use cost? Does it introduce a legal or payment obligation? What measurable result permits continuation?** Prefer new value over novelty; preserve existing designs unless a real usability defect justifies change.

### Operating rules
- **Today:** LocalEats Customer + Merchant, genuine GPS, pickup-first, pay at shop; 4 km for ordering; out-of-range shops may be browsed without checkout. No fake ratings, prices, payment states, open hours, delivery times or customer success claims.
- **No expansion from a draft:** Delivery/Rider, wallet value, insurance, financial credit, subscriptions and marketing automation require their own approvals and security/legal reviews.
- **Low-data and low-cost:** Target inexpensive Android phones, slow connections and a low-cost tech stack; benchmark before adding animation, images, telemetry or paid infrastructure.
- **Server authority:** Authentic shop/menu/prices, accounts, order revisions, fulfillment, payment and access rights must be verified by the correct API. No client-side cache creates a paid or completed order.
- **Merchant dignity:** Simple controls, reliable status, honest fees; avoid deceptive urgency, dark patterns, misleading numbers or intrusive notifications.
- **Privacy:** Default to minimal retention and no resale of conversation/customer data. Private images and location cannot be reused across other users.
- **Owner release gate:** Separate owner approval before merging, deployment, production data writes, new paid services or business operations.

## Opportunity backlog

| ID | Venture / product | Idea and real user benefit | Stage (22 Nov 2026) | Lowest-cost next proof | Main risks / approval gates |
|---|---|---|---|---|---|
| LE-01 | LocalEats Customer | Fast truthful pickup discovery, genuine GPS and browse-only cards beyond 4 km | Current launch priority; real-device gate open | One consenting customer's real GPS browse and a merchant-verified pickup acceptance | 4 km mistakes, availability truth, CORS, authentication, no fake location or live order activation |
| LE-02 | LocalEats Customer + Merchant | Reusable photos: merchant uploads once through an authorized API → central object storage → appropriately sized CDN versions; cache by stable **versioned** URL and use ETag/Cache-Control revalidation rather than redownloading on every reconnection | **Captured; DO NOT IMPLEMENT NOW** | Design paper spec: public vs private images, file sizes, CDN/R2 costs and opt-in Data Saver, then measure bytes on 2 real phones | Signed URLs/ownership for private images, cross-account leaks, invalidation, image abuse, provider costs, storage limits and stale photos |
| LE-03 | LocalEats Customer | Data Saver with on-demand photos and honest names-only offline discovery | Draft P2 PR #135; not released | Verify network bytes, storage quota, phone offline/reconnect and manual UI | Stale shop claims, excess storage, privacy, unexpected background requests |
| LE-04 | LocalEats Customer | Smooth low-battery, reduced-motion, accessible interaction; clear cost and outcome feedback | Draft P3 PR #136; not released | Real-device 320/390px interaction and focus review | Jank, motion sickness, accessibility, misleading confirmations |
| LE-05 | LocalEats Merchant | Pickup acceptance, reliable Ready/paid/handover actions and push notifications with proof of delivery separately from server acceptance | Critical launch reliability; staged acceptance still required | One real consenting merchant/customer pickup when authorized | Duplicate orders, fake payment claims, late notifications, shop ownership leaks |
| LE-06 | LocalEats Merchant | Three-month promotional access, then optional merchant plans (historical discussion: Plus R199, Pro R399, Premium R499) | **Proposed, not charged or activated** | Interview 5 merchants about valuable differentiators and willingness to pay | Unclear service obligations, premature billing, fairness, refunds, merchant churn |
| LE-07 | LocalEats | Reward missions for kota purchases; Bronze after 4, Silver/Gold later, possible LocalPay credit | Proposed pilot, **not funded/activated** | Spreadsheet unit economics including fraud and real redemption reconciliation | Food funding, reward fraud, shop reimbursement, accounting, tax/consumer law, sustainable cash runway |
| LE-08 | LocalEats Merchant | Honest low-cost marketing: owner-controlled shop link, printable QR/poster, local visibility | Existing draft/previews; adoption to verify | Test a printed QR with consenting shop owners and real phones | Misleading promotions, broken links, unreadable scans, unwanted outreach |
| LG-01 | LocalMarket | Separate local second-hand marketplace brand | Future venture; exploratory | Interview 10 prospective buyers/sellers before writing code | Fraud, disputes, safety and moderation, delivery, payment disputes |
| LG-02 | LocalRider | Walking/bicycle rider pool and eventual delivery, merchant approval | Deferred, not current pickup launch | Conduct future operating model, route safety and cost experiment after pickup proves reliable | Worker safety, insurance, worker classification, failed delivery, legal compliance |
| LG-03 | LocalPay | Voucher/credit concept that might eventually become a separate business | Long-term, **not a wallet yet** | Legal/regulatory and accounting feasibility note before accepting/storing monetary value | Financial-service regulations, stored-value liability, fraud, KYC/AML, reconciliation, customer balances |
| LG-04 | LocalCover | Potential future insurance-related offering | Long-term research only | Regulatory/partner feasibility memo | Insurance licensing, consumer protection, underwriting, claims handling |
| EX-01 | Separate venture exploration | Supervised secure phone charging lockers for malls, possibly starting with four lockers and voucher-based timed sessions | Concept exploration only; not a LocalEats module | Prototype mechanical/electrical safety and demand/cost test before collecting money | Fire/electrical safety, locker theft, PIN/name privacy, staffing, servicing, landlord permissions; a four-digit PIN alone is not enough authentication |
| LE-09 | LocalEats Customer + Merchant | Optional, low-cost AI help: answer shop/customer FAQs from reviewed LocalEats documentation; a small self-hosted open-weight LLM on an isolated Oracle Always Free Arm VM is an experiment, not a live service. Start with deterministic FAQ/search first, add a model only if it solves measured unanswered questions | **Research / Deferred until pickup launch security and reliability pass** | Benchmark CPU-only Qwen3 0.6B/1.7B on a securely isolated test VM with synthetic FAQ prompts, measure p95 delay, RAM, throughput, hallucination rate and free quota, compare with zero-LLM keyword/FAQ lookup | Oracle 30-day trial vs Always Free terms, instance reclamation, cold starts, CPU/no GPU, accidental spend, abusive requests, privacy/POPIA, fabricated prices/hours, prompt injection, model licensing, moderation, failure recovery; no real orders, finance, account or FCM decisions by AI |
| OPS-01 | LocalEats company | Owner Super Admin to review shop approval, outages, support and verified subscription notices | Planned after launch fundamentals | Define role boundaries and read-only reporting first | Privileged data exposure, unsafe production toggles, access logging, support fraud |
| OPS-02 | LocalEats company | Low-cost observability/feature rollout with honest analytics and privacy-safe diagnostics | Future operations | Track real order success, error rates and data use in aggregate, after consent and privacy review | Excess telemetry costs, customer privacy, inaccurate metrics |
| OPS-03 | LocalEats company | Expansion from first SA neighborhoods → larger South Africa → Africa → global, paced by evidence | Strategic direction, not a calendar commitment | Make each geography pass a repeatable unit-economics and merchant-support checklist | Localization, payments, taxes, legal regimes, connectivity, support capacity |

### LE-09 — Optional self-hosted AI helper on Oracle (candidate only)

**Captured:** 2026-11-22, suggested by founder. Founder priority remains shipping LocalEats pickup-first on Cloudflare + Supabase; this is **NOT approval to provision Oracle or change the apps**.

**Interpretation:** “LLM-free AI” may mean either **a free/open-weight LLM without per-token API fees**, or a genuinely **LLM-free, rule/search-based assistant**. Recommend comparing both. Small Qwen3 0.6B (~523 MB model download) or 1.7B (~1.4 GB) can be evaluated on CPU-only ARM64 using llama.cpp/Ollama. No GPU is included in the Always Free A1 entitlement; speed and concurrency must be measured rather than promised. A rules-based FAQ can cost virtually nothing in inference and is the best first baseline.

**First permitted experiment:** offline synthetic questions about pickup, pay-at-shop, shop closed vs open, orders-ready wording and install help; compare human-reviewed answers from a deterministic FAQ and a small local model. Use only staged sample shop/menu data, never Firebase tokens or customer/chat/order data. If useful, the Client/Merchant requests go via the **LocalEats authenticated API** to a private, rate-limited AI gateway, then to an Oracle CPU VM. The browser must never call exposed Ollama or Supabase directly. Fallback to FAQ when AI is slow/offline, with a clear "AI help" label and escalation to support.

**Strict boundaries:** The model may **explain** verified policy/FAQ but never set a price, mark payments complete, accept/expire/cancel orders, assign a rider, update shop settings, send FCM, invent discounts or claims, or override location rules. Read-only retrieval must return genuine, verified data through the current API with explicit authorization and redaction; don't send private account identifiers to model logs. Limit tokens, output length and requests per account; protect from prompt injection and scraping. Verify commercial rights of the exact model weights and quantization.

**Provider/cost condition:** Oracle Free Trial is US$300 up to 30 days, not 6–9 months. Always Free may last longer with current A1 allowance ~2 OCPU/12 GB RAM aggregate, subject to region capacity and reclaim of idle VMs. Do not provision paid shapes, depend on trial credit for a production feature or exceed free quotas. An LLM's weight download may be free but engineering, availability, bandwidth and storage are not guaranteed free.

**Gate to progress:** After LocalEats pickup release acceptance, establish at least 30 representative synthetic FAQs, compare answer accuracy and latency on ARM CPU, limit to 1 concurrent generation initially, test failover and produce unit cost + support benefit report. Only with specific founder approval create a real VM and deploy API integration. Default status **Research / Deferred**.

## Decision record template (copy for every proposal)

```md
### IDEA-ID — Short name
Date captured:
Proposer / accountable owner:
Product / geography:
Customer or merchant problem (with evidence):
Proposed behavior (not implementation):
Expected gain / success metric:
Lowest-cost experiment and test size:
Estimate: build cost, monthly fixed cost, cost per use:
Risks: security, data, legal, safety, money, support:
Dependencies / API ownership:
Decision status: Captured / Research / Experiment / Approved / Deferred / Rejected
Owner decision, date, spend limit:
Acceptance criteria, rollback trigger:
PR / docs / experiment link:
Result and next decision:
```

## Decision log

| Date | Decision | Authority | Effect |
|---|---|---|---|
| 2026-11-22 | Establish an editable scalable-company idea register instead of turning every idea into an immediate feature. Record photo reuse/CDN as a **future** architecture option, without coding it. | Requested by founder, documented as planning only | No service enabled, spending authorized or production changes |
| 2026-11-22 | Continue focused P4 customer trust / Merchant usability review, preserve original UI and keep PRs as drafts pending testing/owner release gate. | Founder requested P4 continuation | No merge, database operation, real order or live payment |

| 2026-11-22 | Capture optional Oracle-hosted small free/open-weight LLM or zero-LLM FAQ helper as LE-09 research only; continue CF2-D and pickup release first. | Founder proposed concept, not resource/production approval | No Oracle VM, model hosting, customer data access, live AI or charges authorized |

**Updating this register:** Add a short row for each new idea, then a decision record when researched. Update its stage only with evidence and explicit owner approval. Keep the register under Git review so changes can be traced and reverted. Never turn captured ideas into background tasks or automated releases without a specific request.
