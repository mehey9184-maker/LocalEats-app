// IndexedDB offline cache manager for LocalEatsSA
// Caches local business search results, shop menus, and map tile metadata for low-data/offline performance

const DB_NAME = 'localeats_offline_cache';
const DB_VERSION = 1;

export interface CachedShopsData {
  key: string;
  shops: any[];
  timestamp: number;
}

export interface CachedTileData {
  url: string;
  dataUrl: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('business_cache')) {
        db.createObjectStore('business_cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('map_tiles')) {
        db.createObjectStore('map_tiles', { keyPath: 'url' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache local business search results / shops array in IndexedDB
 */
export async function cacheBusinessResults(key: string, shops: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('business_cache', 'readwrite');
    const store = tx.objectStore('business_cache');
    store.put({
      key,
      shops,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('IndexedDB write error for business_cache:', err);
  }
}

/**
 * Get cached business search results if available
 */
export async function getCachedBusinessResults(key: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<any[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('business_cache', 'readonly');
    const store = tx.objectStore('business_cache');
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result as CachedShopsData;
        if (record && (Date.now() - record.timestamp < maxAgeMs)) {
          resolve(record.shops);
        } else {
          resolve(record ? record.shops : null); // Return fallback cached if expired when offline
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB read error for business_cache:', err);
    return null;
  }
}

/**
 * Cache a map tile response URL or image
 */
export async function cacheMapTile(url: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('map_tiles', 'readwrite');
    const store = tx.objectStore('map_tiles');
    store.put({
      url,
      dataUrl,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('IndexedDB tile cache write error:', err);
  }
}

/**
 * Retrieve cached map tile data URL
 */
export async function getCachedMapTile(url: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('map_tiles', 'readonly');
    const store = tx.objectStore('map_tiles');

    return new Promise((resolve) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const record = request.result as CachedTileData;
        resolve(record ? record.dataUrl : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB tile cache read error:', err);
    return null;
  }
}
