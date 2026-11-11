import type { PickupOrder } from "../pickup/client";

/** Only an authenticated, server-read, collected pickup containing a kota
 * can start the post-purchase review and installation journey. */
export function isVerifiedCollectedKota(order: PickupOrder, uid: string): boolean {
  return Boolean(uid && order &&
    order.user_id === uid &&
    order.delivery_type === "collection" &&
    order.status === "collected" &&
    typeof order.id === "string" && order.id.length > 0 &&
    typeof order.shop_id === "string" && order.shop_id.length > 0 &&
    Array.isArray(order.items) &&
    order.items.some(item => Number.isInteger(item.quantity) && item.quantity > 0 &&
      typeof item.name === "string" && /(^|[^a-z])kota([^a-z]|$)/i.test(item.name)));
}

const completedKey = (uid: string) => "localeats_kota_review_completed_v1:" + uid;
export function reviewedKotaOrderIds(uid: string): Set<string> {
  if (!uid) return new Set();
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(completedKey(uid)) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(-100) : []);
  } catch { return new Set(); }
}
/** Called ONLY after the review request has actually succeeded. */
export function rememberReviewedKota(uid: string, orderId: string): void {
  if (!uid || !orderId) return;
  try {
    const ids = Array.from(reviewedKotaOrderIds(uid));
    if (!ids.includes(orderId)) ids.push(orderId);
    window.localStorage.setItem(completedKey(uid), JSON.stringify(ids.slice(-100)));
  } catch { /* Storage denied: the review still succeeds; never invent a write. */ }
}
export function nextUnreviewedKota(
  orders: PickupOrder[] | null,
  uid: string,
  readVerified: boolean,
  reviewed: ReadonlySet<string>,
): PickupOrder | null {
  if (!readVerified || !uid || !Array.isArray(orders)) return null;
  return orders.find(order => isVerifiedCollectedKota(order, uid) && !reviewed.has(order.id)) ?? null;
}
