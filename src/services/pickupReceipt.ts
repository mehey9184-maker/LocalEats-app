import type { PickupOrder, PickupOrderDetail } from "../pickup/client";

export type PickupReceipt = {
  orderNumber: string;
  collectedAt: string | null;
  payment: { amount: number; method: "cash" | "card_machine" } | null;
};

const eventTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function pickupReceipt(
  { order, events }: PickupOrderDetail,
  expected: Pick<PickupOrder, "id" | "user_id" | "shop_id" | "revision">,
): PickupReceipt | null {
  if (!order || order.id !== expected.id || order.user_id !== expected.user_id ||
      order.shop_id !== expected.shop_id || order.revision !== expected.revision ||
      order.delivery_type !== "collection" || order.status !== "collected") {
    throw new Error("Pickup receipt does not match the selected order.");
  }

  if (!Array.isArray(events) || !Number.isSafeInteger(order.revision) || order.revision < 1) return null;
  const collection = events.find(event => event?.kind === "collected" && event.revision === order.revision);
  if (!collection) return null;
  const collectedAt = typeof collection.occurred_at === "string" && eventTimestamp.test(collection.occurred_at) &&
    Number.isFinite(Date.parse(collection.occurred_at))
    ? collection.occurred_at : null;

  const confirmed = events.find(event => event?.kind === "payment_confirmed" && event.revision === collection.revision - 1);
  const { amount, method, currency } = confirmed?.details ?? {};
  let payment: PickupReceipt["payment"] = null;
  if (order.payment_status === "paid" && currency === "ZAR" && method === order.payment_method &&
      (method === "cash" || method === "card_machine") && typeof amount === "number" && amount >= 0) {
    const cents = Math.round(amount * 100);
    if (Number.isSafeInteger(cents) && amount === cents / 100) payment = { amount, method };
  }
  return { orderNumber: order.id.slice(0, 8), collectedAt, payment };
}
