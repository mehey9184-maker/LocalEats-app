import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OrderApiError,
  QuoteOrderRequestData,
  createOrderRequestFromQuote,
  fingerprintOrderIntent,
  freezeOrderIntent,
  requestAuthoritativeOrderQuote,
  retainQuoteConsentForIntent,
} from "./orderQuoteConsent";

const request = (overrides: Partial<QuoteOrderRequestData> = {}): QuoteOrderRequestData => ({
  idempotency_key: "same-attempt-key",
  shop_id: "18",
  items: [{ menu_item_id: "item-1", quantity: 2, notes: "mild" }],
  delivery_type: "delivery",
  delivery_schedule_mode: "standard",
  delivery_coordinates: { lat: 0, lng: 0 },
  tip_amount: 0,
  payment_method: "cash_on_arrival",
  customer_details: {
    name: "Customer",
    phone: "0712345678",
    email: "customer@example.com",
    address: "1 Main Road",
    city: "Cape Town",
    delivery_instructions: "Gate 2",
  },
  ...overrides,
});

const validQuote = {
  subtotal: 100,
  delivery_fee: 10,
  service_fee: 2.5,
  discount_amount: 0,
  tip_amount: 0,
  total_price: 112.5,
  delivery_type: "delivery" as const,
  payment_method: "cash_on_arrival" as const,
};

test("quote client posts the exact intent with auth and no price consent", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchMock: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ success: true, quote: validQuote }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const quote = await requestAuthoritativeOrderQuote(
    request(),
    "https://api.example.com/",
    { Authorization: "Bearer firebase-token" },
    fetchMock,
  );

  assert.equal(capturedUrl, "https://api.example.com/api/v1/orders/quote");
  assert.equal(capturedInit?.method, "POST");
  assert.equal((capturedInit?.headers as Record<string, string>).Authorization, "Bearer firebase-token");
  const body = JSON.parse(String(capturedInit?.body));
  assert.equal(Object.hasOwn(body, "accepted_total_price"), false);
  assert.deepEqual(body.delivery_coordinates, { lat: 0, lng: 0 });
  assert.deepEqual(quote, validQuote);
});

test("quote validation fails closed", async (t) => {
  await t.test("non-JSON response", async () => {
    await assert.rejects(
      requestAuthoritativeOrderQuote(request(), "https://api.example.com", {}, async () =>
        new Response("gateway", { status: 502, headers: { "content-type": "text/html" } })),
      OrderApiError,
    );
  });

  await t.test("non-success response preserves API code", async () => {
    await assert.rejects(
      requestAuthoritativeOrderQuote(request(), "https://api.example.com", {}, async () =>
        new Response(JSON.stringify({ success: false, code: "PRICE_CHANGED", error: "changed" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        })),
      (error: unknown) => error instanceof OrderApiError && error.code === "PRICE_CHANGED" && error.status === 409,
    );
  });

  await t.test("string money is rejected", async () => {
    await assert.rejects(
      requestAuthoritativeOrderQuote(request(), "https://api.example.com", {}, async () =>
        new Response(JSON.stringify({ success: true, quote: { ...validQuote, total_price: "112.50" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })),
      OrderApiError,
    );
  });

  await t.test("contradictory delivery mode is rejected", async () => {
    await assert.rejects(
      requestAuthoritativeOrderQuote(request(), "https://api.example.com", {}, async () =>
        new Response(JSON.stringify({ success: true, quote: { ...validQuote, delivery_type: "collection" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })),
      OrderApiError,
    );
  });
});

test("frozen quoted intent controls consent and detects every serialized change", () => {
  const original = request();
  const frozen = freezeOrderIntent(original);
  assert.equal(Object.isFrozen(frozen), true);
  assert.equal(Object.isFrozen(frozen.items), true);
  assert.equal(Object.isFrozen(frozen.customer_details), true);
  const fingerprint = fingerprintOrderIntent(frozen);
  const reordered = {
    ...original,
    customer_details: {
      city: original.customer_details.city,
      address: original.customer_details.address,
      email: original.customer_details.email,
      name: original.customer_details.name,
      phone: original.customer_details.phone,
      delivery_instructions: original.customer_details.delivery_instructions,
    },
  };
  assert.equal(fingerprintOrderIntent(reordered), fingerprint);
  assert.equal(fingerprintOrderIntent(request({ items: [{ menu_item_id: "item-1", quantity: 3 }] })) === fingerprint, false);
  assert.equal(fingerprintOrderIntent(request({ delivery_coordinates: { lat: 0, lng: 1 } })) === fingerprint, false);

  const createRequest = createOrderRequestFromQuote(frozen, validQuote);
  assert.equal(createRequest.accepted_total_price, validQuote.total_price);
  assert.equal(createRequest.idempotency_key, original.idempotency_key);
  assert.deepEqual(createRequest.delivery_coordinates, { lat: 0, lng: 0 });
});

test("quote consent invalidation is permanent across A to B to A", () => {
  const intentA = request();
  const intentB = request({ items: [{ menu_item_id: "item-1", quantity: 3 }] });
  const fingerprintA = fingerprintOrderIntent(intentA);
  const fingerprintB = fingerprintOrderIntent(intentB);
  const idempotencyKey = intentA.idempotency_key;
  const quoteA = { fingerprint: fingerprintA, idempotencyKey };

  let storedConsent = retainQuoteConsentForIntent(quoteA, fingerprintA);
  assert.equal(storedConsent, quoteA);

  storedConsent = retainQuoteConsentForIntent(storedConsent, fingerprintB);
  assert.equal(storedConsent, null);

  storedConsent = retainQuoteConsentForIntent(storedConsent, fingerprintA);
  assert.equal(storedConsent, null);

  const freshQuoteA = { fingerprint: fingerprintA, idempotencyKey };
  storedConsent = retainQuoteConsentForIntent(freshQuoteA, fingerprintA);
  assert.equal(storedConsent, freshQuoteA);
  assert.equal(storedConsent.idempotencyKey, idempotencyKey);
});

test("checkout source keeps quote review side-effect free and resets the key only after create success", () => {
  const checkoutSource = readFileSync(
    new URL("../screens/CheckoutScreen.tsx", import.meta.url),
    "utf8",
  );
  const quoteStart = checkoutSource.indexOf('if (action === "quote")');
  const quoteEnd = checkoutSource.indexOf("const reviewedCheckout", quoteStart);
  const quoteBranch = checkoutSource.slice(quoteStart, quoteEnd);
  assert.ok(quoteStart >= 0 && quoteEnd > quoteStart);
  assert.doesNotMatch(quoteBranch, /createAuthoritativeOrder|cached_orders|onConfirm\(|upsertProfileWithRPC|registerAndSyncPushToken/);

  const createCall = checkoutSource.indexOf("createAuthoritativeOrder(requestPayload)");
  const keyReset = checkoutSource.indexOf("checkoutIdempotencyKeyRef.current = null");
  assert.ok(createCall >= 0 && keyReset > createCall);
  assert.equal(checkoutSource.match(/checkoutIdempotencyKeyRef\.current = null/g)?.length, 1);

  const priceChanged = checkoutSource.indexOf('err.code === "PRICE_CHANGED"');
  const consentInvalidation = checkoutSource.indexOf("setQuotedCheckout(null)", priceChanged);
  assert.ok(priceChanged >= 0 && consentInvalidation > priceChanged);

  assert.match(
    checkoutSource,
    /if \(quotedCheckout && !currentQuotedCheckout\) \{\s*setQuotedCheckout\(null\);/,
  );
  const freshQuoteBranch = checkoutSource.slice(quoteStart, quoteEnd);
  const discardBeforeQuote = freshQuoteBranch.indexOf("setQuotedCheckout(null)");
  const quoteRequest = freshQuoteBranch.indexOf("quoteAuthoritativeOrder(currentRequest)");
  assert.ok(discardBeforeQuote >= 0 && quoteRequest >= 0);
  assert.ok(
    discardBeforeQuote < quoteRequest,
  );
});
