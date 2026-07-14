/**
 * LocalEats Offline Local Cache Manager (IndexedDB Wrapper)
 * ----------------------------------------------------------------------------
 * A robust, native IndexedDB cache layer designed for low-end mobile hardware.
 * Eliminates large external dependencies to keep the JS bundle minimal.
 * Serves Stale-While-Revalidate caching for food menus, local merchants, and profiles.
 */

const DB_NAME = "LocalEatsOfflineDB";
const DB_VERSION = 1;

export interface OfflineStoreData {
  id: string;
  [key: string]: any;
}

/**
 * Open the IndexedDB connection and initialize Object Stores
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" && typeof self === "undefined") {
      reject(new Error("IndexedDB is only available in browser environments."));
      return;
    }

    const indexedDBObj = typeof window !== "undefined" ? window.indexedDB : (self as any).indexedDB;
    if (!indexedDBObj) {
      reject(new Error("IndexedDB is not supported on this device."));
      return;
    }

    const request = indexedDBObj.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      
      // Initialize required stores for township micro-economies offline caching
      if (!db.objectStoreNames.contains("menus")) {
        db.createObjectStore("menus", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("merchants")) {
        db.createObjectStore("merchants", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("user_profile")) {
        db.createObjectStore("user_profile", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("offline_outbox")) {
        db.createObjectStore("offline_outbox", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * High-performance, low-level wrapper to run safe transactions
 */
async function runTransaction<T>(
  storeName: "menus" | "merchants" | "user_profile" | "offline_outbox",
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => {
        resolve(request.result as T);
      };

      request.onerror = () => {
        reject(request.error || new Error(`IndexedDB request failed in store: ${storeName}`));
      };

      tx.oncomplete = () => {
        db.close();
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error(`IndexedDB transaction failed in store: ${storeName}`));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Clean promises for setting, getting, and clearing offline stores
 */
export const offlineStore = {
  /**
   * Retrieves an item from the designated IndexedDB store
   */
  async get<T>(storeName: "menus" | "merchants" | "user_profile" | "offline_outbox", id: string): Promise<T | null> {
    try {
      return await runTransaction<T | null>(storeName, "readonly", (store) => store.get(id));
    } catch (error) {
      console.error(`[Offline Store] Get error in ${storeName} for id ${id}:`, error);
      return null;
    }
  },

  /**
   * Upserts/saves an item to the designated IndexedDB store
   */
  async set<T extends { id: string }>(
    storeName: "menus" | "merchants" | "user_profile" | "offline_outbox",
    data: T
  ): Promise<void> {
    try {
      await runTransaction<void>(storeName, "readwrite", (store) => store.put(data));
    } catch (error) {
      console.error(`[Offline Store] Set error in ${storeName}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a record from the designated IndexedDB store
   */
  async delete(
    storeName: "menus" | "merchants" | "user_profile" | "offline_outbox",
    id: string
  ): Promise<void> {
    try {
      await runTransaction<void>(storeName, "readwrite", (store) => store.delete(id));
    } catch (error) {
      console.error(`[Offline Store] Delete error in ${storeName} for id ${id}:`, error);
      throw error;
    }
  },

  /**
   * Retrieves all values inside an object store
   */
  async getAll<T>(storeName: "menus" | "merchants" | "user_profile" | "offline_outbox"): Promise<T[]> {
    try {
      return await runTransaction<T[]>(storeName, "readonly", (store) => store.getAll());
    } catch (error) {
      console.error(`[Offline Store] GetAll error in ${storeName}:`, error);
      return [];
    }
  },

  /**
   * Clears all items from the designated IndexedDB store
   */
  async clear(storeName: "menus" | "merchants" | "user_profile" | "offline_outbox"): Promise<void> {
    try {
      await runTransaction<void>(storeName, "readwrite", (store) => store.clear());
    } catch (error) {
      console.error(`[Offline Store] Clear error in ${storeName}:`, error);
      throw error;
    }
  }
};
