import type { Order } from "../types";

// Prefer the server's persisted delivery_type. Legacy order_type/is_delivery are
// compatibility hints only when that authoritative field is absent.
export function isCollectionTrackingOrder(order: Pick<Order, "delivery_type" | "order_type" | "is_delivery"> | null | undefined): boolean {
  if (!order) return false;
  if (order.delivery_type === "collection") return true;
  if (order.delivery_type === "delivery") return false;
  if (order.order_type === "collection") return true;
  if (order.order_type === "delivery") return false;
  return order.is_delivery === false;
}

export function collectionTrackingStep(status: string): number {
  switch (status.toLowerCase()) {
    case "preparing":
    case "confirmed":
    case "accepted":
      return 1;
    case "ready":
    case "ready_for_pickup":
      return 2;
    case "completed":
    case "collected":
      return 3;
    default:
      return 0;
  }
}
