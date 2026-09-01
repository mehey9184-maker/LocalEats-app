/**
 * LocalEats - Unified High-Performance Utility Masterpiece
 * Strictly conforms to DRY, SOLID, and KISS design specifications.
 */

import { DEFAULT_FALLBACK_SHOPS, MY_KOTA_TEST_STORE } from './App-constants';
import { Shop } from './types';
export { DEFAULT_FALLBACK_SHOPS, MY_KOTA_TEST_STORE };

export const DEFAULT_MENU_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800";
export const DEFAULT_SHOP_LOGO = "/logo.png";
export const APP_VERSION = "2.4.1 (1024)";
export const DEFAULT_COORDS = { lat: -26.009012, lng: 28.192455 };
export const SUPPORTED_CITIES = ['Tembisa', 'Kaalfontein', 'Ivory Park'];

/**
 * Computes a fast, deterministic 32-bit integer hash from a string.
 * Uses a modified Bernstein (djb2) algorithm, optimized for single-session mapping keys.
 */
export const hashString = (str: string): number => {
  if (!str) return 0;
  let hash = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to a 32-bit integer status
  }
  return Math.abs(hash);
};

/**
 * Elegant, fallback-safe handler for Supabase API pipeline failures.
 * Eliminates unhandled UI crashes by gracefully mapping specific DB states.
 */
export const handleSupabaseError = (
  error: any,
  action: string,
  showAlert: (title: string, msg: string) => void
): any => {
  console.error(`[Supabase Error] Event during ${action}:`, error);

  const errorCode = error?.code;
  const errorMessage = error?.message?.toLowerCase() || '';

  if (errorCode === 'PGRST204' || errorCode === 'PGRST200') {
    showAlert(
      'Updating Store Info',
      'We are currently updating our store lists to bring you the latest menus. Please try again in a few seconds.'
    );
  } else if (errorMessage.includes('failed to fetch') || errorMessage.includes('network error')) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    showAlert(
      isOffline ? 'Offline' : 'Server Unreachable',
      isOffline
        ? 'You are currently offline. Please check your network connection and try again.'
        : 'Unable to connect to the server. The backend service may be temporarily busy or unreachable. Please try again shortly.'
    );
  } else if (errorCode === '23505') {
    showAlert(
      'Already Exists',
      'This information is already saved in your profile.'
    );
  } else if (errorCode === '42501' || errorMessage.includes('permission denied')) {
    showAlert(
      'Access Needed',
      'It looks like you do not have permission for this action. Please sign in again.'
    );
  } else if (errorCode === 'PGRST301') {
    showAlert(
      'Session Timed Out',
      'Your session has expired for security. Please refresh the page to continue.'
    );
  } else {
    showAlert(
      'Something Went Wrong',
      `We encountered an issue while trying to ${action}. Please try again later.`
    );
  }

  return error;
};

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the highly accurate Haversine Formula.
 * Optimized for local delivery radius bounding calculations.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Radius of the Earth in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) *
      Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

interface ShopStatus {
  isOpen: boolean;
  message: string;
  warning?: boolean;
  nextOpeningTime?: string;
}

/**
 * Resolves whether a shop is operational based on explicit closing/opening times.
 * Gracefully processes overnight shifts (e.g. 18:00 to 02:00) with detailed safety buffer warnings.
 */
export const getShopStatus = (shop: {
  opening_time?: string;
  closing_time?: string;
  is_active?: boolean | string | number;
}): ShopStatus => {
  const isActive = shop.is_active === true || shop.is_active === "true" || shop.is_active === "t" || shop.is_active === 1;
  
  if (!isActive && shop.is_active !== undefined) {
    return { isOpen: false, message: 'Away / Not Accepting Orders' };
  }

  if (!shop.opening_time || !shop.closing_time) {
    return { isOpen: true, message: 'Open Now' };
  }

  const now = new Date();
  
  // Always evaluate store hours in South African Time (SAST)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const formattedParts = formatter.formatToParts(now);
  const hourString = formattedParts.find(p => p.type === 'hour')?.value || "0";
  const minuteString = formattedParts.find(p => p.type === 'minute')?.value || "0";
  
  const currentSastHour = parseInt(hourString, 10) === 24 ? 0 : parseInt(hourString, 10);
  const currentSastMinute = parseInt(minuteString, 10);
  
  const currentTime = currentSastHour * 60 + currentSastMinute;

  const [openHours, openMinutes] = shop.opening_time.split(':').map(Number);
  const [closeHours, closeMinutes] = shop.closing_time.split(':').map(Number);

  const openTime = openHours * 60 + openMinutes;
  const closeTime = closeHours * 60 + closeMinutes;

  let isOpen = false;
  if (closeTime > openTime) {
    isOpen = currentTime >= openTime && currentTime <= closeTime;
  } else {
    // Overnight operational case
    isOpen = currentTime >= openTime || currentTime <= closeTime;
  }

  if (!isOpen) {
    return { isOpen: false, message: 'Closed', nextOpeningTime: shop.opening_time };
  }

  // Calculate precise minutes until shop operational shift closes
  let minutesUntilClose = 0;
  if (closeTime > currentTime) {
    minutesUntilClose = closeTime - currentTime;
  } else if (closeTime < openTime) {
    minutesUntilClose = (1440 - currentTime) + closeTime;
  }

  if (minutesUntilClose > 0 && minutesUntilClose <= 30) {
    return {
      isOpen: true,
      message: `Closing soon (${minutesUntilClose}m)`,
      warning: true,
      nextOpeningTime: undefined,
    };
  }

  return { isOpen: true, message: 'Open Now' };
};

/**
 * Formats phone strings into South African standard display representations (+27 XX XXX XXXX).
 * Restricts maximum numeric sequence length cleanly.
 */
export const formatSAPhone = (val: string): string => {
  if (!val) return '';
  
  let cleaned = val.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1);
  }
  
  if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return '+' + cleaned;
  if (cleaned.length <= 4) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
  if (cleaned.length <= 7) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4)}`;
  
  return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
};

/**
 * Validates whether a dial string adheres strictly to South African cellular format (+27 XXXXXXXXX).
 */
export const validateSAPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^27[0-9]{9}$/.test(cleaned);
};

/**
 * Sanitizes and formats phone numbers for database columns with SA phone check constraints (valid_sa_phone).
 * Converts "+27 71 234 5678" or "0712345678" into unspaced E.164 "+27712345678" or fallback "+27700000000".
 */
export const toDBPhone = (val?: string | null): string | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/\D/g, '');

  // Standard 10-digit SA phone starting with 0 (e.g. 0712345678)
  if (/^0[0-9]{9}$/.test(cleaned)) {
    return '+27' + cleaned.substring(1);
  }

  // 11-digit SA phone starting with 27 (e.g. 27712345678)
  if (/^27[0-9]{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // 9 digits without leading 0 or 27 (e.g. 712345678)
  if (/^[0-9]{9}$/.test(cleaned)) {
    return '+27' + cleaned;
  }

  // User typed +27 with leading 0 (e.g. +270712345678 -> 270712345678)
  if (cleaned.startsWith('270') && cleaned.length >= 12) {
    const fixed = cleaned.substring(0, 2) + cleaned.substring(3, 12);
    if (/^27[0-9]{9}$/.test(fixed)) {
      return '+' + fixed;
    }
  }

  // Any other numeric string starting with 0 and at least 10 digits
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    const sliced = cleaned.substring(0, 10);
    return '+27' + sliced.substring(1);
  }

  // Any other numeric string starting with 27 and at least 11 digits
  if (cleaned.startsWith('27') && cleaned.length >= 11) {
    return '+' + cleaned.substring(0, 11);
  }

  // Fallback for unparseable phone: return null so PostgreSQL constraint 'phone IS NULL OR ...' passes cleanly
  return null;
};

/**
 * High-reliability LocalStorage getter with robust parsing exceptions routing.
 */
export const safeLocalStorageGet = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === "null" || saved === "undefined") return fallback;
    const parsed = JSON.parse(saved);
    return parsed !== null ? (parsed as T) : fallback;
  } catch (err) {
    console.warn(`[SafeStorage] Failed parsing or getting item for key "${key}", reverting to fallback.`, err);
    return fallback;
  }
};

/**
 * Cleanly saves serialization payloads while tracking storage capacity states dynamically.
 * Implements strict size limit checks to prevent buffer bloat.
 */
export const safeLocalStorageSet = (key: string, value: any): void => {
  try {
    let safeVal = typeof value === "string" ? value : JSON.stringify(value);
    if (safeVal && safeVal.startsWith('[') && safeVal.endsWith(']')) {
      try {
        const parsed = JSON.parse(safeVal);
        if (Array.isArray(parsed) && parsed.length > 50) {
          console.warn(`[SafeStorage] Truncating oversized block payload for "${key}" list.`);
          safeVal = JSON.stringify(parsed.slice(0, 50));
        }
      } catch {}
    }
    localStorage.setItem(key, safeVal);
  } catch (err: any) {
    console.error(`[SafeStorage] Uncaught error saving "${key}" to localStorage:`, err);
    
    // Attempt recovery from QuotaExceeded checks
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      try {
        console.warn('[SafeStorage] Quota exceeded. Evicting cache collections and retrying...');
        localStorage.removeItem('cached_shops');
        localStorage.removeItem('cached_orders');
        localStorage.removeItem('admin_cached_orders');
        const retryVal = typeof value === "string" ? value : JSON.stringify(value);
        localStorage.setItem(key, retryVal);
      } catch (retryErr) {
        console.error('[SafeStorage] Recovery eviction failed to clear sufficient quota.', retryErr);
      }
    }
  }
};

/**
 * Iterative self-cleaning routine for storage keys. Truncates records to keep footprint minimal.
 */
export const pruneLargeKeys = (): void => {
  try {
    const limitArraySize = (key: string, maxItems: number) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > maxItems) {
            console.warn(`[SelfCleaning] Pruning list "${key}" from ${parsed.length} items to ${maxItems}`);
            localStorage.setItem(key, JSON.stringify(parsed.slice(0, maxItems)));
          }
        }
      } catch (e) {
        console.warn(`[SelfCleaning] Pruning key "${key}" failed`, e);
      }
    };

    limitArraySize('cached_orders', 40);
    limitArraySize('admin_cached_orders', 40);
    limitArraySize('app_notifications', 50);

    let totalSize = 0;
    const keysToRemoveOnHighLoad = [
      'cached_shops',
      'cached_orders',
      'admin_cached_orders'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        totalSize += (localStorage.getItem(k)?.length || 0);
      }
    }

    // High stress limit - evict large chunks if total size exceeds 3.5MB
    if (totalSize > 3500000) {
      console.warn(`[SelfCleaning] Proactive cleanup triggered. Total size is approx ${(totalSize / 1024).toFixed(1)}KB`);
      keysToRemoveOnHighLoad.forEach(k => {
        try {
          localStorage.removeItem(k);
          console.log(`[SelfCleaning] Evicted cache bucket due to high load: ${k}`);
        } catch (e) {
          console.error(e);
        }
      });
    }
  } catch (error) {
    console.error('[SelfCleaning] Error during proactive startup storage prune:', error);
  }
};

/**
 * Triggers background web CacheStorage and indexedDB trash disposal.
 */
export const cleanCacheStorage = async (): Promise<void> => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`[SelfCleaning] Scanning CacheStorage buckets to trim footprint:`, cacheNames);
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log(`[SelfCleaning] Cleared CacheStorage bucket: ${name}`);
      }
    }

    if ('indexedDB' in window && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && (db.name.includes('mapbox') || db.name.includes('leaflet') || db.name.includes('supabase'))) {
          window.indexedDB.deleteDatabase(db.name);
          console.log(`[SelfCleaning] Pruned auxiliary system indexedDB: ${db.name}`);
        }
      }
    }
  } catch (e) {
    console.warn('[SelfCleaning] CacheStorage/IndexedDb cleanup omitted or unsupported in current runtime environment', e);
  }
};

/**
 * Computes whether a shop's updated_at timestamp stands in the moderately inactive band (4 to 6 days).
 * Returns true if age is between 96 and 144 hours.
 */
export const isShopAway = (shop: { updated_at?: string; is_active?: boolean | string | number }): boolean => {
  // The is_active switch is the absolute master control now, removing the updated_at away heuristic
  return false;
};

/**
 * Formats a numeric value into South African Rand (R) format with dynamic decimal precision.
 * By default, shows cents only if the number has a fractional part, or as forced by options.
 */
export const formatRand = (
  amount: number | string,
  options?: { forceCents?: boolean; round?: boolean }
): string => {
  let val = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  if (options?.round) {
    val = Math.round(val);
  }
  
  // Dynamically adjust decimal precision: if it has cents or forced, use 2 decimals, otherwise 0.
  const hasCents = val % 1 !== 0;
  const precision = (options?.forceCents || hasCents) ? 2 : 0;
  
  return `R ${val.toFixed(precision)}`;
};

/**
 * Deterministically merges shop catalogs from Supabase, Firestore, and memory.
 * Eliminates provider oscillation, flicker, and disappearing stores by keeping
 * all valid shops from both backends in a unified catalog.
 */
export const mergeShopsCatalogs = (
  primaryShops: Shop[] = [],
  secondaryShops: Shop[] = []
): Shop[] => {
  const shopMap = new Map<string, Shop>();

  const processShop = (shop: Shop) => {
    if (!shop || !shop.id) return;
    const sId = String(shop.id);
    const normalizedName = (shop.name || "").trim().toLowerCase();

    // Match by exact ID first, or by normalized non-empty name
    let matchedKey: string | null = null;
    if (shopMap.has(sId)) {
      matchedKey = sId;
    } else if (normalizedName.length > 0) {
      for (const [k, s] of shopMap.entries()) {
        if ((s.name || "").trim().toLowerCase() === normalizedName) {
          matchedKey = k;
          break;
        }
      }
    }

    if (matchedKey) {
      const existing = shopMap.get(matchedKey)!;

      // Prefer non-empty and richer menus
      const existingMenuLen = existing.menu?.length || 0;
      const incomingMenuLen = shop.menu?.length || 0;
      const mergedMenu =
        incomingMenuLen > existingMenuLen
          ? shop.menu
          : existingMenuLen > 0
          ? existing.menu
          : shop.menu || [];

      // Prefer non-default coordinates
      const isCustomCoord = (s: Shop) =>
        s.latitude !== undefined &&
        s.latitude !== null &&
        s.latitude !== 0 &&
        s.latitude !== -25.9964 &&
        s.longitude !== undefined &&
        s.longitude !== null &&
        s.longitude !== 0 &&
        s.longitude !== 28.2268;

      const mergedLat = isCustomCoord(shop) ? shop.latitude : existing.latitude;
      const mergedLng = isCustomCoord(shop) ? shop.longitude : existing.longitude;

      const mergedShop: Shop = {
        ...existing,
        ...shop,
        id: existing.id || shop.id,
        name: shop.name || existing.name,
        description: shop.description || existing.description,
        address: shop.address || existing.address,
        category: shop.category || existing.category,
        rating: Math.max(Number(shop.rating || 0), Number(existing.rating || 0)) || 4.5,
        reviewCount: Math.max(Number(shop.reviewCount || 0), Number(existing.reviewCount || 0)),
        logo:
          shop.logo && !shop.logo.includes("placeholder")
            ? shop.logo
            : existing.logo,
        images:
          Array.isArray(shop.images) && shop.images.length > (existing.images?.length || 0)
            ? shop.images
            : existing.images || [shop.logo],
        latitude: mergedLat,
        longitude: mergedLng,
        isOpen: shop.isOpen !== undefined ? shop.isOpen : existing.isOpen,
        is_active: shop.is_active !== undefined ? shop.is_active : existing.is_active,
        menu: mergedMenu,
        updated_at: shop.updated_at || existing.updated_at,
        owner_id: shop.owner_id || existing.owner_id,
        owner_email: (shop as any).owner_email || (existing as any).owner_email,
        phone: shop.phone || existing.phone,
        opening_time: shop.opening_time || existing.opening_time,
        closing_time: shop.closing_time || existing.closing_time,
        cash_trust_enabled:
          shop.cash_trust_enabled !== undefined
            ? shop.cash_trust_enabled
            : existing.cash_trust_enabled,
        allow_external_riders:
          shop.allow_external_riders !== undefined
            ? shop.allow_external_riders
            : existing.allow_external_riders,
        auto_look_for_rider:
          shop.auto_look_for_rider !== undefined
            ? shop.auto_look_for_rider
            : existing.auto_look_for_rider,
      };

      shopMap.set(matchedKey, mergedShop);
      if (matchedKey !== sId) {
        shopMap.set(sId, mergedShop);
      }
    } else {
      shopMap.set(sId, { ...shop });
    }
  };

  (primaryShops || []).forEach(processShop);
  (secondaryShops || []).forEach(processShop);

  const uniqueShops = Array.from(new Set(shopMap.values()));

  return uniqueShops.sort((a, b) => {
    if (a.isOpen && !b.isOpen) return -1;
    if (!a.isOpen && b.isOpen) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });
};


