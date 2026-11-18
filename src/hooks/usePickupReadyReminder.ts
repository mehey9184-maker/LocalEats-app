import {useEffect, useRef} from "react";
import {toast} from "sonner";
import type {PickupOrder} from "../pickup/client";
import type {AppNotification} from "../types";
import {pickupReminderDue, schedulePickupReminder, type PickupReminderState} from "../services/pickupReminder";

type History = {userId: string; orders: PickupOrder[] | null; refreshing: boolean; error: boolean};

export function usePickupReadyReminder(
  uid: string | null | undefined,
  history: History | null,
  notifications: AppNotification[],
  openTracking: (orderId: string) => void,
) {
  const memory = useRef(new Map<string, PickupReminderState>());
  const displayed = useRef(new Map<string, string | number>());
  const keyFor = (orderId: string) => `localeats-pickup-reminder:${uid}:${orderId}`;
  const read = (key: string): PickupReminderState => {
    const cached = memory.current.get(key);
    if (cached) return cached;
    try {
      const state = JSON.parse(sessionStorage.getItem(key) ?? "{}");
      return state && typeof state === "object" ? state : {};
    } catch {
      return {};
    }
  };
  const save = (key: string, state: PickupReminderState) => {
    memory.current.set(key, state);
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch { /* Still dedupe in this tab. */ }
  };
  const readyOrders = () => {
    if (!uid || history?.userId !== uid || history.error || history.refreshing) return [];
    return (history.orders ?? []).filter(order =>
      order.user_id === uid && order.delivery_type === "collection" && order.status === "ready_for_pickup"
    );
  };
  const dismiss = (key: string) => {
    const id = displayed.current.get(key);
    if (id !== undefined) toast.dismiss(id);
    displayed.current.delete(key);
  };

  useEffect(() => {
    if (!history || history.refreshing) return;
    const ready = readyOrders();
    const activeKeys = new Set(ready.map(order => keyFor(order.id)));
    for (const key of displayed.current.keys()) {
      if (!activeKeys.has(key)) dismiss(key);
    }
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    const now = Date.now();
    for (const order of ready) {
      const key = keyFor(order.id);
      const times = notifications
        .filter(event => event.type === "order" && event.orderId === order.id && Number.isFinite(event.timestamp))
        .map(event => event.timestamp);
      const readyAt = times.length ? Math.max(...times) : undefined;
      if (!pickupReminderDue(read(key), readyAt, now)) continue;
      save(key, {automaticShown: true});
      displayed.current.set(key, toast.info("Your pickup is still ready", {
        description: "Check your order for pickup details.",
        action: {label: "Track pickup", onClick: () => openTracking(order.id)},
        onDismiss: () => displayed.current.delete(key),
        onAutoClose: () => displayed.current.delete(key),
      }));
    }
  }, [uid, history, notifications, openTracking]);

  useEffect(() => () => {
    for (const id of displayed.current.values()) toast.dismiss(id);
    displayed.current.clear();
    memory.current.clear();
  }, [uid]);

  return (orderId: string, action: "acknowledge" | "snooze") => {
    if (!readyOrders().some(order => order.id === orderId)) return;
    const key = keyFor(orderId);
    const state = action === "snooze" ? schedulePickupReminder(Date.now()) : {acknowledged: true};
    save(key, state);
    dismiss(key);
    toast.success(action === "snooze" ? "Reminder set for this open tab in 10 minutes" : "Pickup reminder dismissed");
  };
}
