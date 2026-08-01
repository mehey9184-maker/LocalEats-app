"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import localforage from "localforage";
import { CartItem } from "../types";

export interface SyncMessage {
  type: "SYNC_SUCCESS" | "SYNC_FAILURE" | "CART_EXPIRED" | "sync-failed";
  message: string;
  timestamp: number;
  details?: any;
}

// Configure localforage for offline_cart_queue
const cartQueueStore = localforage.createInstance({
  name: "localeats",
  storeName: "offline_cart_queue",
  driver: localforage.INDEXEDDB
});

/**
 * Custom React Hook: useOfflineSync
 * ----------------------------------------------------------------------------
 * Subscribes to service worker BroadcastChannel alerts, monitors network
 * connectivity, and secures persistent storage status under low-end environments.
 * Now manages the IndexedDB 'offline_cart_queue' using localForage to automatically
 * synchronize pending cart items with the database upon reconnection.
 */
export function useOfflineSync(cart?: CartItem[], session?: any) {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  const [isStoragePersisted, setIsStoragePersisted] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<SyncMessage | null>(null);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [syncFailedMessage, setSyncFailedMessage] = useState<string | null>(null);
  const [syncAttemptCount, setSyncAttemptCount] = useState<number>(0);
  const [isRetryingSync, setIsRetryingSync] = useState<boolean>(false);

  // Synchronize pending offline cart items with the database with jitter-based retry delay
  const syncPendingCart = useCallback(async (retryCount = 0): Promise<boolean> => {
    // If device is offline, hold off until network connectivity is restored
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[useOfflineSync] Device is offline. Waiting for stable network heartbeat signal before retrying sync.");
      setIsOffline(true);
      return false;
    }

    try {
      const pendingItems = await cartQueueStore.getItem<CartItem[]>("pending_cart_items");
      if (!pendingItems || pendingItems.length === 0) {
        setSyncAttemptCount(0);
        setIsRetryingSync(false);
        return true;
      }

      const userId = session?.user?.id;
      let guestToken = "";
      if (typeof window !== "undefined") {
        guestToken = localStorage.getItem("localeats_guest_token") || "";
      }

      console.log(`[useOfflineSync] Synchronizing pending offline cart (attempt ${retryCount + 1}). Items: ${pendingItems.length}`);

      if (userId) {
        // Sync with active_carts for logged-in users
        const { error } = await supabase
          .from("active_carts")
          .upsert({
            user_id: userId,
            items: pendingItems,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });

        if (error) throw error;
      } else if (guestToken) {
        // Sync with guest_carts for anonymous sessions
        const { error } = await supabase
          .from("guest_carts")
          .upsert({
            guest_token: guestToken,
            items: pendingItems,
            updated_at: new Date().toISOString()
          }, { onConflict: "guest_token" });

        if (error) throw error;
      } else {
        // Hold on to the cart in queue if session token isn't ready
        return false;
      }

      // Success: remove the item from localForage IndexedDB & reset retry state
      await cartQueueStore.removeItem("pending_cart_items");
      setSyncAttemptCount(0);
      setIsRetryingSync(false);
      
      toast.success("Offline cart synchronized successfully! 🛒", {
        position: "bottom-right",
        duration: 5000
      });
      return true;
    } catch (err: any) {
      const nextAttempt = retryCount + 1;
      setSyncAttemptCount(nextAttempt);
      setIsRetryingSync(true);

      // Calculate Jittered Exponential Backoff Delay:
      // Delay = min(1000 * 2^attempt + jitter, 30000ms)
      const baseDelay = 1000 * Math.pow(2, Math.min(nextAttempt, 5));
      const jitter = Math.floor(Math.random() * 500);
      const jitteredDelayMs = Math.min(baseDelay + jitter, 30000);

      console.warn(
        `[useOfflineSync] Cart sync attempt ${nextAttempt} failed: ${err?.message || err}. Scheduling jittered retry in ${Math.round(
          jitteredDelayMs / 1000
        )}s.`
      );

      // Schedule jitter-based retry if network is available
      if (typeof window !== "undefined" && navigator.onLine && nextAttempt <= 5) {
        setTimeout(() => {
          // Verify network hasn't dropped before executing scheduled retry
          if (navigator.onLine) {
            syncPendingCart(nextAttempt);
          } else {
            console.log("[useOfflineSync] Jitter retry timer expired but network is offline. Pausing sync execution.");
          }
        }, jitteredDelayMs);
      }

      return false;
    }
  }, [session]);

  // Expose network change handlers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setSyncNotification("Device reconnected to 3G/LTE. Back online!");
      setTimeout(() => setSyncNotification(null), 5000);
      
      // Attempt to sync the pending cart items
      syncPendingCart();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncNotification("Device lost cellular signal. Running in offline-first mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingCart]);

  // Request storage persistence from the operating system on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persisted) => {
        setIsStoragePersisted(persisted);
        console.log(`[Storage Persistence] Enabled: ${persisted}`);
      }).catch((err) => {
        console.warn("[Storage Persistence] Permission request rejected:", err);
      });
    }
  }, []);

  // Save cart changes to localForage IndexedDB when offline
  useEffect(() => {
    if (isOffline && cart && cart.length > 0) {
      cartQueueStore.setItem("pending_cart_items", cart)
        .then(() => {
          console.log("[useOfflineSync] Successfully saved pending offline cart to IndexedDB via localForage");
        })
        .catch(err => {
          console.error("[useOfflineSync] Error saving pending cart to localForage IndexedDB:", err);
        });
    }
  }, [cart, isOffline]);

  // Sync on mount or when coming online
  useEffect(() => {
    if (!isOffline) {
      syncPendingCart();
    }
  }, [isOffline, syncPendingCart]);

  // Subscribe to the Service Worker's Sync Broadcast Channel
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use a unified broadcast channel
    const channel = new BroadcastChannel("localeats-sync-channel");

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as SyncMessage;
      if (!data || !data.type) return;

      console.log("[Offline Hook] Received sync notification:", data);
      setLastSyncMessage(data);

      if (data.type === "SYNC_SUCCESS") {
        setSyncNotification("All queued offline orders and carts synchronized successfully!");
      } else if (data.type === "CART_EXPIRED") {
        setSyncNotification(data.message);
      } else if (data.type === "sync-failed") {
        const errorMsg = "Order failed to sync due to exceeding the 15-minute validity limit.";
        setSyncFailedMessage(errorMsg);
        setSyncNotification(errorMsg);
        toast.error("Order Sync Failed", {
          description: errorMsg,
          duration: 10000,
          position: "top-center"
        });
      } else if (data.type === "SYNC_FAILURE") {
        setSyncNotification(`Sync issue: ${data.message}`);
      }

      // Auto-clear notification after 8 seconds
      setTimeout(() => {
        setSyncNotification((prev) => (
          prev === data.message ||
          prev === "All queued offline orders and carts synchronized successfully!" ||
          prev === "Order failed to sync due to exceeding the 15-minute validity limit."
            ? null
            : prev
        ));
        setSyncFailedMessage((prev) => (
          prev === "Order failed to sync due to exceeding the 15-minute validity limit." ? null : prev
        ));
      }, 8000);
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, []);

  const clearNotification = useCallback(() => {
    setSyncNotification(null);
    setSyncFailedMessage(null);
  }, []);

  return {
    isOffline,
    isStoragePersisted,
    lastSyncMessage,
    syncNotification,
    syncFailedMessage,
    clearNotification,
    syncPendingCart,
    syncAttemptCount,
    isRetryingSync,
  };
}
