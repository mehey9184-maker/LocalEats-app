// Network Request Queuing System with IndexedDB + LocalStorage fallback
// Handles offline requests with exponential backoff retries & global error logging

import { pushGlobalErrorLog } from '../main';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils';

export interface QueuedNetworkRequest {
  id: string;
  type: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  nextAttemptAt: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  lastError?: string;
}

const DB_NAME = 'localeats_request_queue_db';
const DB_VERSION = 1;

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('request_queue')) {
        db.createObjectStore('request_queue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue a new request to the persistent queue (IndexedDB + LocalStorage)
 */
export async function enqueueRequest(
  type: string,
  payload: any,
  maxAttempts = 5
): Promise<QueuedNetworkRequest> {
  const item: QueuedNetworkRequest = {
    id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type,
    payload,
    attempts: 0,
    maxAttempts,
    createdAt: Date.now(),
    nextAttemptAt: Date.now(),
    status: 'pending',
  };

  // Save to IndexedDB
  try {
    const db = await openQueueDB();
    const tx = db.transaction('request_queue', 'readwrite');
    tx.objectStore('request_queue').put(item);
  } catch (err) {
    console.warn('[Queue] IndexedDB write failed, relying on localStorage:', err);
  }

  // Backup to LocalStorage queue for UI compatibility
  try {
    const existingLs = safeLocalStorageGet<QueuedNetworkRequest[]>('offline_request_queue_v2', []);
    existingLs.push(item);
    safeLocalStorageSet('offline_request_queue_v2', JSON.stringify(existingLs));
  } catch {}

  pushGlobalErrorLog(
    'console_error',
    `[Request Queue] Enqueued request ${item.id} (${type}) for background retry.`
  );

  return item;
}

/**
 * Get all pending network requests from storage
 */
export async function getPendingRequests(): Promise<QueuedNetworkRequest[]> {
  try {
    const db = await openQueueDB();
    const tx = db.transaction('request_queue', 'readonly');
    const store = tx.objectStore('request_queue');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items: QueuedNetworkRequest[] = request.result || [];
        resolve(items.filter((i) => i.status === 'pending' || i.status === 'processing'));
      };
      request.onerror = () => {
        const fallback = safeLocalStorageGet<QueuedNetworkRequest[]>('offline_request_queue_v2', []);
        resolve(fallback.filter((i) => i.status === 'pending' || i.status === 'processing'));
      };
    });
  } catch {
    const fallback = safeLocalStorageGet<QueuedNetworkRequest[]>('offline_request_queue_v2', []);
    return fallback.filter((i) => i.status === 'pending' || i.status === 'processing');
  }
}

/**
 * Update request status in storage
 */
export async function updateRequestInQueue(item: QueuedNetworkRequest): Promise<void> {
  try {
    const db = await openQueueDB();
    const tx = db.transaction('request_queue', 'readwrite');
    tx.objectStore('request_queue').put(item);
  } catch {}

  try {
    const existing = safeLocalStorageGet<QueuedNetworkRequest[]>('offline_request_queue_v2', []);
    const idx = existing.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      if (item.status === 'completed') {
        existing.splice(idx, 1);
      } else {
        existing[idx] = item;
      }
      safeLocalStorageSet('offline_request_queue_v2', JSON.stringify(existing));
    }
  } catch {}
}

/**
 * Clear a completed request from storage
 */
export async function removeRequestFromQueue(id: string): Promise<void> {
  try {
    const db = await openQueueDB();
    const tx = db.transaction('request_queue', 'readwrite');
    tx.objectStore('request_queue').delete(id);
  } catch {}

  try {
    const existing = safeLocalStorageGet<QueuedNetworkRequest[]>('offline_request_queue_v2', []);
    const filtered = existing.filter((i) => i.id !== id);
    safeLocalStorageSet('offline_request_queue_v2', JSON.stringify(filtered));
  } catch {}
}

/**
 * Exponential backoff calculation
 * Delay = min(initialDelay * 2^(attempts), maxDelay) + jitter
 */
export function calculateExponentialBackoffDelay(
  attempt: number,
  initialDelayMs = 1000,
  maxDelayMs = 30000
): number {
  const expDelay = initialDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(expDelay + jitter, maxDelayMs);
}

/**
 * Process queue items with exponential backoff executor
 */
export async function processNetworkQueue(
  executor: (item: QueuedNetworkRequest) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const items = await getPendingRequests();
  const now = Date.now();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    if (item.nextAttemptAt > now) {
      continue; // Not ready for retry yet according to backoff timing
    }

    item.attempts += 1;
    item.lastAttemptAt = now;
    item.status = 'processing';
    await updateRequestInQueue(item);

    try {
      const success = await executor(item);
      if (success) {
        item.status = 'completed';
        await removeRequestFromQueue(item.id);
        processed++;
        pushGlobalErrorLog(
          'console_error',
          `[Request Queue] Successfully processed item ${item.id} on attempt ${item.attempts}.`
        );
      } else {
        throw new Error('Handler returned false');
      }
    } catch (err: any) {
      failed++;
      const errMsg = err?.message || String(err);
      item.lastError = errMsg;

      if (item.attempts >= item.maxAttempts) {
        item.status = 'failed';
        await updateRequestInQueue(item);
        pushGlobalErrorLog(
          'network_timeout',
          `[Request Queue] Item ${item.id} failed after ${item.attempts} max attempts: ${errMsg}`
        );
      } else {
        item.status = 'pending';
        const backoffMs = calculateExponentialBackoffDelay(item.attempts);
        item.nextAttemptAt = Date.now() + backoffMs;
        await updateRequestInQueue(item);
        pushGlobalErrorLog(
          'network_timeout',
          `[Request Queue Backoff] Item ${item.id} attempt ${item.attempts} failed (${errMsg}). Retrying in ${Math.round(
            backoffMs / 1000
          )}s.`
        );
      }
    }
  }

  return { processed, failed };
}
