export const QUEUE_KEY = "offline_profile_queue";

export interface QueuedProfile {
  user_id: string;
  data: any;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}

export function queueProfileSync(profileData: any, errorReason?: string) {
  if (typeof window === "undefined" || !profileData) return;
  const userId = profileData.user_id || profileData.id;
  if (!userId) return;

  try {
    const existing = localStorage.getItem(QUEUE_KEY);
    const queue: QueuedProfile[] = existing ? JSON.parse(existing) : [];
    
    // Find existing entry
    const existingEntry = queue.find((p) => (p.user_id || p.data?.user_id) === userId);
    const retryCount = existingEntry ? (existingEntry.retryCount || 0) : 0;
    
    // Remove existing entry for this user if it exists to replace with updated state
    const filtered = queue.filter((p) => (p.user_id || p.data?.user_id) !== userId);
    
    filtered.push({
      user_id: userId,
      data: { ...profileData, user_id: userId },
      retryCount,
      lastAttemptAt: new Date().toISOString(),
      lastError: errorReason || existingEntry?.lastError,
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
    });
    
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to queue profile sync", e);
  }
}

export function incrementProfileRetry(userId: string, errorReason?: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = localStorage.getItem(QUEUE_KEY);
    if (!existing) return;
    const queue: QueuedProfile[] = JSON.parse(existing);
    const updated = queue.map((item) => {
      if ((item.user_id || item.data?.user_id) === userId) {
        return {
          ...item,
          retryCount: (item.retryCount || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: errorReason || item.lastError,
        };
      }
      return item;
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export function getProfileSyncQueue(): QueuedProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = localStorage.getItem(QUEUE_KEY);
    if (!existing) return [];
    const parsed = JSON.parse(existing);
    if (!Array.isArray(parsed)) return [];
    // Normalize format
    return parsed.map((item: any) => {
      if (item.data) return item;
      return {
        user_id: item.user_id || item.id,
        data: item,
        retryCount: item.retryCount || 0,
        createdAt: item.createdAt || new Date().toISOString(),
      };
    });
  } catch (e) {
    return [];
  }
}

export function clearProfileFromQueue(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = localStorage.getItem(QUEUE_KEY);
    if (!existing) return;
    const queue = JSON.parse(existing);
    const filtered = queue.filter((p: any) => (p.user_id || p.data?.user_id || p.id) !== userId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    // ignore
  }
}
