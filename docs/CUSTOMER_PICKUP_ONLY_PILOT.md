# LocalEats — Pickup-only first customer pilot

**Decision (2026-11-05):** First clients order for **collection at the shop only**. Customer pays **cash or on the shop's physical card machine**, according to the server-authorized pickup order. No rider, bicycle courier, delivery, GPS tracking of riders, dispatch fees or cash-on-delivery in pilot.

## Expected customer and merchant journey

1. Customer chooses one eligible shop within existing 4 km nearby discovery rule. The existing ShopCard, menu and layout remain unchanged; shop data must be real, never placeholder.
2. Customer adds available items, sees the real menu prices, and chooses **Counter Pickup**. The pickup fee is **R0**; any platform service fee must be explicitly shown and confirmed by the authoritative quote.
3. Customer enters name and callable contact number, and chooses **pay cash at shop** or **pay at the shop's card machine**. No online payment is collected.
4. Customer reviews the server-calculated total and explicitly submits once after the separate real-order launch gate is approved. Repeated taps use the **same idempotency key**. Only a persisted server confirmation counts as an order.
5. Merchant sees the order in the authoritative inbox even if FCM is delayed; confirms acceptance, prepares, marks **ready for collection**. A real notification helps but cannot replace the inbox.
6. Customer sees the authentic order status and collects at counter; merchant confirms actual handover/payment through the server-authorized method with no fabricated **paid** status. Refunds and cancellations need a tested policy.
7. Rider App, LocalRider pool, delivery fee algorithms, rider pairing, delivery tracking, rider payouts and delivery PINs are **Phase 2**; no activation implied.

## Scope of this client PR

- The CheckoutScreen continues to preselect collection. The already-blocked **Bicycle Courier** choice is no longer presented as a selectable paid option. The original Counter Pickup card stays, spanning the available width.
- Remove misleading **100% Free** (the meal and service fee still cost money), and replace pickup-specific labels with **R0 Pickup Fee** and **Collect at the shop**.
- CartDrawer defaults to `collection` when no fulfillment prop is supplied; previously it assumed `delivery` and displayed a misleading R15 estimate for a new cart. The existing component API remains intact for a later explicitly approved delivery phase.
- No changes to Customer discovery, My-Kota ShopCard, real menu/cart, animation, order history, or UI theme. Dormant delivery feature code stays in place for Phase 2 instead of risky wholesale deletion.
- Server pickup intent already asserts `delivery_type=collection`; order write flags remain disabled in Production and Preview. This PR does not create orders or activate payments.

## Non-negotiable launch gates

- Controlled PostgreSQL/Supabase backup with encrypted off-site storage and independently verified restore; no live credentials in GitHub.
- Fix the verified public `rider_notifications` privileges from Merchant PR #57 before accepting actual user data. Verify all other public privileged functions and user-role authority.
- Final Client + Merchant pickup-only connected Preview with authenticated manual test of shop browse, cart, server quote, read-only simulation, and clean original UX.
- Separate authorized **disposable staging** test where real API endpoints persist synthetic pickup orders. Prove merchant receipt, duplicate click/retry, 30-minute offline recovery, accept → preparing → ready → collection, cash/card-terminal confirmation, errors and refunds. **No Production order creation** until owner approval.
- Real backup monitoring, order inbox reconcile without relying on push, merchant operation procedures and customer-support path, privacy/POPIA review, compliant commercial hosting, and separate owner launch approval.

### Deferred entirely until Phase 2
Delivery checkout, rider claiming/dispatch, rider chat, rider earnings, 4-digit delivery PIN, rider GPS, delivery costs and rider insurance. Future options must be designed and approved after pickup achieves a reliable, supportable pilot.

**Current state:** Pickup ordering and real payments disabled; this is a **Client Preview UI clarity PR**, not launch activation. Do not merge or activate ordering based on UI tests alone.
