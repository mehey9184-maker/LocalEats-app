/**
 * Transaction Idempotency Engine for LocalEats
 * 
 * Guarantees that mutating operations (order submission, payment terminal triggers,
 * cancellation, status progressions) are executed exactly once, preventing duplicate orders,
 * ghost charges, and race conditions across multi-clicks, flaky township cellular networks,
 * and offline sync replays.
 */

import { supabase } from "../lib/supabase";

export interface IdempotencyLock {
  key: string;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "completed" | "failed";
  result?: any;
}

const STORAGE_PREFIX = "localeats_idempotency_lock_";
const DEFAULT_TTL_MS = 45000; // 45 seconds lock TTL

class IdempotencyManagerClass {
  private inMemoryLocks = new Map<string, IdempotencyLock>();

  /**
   * Deterministically generates a unique idempotency key based on action scope and data payload.
   * Uses a time-window bucket (e.g. 30s) if no unique nonce is provided.
   */
  public generateKey(
    scope: string,
    payload: Record<string, any>,
    windowSeconds = 30
  ): string {
    const timeBucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const serialized = JSON.stringify(payload, Object.keys(payload).sort());
    
    // Fast lightweight string hash
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    return `${scope}_${Math.abs(hash).toString(36)}_${timeBucket}`;
  }

  /**
   * Attempts to acquire an execution lock for the given idempotency key.
   * Returns true if lock acquired successfully, false if duplicate or currently in flight.
   */
  public acquireLock(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
    const now = Date.now();

    // Check in-memory lock
    const memoryLock = this.inMemoryLocks.get(key);
    if (memoryLock && memoryLock.expiresAt > now) {
      if (memoryLock.status === "pending") {
        console.info(`[Idempotency] Duplicate in-flight execution prevented for key: ${key}`);
        return false;
      }
      if (memoryLock.status === "completed") {
        console.info(`[Idempotency] Transaction already completed for key: ${key}`);
        return false;
      }
    }

    // Check localStorage persistent lock (across tabs/reloads)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const storedJson = localStorage.getItem(STORAGE_PREFIX + key);
        if (storedJson) {
          const storedLock: IdempotencyLock = JSON.parse(storedJson);
          if (storedLock.expiresAt > now) {
            console.info(`[Idempotency] Duplicate execution prevented from persistent storage: ${key}`);
            this.inMemoryLocks.set(key, storedLock);
            return false;
          }
        }
      }
    } catch (e) {
      // Safe fallback if storage unavailable
    }

    // Acquire lock
    const lock: IdempotencyLock = {
      key,
      createdAt: now,
      expiresAt: now + ttlMs,
      status: "pending",
    };

    this.inMemoryLocks.set(key, lock);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(lock));
      }
    } catch (e) {}

    return true;
  }

  /**
   * Records a completed result for an idempotency key so redundant calls within the TTL
   * return the exact result without re-executing mutations.
   */
  public recordResult<T>(key: string, result: T, ttlMs = DEFAULT_TTL_MS): void {
    const now = Date.now();
    const lock: IdempotencyLock = {
      key,
      createdAt: now,
      expiresAt: now + ttlMs,
      status: "completed",
      result,
    };

    this.inMemoryLocks.set(key, lock);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(lock));
      }
    } catch (e) {}
  }

  /**
   * Releases or cleans up a lock upon failure.
   */
  public releaseLock(key: string): void {
    this.inMemoryLocks.delete(key);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_PREFIX + key);
      }
    } catch (e) {}
  }

  /**
   * Retrieves any cached completed result for an idempotency key.
   */
  public getCachedResult<T>(key: string): T | null {
    const now = Date.now();
    const mem = this.inMemoryLocks.get(key);
    if (mem && mem.status === "completed" && mem.expiresAt > now) {
      return mem.result as T;
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const storedJson = localStorage.getItem(STORAGE_PREFIX + key);
        if (storedJson) {
          const stored: IdempotencyLock = JSON.parse(storedJson);
          if (stored.status === "completed" && stored.expiresAt > now) {
            this.inMemoryLocks.set(key, stored);
            return stored.result as T;
          }
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Executes an asynchronous mutating action with complete idempotency guarantees.
   */
  public async runIdempotent<T>(
    key: string,
    action: () => Promise<T>,
    options?: { ttlMs?: number; allowCached?: boolean }
  ): Promise<T> {
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    const allowCached = options?.allowCached ?? true;

    if (allowCached) {
      const cached = this.getCachedResult<T>(key);
      if (cached !== null) {
        console.log(`[Idempotency] Returning cached idempotent result for: ${key}`);
        return cached;
      }
    }

    const acquired = this.acquireLock(key, ttlMs);
    if (!acquired) {
      const existing = this.getCachedResult<T>(key);
      if (existing !== null) return existing;
      throw new Error(`Duplicate transaction in progress (Lock key: ${key}). Please wait a moment.`);
    }

    try {
      const result = await action();
      this.recordResult(key, result, ttlMs);
      return result;
    } catch (error) {
      this.releaseLock(key);
      throw error;
    }
  }

  /**
   * Helper to verify if an order already exists in Supabase by its client ID.
   * Useful when a network timeout occurs but the database successfully received the insertion.
   */
  public async checkOrderExists(orderId: string): Promise<boolean> {
    try {
      const dbPromise = (async () => {
        try {
          return await supabase
            .from("orders")
            .select("id")
            .eq("id", orderId)
            .maybeSingle();
        } catch (err: any) {
          return { data: null, error: err };
        }
      })();

      let timeoutId: any;
      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ data: null, error: new Error("TIMEOUT") }), 3000);
      });

      const res = await Promise.race([dbPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      const { data, error } = res;

      if (!error && data && data.id === orderId) {
        return true;
      }
    } catch (err) {
      console.warn(`[Idempotency] Could not check order existence for ${orderId}:`, err);
    }
    return false;
  }

  /**
   * Cleans up expired locks from memory and localStorage.
   */
  public cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.inMemoryLocks.entries()) {
      if (lock.expiresAt <= now) {
        this.inMemoryLocks.delete(key);
      }
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            try {
              const val = JSON.parse(localStorage.getItem(k) || "{}");
              if (!val.expiresAt || val.expiresAt <= now) {
                keysToRemove.push(k);
              }
            } catch (e) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (e) {}
  }
}

export const IdempotencyManager = new IdempotencyManagerClass();

// Periodically purge expired locks every 2 minutes
if (typeof window !== "undefined") {
  setInterval(() => IdempotencyManager.cleanupExpiredLocks(), 120000);
}
