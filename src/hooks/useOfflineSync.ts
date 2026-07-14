"use client";

import { useState, useEffect, useCallback } from "react";

export interface SyncMessage {
  type: "SYNC_SUCCESS" | "SYNC_FAILURE" | "CART_EXPIRED";
  message: string;
  timestamp: number;
  details?: any;
}

/**
 * Custom React Hook: useOfflineSync
 * ----------------------------------------------------------------------------
 * Subscribes to service worker BroadcastChannel alerts, monitors network
 * connectivity, and secures persistent storage status under low-end environments.
 */
export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  const [isStoragePersisted, setIsStoragePersisted] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<SyncMessage | null>(null);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Expose network change handlers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setSyncNotification("Device reconnected to 3G/LTE. Back online!");
      setTimeout(() => setSyncNotification(null), 5000);
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
  }, []);

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
      } else if (data.type === "SYNC_FAILURE") {
        setSyncNotification(`Sync issue: ${data.message}`);
      }

      // Auto-clear notification after 8 seconds
      setTimeout(() => {
        setSyncNotification((prev) => (prev === data.message || prev === "All queued offline orders and carts synchronized successfully!" ? null : prev));
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
  }, []);

  return {
    isOffline,
    isStoragePersisted,
    lastSyncMessage,
    syncNotification,
    clearNotification,
  };
}
