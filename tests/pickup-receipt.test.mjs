import test from 'node:test';
import assert from 'node:assert/strict';
import { createPickupApi } from '../src/pickup/client.ts';
import { pickupReceipt } from '../src/services/pickupReceipt.ts';

const history = {
  id: '56b23615-d590-4fc8-a6f7-6025879c7b15', user_id: 'customer-a', shop_id: 'shop-a',
  status: 'collected', delivery_type: 'collection', delivery_status: 'none',
  payment_status: 'paid', payment_method: 'cash', revision: 4,
  total_price: 30, items: [], created_at: '2026-11-18T13:00:00Z',
  customer_name: 'Test Customer', phone: '0700000000',
};
const order = { ...history, payment_method: 'card_machine' };
const collection = {
  id: 'collection-event', revision: 4, kind: 'collected', occurred_at: '2026-11-18T13:30:00Z', details: {},
};
const payment = {
  id: 'payment-event', revision: 3, kind: 'payment_confirmed', occurred_at: '2026-11-18T13:29:00Z',
  details: { amount: 28.5, currency: 'ZAR', method: 'card_machine' },
};

test('the customer receipt reads actual payment facts through the authenticated order detail endpoint', async () => {
  const controller = new AbortController();
  const api = createPickupApi('https://orders.example.test', async () => 'test-id-token', async (url, init) => {
    assert.equal(url, 'https://orders.example.test/api/v1/orders/' + order.id);
    assert.equal(init.method, 'GET');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Authorization, 'Bearer fb-test-id-token');
    assert.equal(init.signal, controller.signal);
    return Response.json({ success: true, order, events: [payment, collection] });
  });
  assert.deepEqual(pickupReceipt(await api.order(order.id, controller.signal), history), {
    orderNumber: '56b23615', collectedAt: collection.occurred_at, payment: { amount: 28.5, method: 'card_machine' },
  });
});

test('cash payment can be confirmed without inventing a missing collection timestamp', () => {
  for (const occurred_at of [null, '1', '2026-11-18']) {
    const events = [
      { ...payment, details: { amount: 28.5, currency: 'ZAR', method: 'cash' } },
      { ...collection, occurred_at },
    ];
    assert.deepEqual(pickupReceipt({ order: history, events }, history), {
      orderNumber: '56b23615', collectedAt: null, payment: { amount: 28.5, method: 'cash' },
    });
  }
});

test('old or partial rows never present the order total or checkout method as confirmed payment', () => {
  for (const events of [undefined, [], [payment], [{ ...collection, revision: 3 }, payment]]) {
    assert.equal(pickupReceipt({ order, events }, history), null);
  }
  for (const event of [
    { ...payment, revision: 4 },
    { ...payment, details: { ...payment.details, amount: null } },
    { ...payment, details: { ...payment.details, amount: '28.50' } },
    { ...payment, details: { ...payment.details, amount: 28.505 } },
    { ...payment, details: { ...payment.details, currency: 'USD' } },
    { ...payment, details: { ...payment.details, method: 'online' } },
    { ...payment, details: { ...payment.details, method: 'cash' } },
  ]) {
    assert.deepEqual(pickupReceipt({ order, events: [event, collection] }, history), {
      orderNumber: '56b23615', collectedAt: collection.occurred_at, payment: null,
    });
  }
  assert.equal(pickupReceipt({
    order: { ...order, payment_status: 'unpaid' }, events: [payment, collection],
  }, history).payment, null);
});

test('detail for another account, order, shop, fulfillment type, revision or state is rejected', () => {
  for (const replacement of [
    { user_id: 'customer-b' }, { id: 'another-order' }, { shop_id: 'another-shop' },
    { status: 'ready_for_pickup' }, { delivery_type: 'delivery' }, { revision: 3 },
  ]) {
    assert.throws(() => pickupReceipt({ order: { ...order, ...replacement }, events: [payment, collection] }, history));
  }
});
