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

  // Synchronize pending offline cart items with the database (active_carts / guest_carts)
  const syncPendingCart = useCallback(async () => {
    try {
      const pendingItems = await cartQueueStore.getItem<CartItem[]>("pending_cart_items");
      if (!pendingItems || pendingItems.length === 0) return;

      const userId = session?.user?.id;
      let guestToken = "";
      if (typeof window !== "undefined") {
        guestToken = localStorage.getItem("localeats_guest_token") || "";
      }

      console.log("[useOfflineSync] Found pending offline cart items to synchronize. Length:", pendingItems.length);

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
        // If no user or guest session is initialized, we hold on to the cart in queue
        return;
      }

      // Success: remove the item from localForage IndexedDB
      await cartQueueStore.removeItem("pending_cart_items");
      
      toast.success("Offline cart synchronized successfully! 🛒", {
        position: "bottom-right",
        duration: 5000
      });
    } catch (err) {
      console.error("[useOfflineSync] Failed to synchronize offline cart with database:", err);
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
    syncPendingCart
  };
}
