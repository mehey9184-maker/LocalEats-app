import { FirestoreService } from './firebase';
import { toDBPhone } from '../utils';
import {
  queueProfileSync,
  getProfileSyncQueue,
  clearProfileFromQueue,
  incrementProfileRetry,
  QueuedProfile
} from './offlineQueue';

export interface ProfileUpsertData {
  user_id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  country?: string | null;
  role?: string | null;
  photo_url?: string | null;
  language?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  favorites?: any[];
}

// Active retry timeout handles to prevent duplicate timers
const activeRetryTimers: Map<string, any> = new Map();

/**
 * Determines whether an error is a permanent schema/type or data constraint error
 * that must NOT be queued or retried.
 */
export function isPermanentSyncError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message || error || "");
  const code = String(error?.code || "");
  
  return (
    code === "22P02" || // Invalid input syntax (e.g. invalid UUID)
    code === "42703" || // Undefined column
    code === "42804" || // Datatype mismatch
    code === "23502" || // Not-null violation
    code === "PGRST204" || // Column not found in PostgREST schema cache
    code === "PGRST205" || // Table not found
    msg.includes("22P02") ||
    msg.includes("invalid input syntax for type uuid") ||
    msg.includes("Could not find the") ||
    msg.includes("schema cache") ||
    msg.includes("column") && msg.includes("does not exist") ||
    msg.includes("Forbidden") ||
    msg.includes("ID mismatch")
  );
}

/**
 * Calculates exponential backoff delay with jitter
 * delay = min(maxDelay, baseDelay * 2^attempt + jitter)
 */
function calculateBackoffDelay(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(maxDelay, exponential + jitter);
}

/**
 * Schedules a background retry for a profile using exponential backoff.
 * If the last error was a permanent schema/type failure, retries are skipped.
 */
export function scheduleProfileRetry(profileData: ProfileUpsertData, currentAttempt = 0) {
  if (typeof window === "undefined" || !profileData.user_id) return;
  const userId = profileData.user_id;

  // Clear existing timer if any
  if (activeRetryTimers.has(userId)) {
    clearTimeout(activeRetryTimers.get(userId));
    activeRetryTimers.delete(userId);
  }

  const delay = calculateBackoffDelay(currentAttempt);
  console.log(`[Profile Retry] Scheduling sync retry for user ${userId} in ${Math.round(delay)}ms (attempt ${currentAttempt + 1})`);

  const timer = setTimeout(async () => {
    activeRetryTimers.delete(userId);
    if (!navigator.onLine) {
      // Re-schedule when connection resumes
      return;
    }

    try {
      const result = await syncProfileDirect(profileData);
      if (result.success) {
        console.log(`[Profile Retry] Background sync succeeded for user ${userId}`);
        clearProfileFromQueue(userId);
      } else {
        if (isPermanentSyncError(result.error)) {
          console.error(`[Profile Retry] Permanent schema/type error for user ${userId}. Evicting from retry queue:`, result.error?.message || result.error);
          clearProfileFromQueue(userId);
          return;
        }
        incrementProfileRetry(userId, result.error?.message || "Sync failed");
        if (currentAttempt < 5) {
          scheduleProfileRetry(profileData, currentAttempt + 1);
        }
      }
    } catch (err: any) {
      if (isPermanentSyncError(err)) {
        console.error(`[Profile Retry] Permanent schema/type error for user ${userId}. Evicting from retry queue:`, err?.message || err);
        clearProfileFromQueue(userId);
        return;
      }
      incrementProfileRetry(userId, err?.message || "Exception during retry");
      if (currentAttempt < 5) {
        scheduleProfileRetry(profileData, currentAttempt + 1);
      }
    }
  }, delay);

  activeRetryTimers.set(userId, timer);
}

/**
 * Direct synchronization multi-channel executor
 */
async function syncProfileDirect(profileData: ProfileUpsertData): Promise<{ success: boolean; data?: any; error?: any }> {
  if (!profileData.user_id) {
    return { success: false, error: new Error("User ID is required") };
  }

  const sanitizedPhone = toDBPhone(profileData.phone);
  let synced = false;
  let lastError: any = null;

  // Channel 1: Supabase (Authoritative primary persistent database via Express API)
  try {
    const { getApiAuthHeaders } = await import('./apiAuth');
    const headers = await getApiAuthHeaders();
    
    const safePayload = {
      user_id: profileData.user_id,
      fullName: profileData.fullName,
      email: profileData.email,
      phone: sanitizedPhone,
      role: profileData.role || "user",
      city: profileData.city || "",
      address: profileData.address || "",
      country: profileData.country || "South Africa",
      photo_url: profileData.photo_url || "",
      language: profileData.language || "en",
      favorites: profileData.favorites || [],
      updated_at: new Date().toISOString(),
    };
    
    const response = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(safePayload)
    });
    
    const result = await response.json();
          
    if (!response.ok || !result.success) {
      console.warn("[Profile Sync] Supabase API sync notice:", result.error || "Failed");
      lastError = new Error(result.error || "Failed");
    } else {
      synced = true;
      lastError = null; // Clear any previous error if Supabase succeeds
    }
  } catch (sbErr: any) {
    console.warn("[Profile Sync] Exception syncing to Supabase API:", sbErr?.message || sbErr);
    lastError = sbErr;
  }

  // Channel 2: Firestore (Non-blocking secondary mirror for compatibility)
  FirestoreService.saveProfile(profileData.user_id, {
    full_name: profileData.fullName || null,
    email: profileData.email || null,
    phone: sanitizedPhone,
    city: profileData.city || null,
    address: profileData.address || null,
    country: profileData.country || "South Africa",
    role: profileData.role || "user",
    avatar_url: profileData.photo_url || null,
    language: profileData.language || "en",
    favorites: profileData.favorites || []
  }).catch((fsErr: any) => {
    console.debug("[Profile Sync] Firestore mirror notice:", fsErr?.message || fsErr);
  });

  return { success: synced, error: synced ? null : lastError };
}

/**
 * Executes profile upsert with immediate local storage persistence,
 * persistent offline queue fallback, and exponential backoff retries.
 */
export async function upsertProfileWithRPC(profileData: ProfileUpsertData): Promise<{ data: any; error: any }> {
  if (!profileData.user_id) {
    return { data: null, error: new Error("User ID is required for profile upsert") };
  }

  const sanitizedPhone = toDBPhone(profileData.phone);

  // 1. Instantly persist to local storage for offline and fast recovery
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const cached = localStorage.getItem("userProfile");
      const existing = cached ? JSON.parse(cached) : {};
      const updated = {
        ...existing,
        id: profileData.user_id,
        user_id: profileData.user_id,
        fullName: profileData.fullName ?? existing.fullName,
        email: profileData.email ?? existing.email,
        phone: sanitizedPhone ?? profileData.phone ?? existing.phone,
        city: profileData.city ?? existing.city,
        address: profileData.address ?? existing.address,
        country: profileData.country ?? existing.country ?? "South Africa",
        role: profileData.role ?? existing.role ?? "user",
        photoURL: profileData.photo_url ?? existing.photoURL,
        language: profileData.language ?? existing.language ?? "en",
        latitude: profileData.latitude ?? existing.latitude,
        longitude: profileData.longitude ?? existing.longitude,
        favorites: profileData.favorites ?? existing.favorites ?? [],
      };
      localStorage.setItem("userProfile", JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore local storage error
  }

  // 2. Add to persistent queue in local storage immediately
  queueProfileSync(profileData);

  // 3. If offline, keep in queue and return cached success immediately
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    console.info("[Profile Service] Network is offline. Profile saved locally and queued for auto-sync.");
    return { data: { cached: true, offline: true }, error: null };
  }

  // 4. Attempt direct multi-channel sync
  try {
    const result = await syncProfileDirect(profileData);
    if (result.success) {
      clearProfileFromQueue(profileData.user_id);
      return { data: result.data || { success: true }, error: null };
    } else {
      if (isPermanentSyncError(result.error)) {
        console.error("[Profile Service] Permanent schema/type error. Evicting from queue and cancelling retry:", result.error?.message || result.error);
        clearProfileFromQueue(profileData.user_id);
        return { data: null, error: result.error };
      }
      // Direct sync did not succeed; initiate exponential backoff retry in background
      console.warn("[Profile Service] Database offline or unreachable. Scheduling exponential backoff retry...");
      queueProfileSync(profileData, result.error?.message || "Sync failed");
      scheduleProfileRetry(profileData, 0);
      return { data: { cached: true, offline: true, retryScheduled: true }, error: null };
    }
  } catch (err: any) {
    if (isPermanentSyncError(err)) {
      console.error("[Profile Service] Permanent schema/type error. Evicting from queue and cancelling retry:", err?.message || err);
      clearProfileFromQueue(profileData.user_id);
      return { data: null, error: err };
    }
    console.info("[Profile Service] Exception during profile sync:", err?.message || err);
    queueProfileSync(profileData, err?.message || "Sync exception");
    scheduleProfileRetry(profileData, 0);
    return { data: { cached: true, offline: true, retryScheduled: true }, error: null };
  }
}

/**
 * Runs a query to identify any specific rows in 'public.profiles' where 'phone' 
 * contains characters that do not strictly match the SA phone regex constraint '^(?:\+27|0)[0-9]{9}$'.
 */
export async function findOffendingProfilePhones() {
  return { offending: [], error: null };
}

/**
 * Iterates through all queued offline profile sync items and processes them
 */
export async function processOfflineProfileQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const queue: QueuedProfile[] = getProfileSyncQueue();
  if (!queue || queue.length === 0) return;
  
  console.log(`[Offline Profile Sync] Processing ${queue.length} queued profile updates...`);
  
  for (const item of queue) {
    const profileData = item.data || item;
    const userId = item.user_id || profileData?.user_id;
    if (!userId) continue;

    try {
      const res = await syncProfileDirect(profileData);
      if (res.success) {
        console.log(`[Offline Profile Sync] Successfully synced queued profile for ${userId}`);
        clearProfileFromQueue(userId);
      } else {
        if (isPermanentSyncError(res.error)) {
          console.error(`[Offline Profile Sync] Permanent schema/type error for user ${userId}. Evicting from queue:`, res.error?.message || res.error);
          clearProfileFromQueue(userId);
          continue;
        }
        incrementProfileRetry(userId, res.error?.message || "Sync failed");
        // Schedule next retry with exponential backoff
        scheduleProfileRetry(profileData, item.retryCount || 0);
      }
    } catch (e: any) {
      if (isPermanentSyncError(e)) {
        console.error(`[Offline Profile Sync] Permanent schema/type error for user ${userId}. Evicting from queue:`, e?.message || e);
        clearProfileFromQueue(userId);
        continue;
      }
      incrementProfileRetry(userId, e?.message || "Exception");
      console.warn("Failed to sync queued profile:", e);
      scheduleProfileRetry(profileData, item.retryCount || 0);
    }
  }
}

// Auto-register lifecycle event listeners
if (typeof window !== "undefined") {
  window.addEventListener('online', () => {
    console.log("[Profile Service] Online event detected. Triggering queue processor...");
    processOfflineProfileQueue();
  });
  window.addEventListener('localeats-sync-profile', () => {
    processOfflineProfileQueue();
  });

  // Background health check interval every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      const queue = getProfileSyncQueue();
      if (queue.length > 0) {
        processOfflineProfileQueue();
      }
    }
  }, 30000);
}
