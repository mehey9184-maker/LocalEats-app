# LocalEats — Optional customer home pin for pickup

**Prepared 2026-11-06.** Real LocalEats orders are collection at the shop, not home delivery.

The Customer Complete Profile form still blocked saving unless users provided a full street address, city, and exact map pin, with text instructing a rider to use the coordinates. This is unnecessary personal information for pickup and prevented legitimate customers from completing their details.

This narrow UI-correctness patch requires **name and a valid South African phone number** but makes street address and precise coordinates optional. It keeps the existing city selector and map search if a customer wants them, without altering the original layout, automatic device-nearby shop list, Cart, Checkout, or backend permissions.

**Important:** this only removes an unnecessary **client-side** validation requirement. The actual profile API still needs positive two-account hosted save/read-back, correct role checks, and verified security; see draft Client PRs #61 and #63. Do not claim reliable profile saving or activate orders just because the form can submit without a pin.

Safe-merge gate: dedicated profile validation assertions, original Customer pickup/nearby regression, TS and full build, all independent CI. No production data writes, no order activation, no rider work; live flags stay disabled.
