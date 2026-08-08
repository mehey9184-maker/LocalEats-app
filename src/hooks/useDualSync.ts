/**
 * React Hooks for Dual Sync (WebSocket + Polling)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { DualSyncEngine, dualSyncEngine, SyncSource } from "../utils/dualSync";
import { Order } from "../types";

export interface DualSyncState<T> {
  data: T;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncSource: SyncSource | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Custom hook to synchronize user or merchant orders with real-time WebSockets and adaptive polling.
 */
export function useDualSyncOrders(
  userId?: string | null,
  shopId?: string | number | null,
  hasActiveOrders = false
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncSource, setSyncSource] = useState<SyncSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;

  const fetchOrders = useCallback(async (): Promise<Order[]> => {
    if (!userId && !shopId) return [];

    let query = supabase.from("orders").select("*");
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error: fetchErr } = await query.order("created_at", { ascending: false });
    if (fetchErr) throw fetchErr;
    return (data as Order[]) || [];
  }, [userId, shopId]);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders((prev) => DualSyncEngine.reconcileEntities(prev, data));
      setLastSyncTime(Date.now());
      setSyncSource("manual");
    } catch (err: any) {
      setError(err?.message || "Failed to refresh orders");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (!userId && !shopId) return;

    const channelName = userId
      ? `dual_sync_user_orders_${userId}`
      : `dual_sync_shop_orders_${shopId}`;
    const filter = userId
      ? `user_id=eq.${userId}`
      : `shop_id=eq.${shopId}`;

    const cleanup = dualSyncEngine.registerChannel(
      channelName,
      "orders",
      filter,
      ({ source, data, rawPayload }) => {
        setLastSyncTime(Date.now());
        setSyncSource(source);

        if (source === "websocket" && rawPayload) {
          const eventType = rawPayload.eventType;
          const updatedItem = rawPayload.new as Order;
          const deletedItem = rawPayload.old as Order;

          setOrders((prev) => {
            if (eventType === "DELETE") {
              return prev.filter((o) => o.id !== deletedItem.id);
            }
            if (eventType === "INSERT") {
              if (prev.some((o) => o.id === updatedItem.id)) {
                return DualSyncEngine.reconcileEntities(prev, [updatedItem]);
              }
              return [updatedItem, ...prev];
            }
            if (eventType === "UPDATE") {
              return DualSyncEngine.reconcileEntities(prev, [updatedItem]);
            }
            return prev;
          });
        } else if (Array.isArray(data)) {
          setOrders((prev) => DualSyncEngine.reconcileEntities(prev, data));
        }
      },
      fetchOrders,
      hasActiveOrders
    );

    // Listen to force reconcile events (e.g. app foreground / network recovery)
    const handleForceReconcile = () => {
      refresh();
    };
    window.addEventListener("localeats_force_reconcile", handleForceReconcile);

    return () => {
      cleanup();
      window.removeEventListener("localeats_force_reconcile", handleForceReconcile);
    };
  }, [userId, shopId, fetchOrders, hasActiveOrders, refresh]);

  return {
    orders,
    setOrders,
    isSyncing,
    lastSyncTime,
    syncSource,
    error,
    refresh,
  };
}
