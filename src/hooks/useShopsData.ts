import { useState, useCallback, useRef, useEffect } from 'react';
import { Shop } from '../types';
import { supabase } from '../lib/supabase';
import { FirestoreService } from '../lib/firebase';
import { DEFAULT_FALLBACK_SHOPS } from '../App-constants';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils';
import { getCachedBusinessResults, cacheBusinessResults } from '../lib/offlineCache';
import { CircuitBreaker } from '../utils/circuitBreaker';

export interface UseShopsDataOptions {
  /** Configurable staleness threshold in milliseconds. Defaults to 60000ms (1 minute). */
  stalenessThresholdMs?: number;
}

export function useShopsData(options: UseShopsDataOptions = {}) {
  const stalenessThresholdMs = options.stalenessThresholdMs ?? 60000;
  
  const [shops, setShops] = useState<Shop[]>([]);
  // loadingShops indicates initial hard loading (no data yet)
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  // isSyncing indicates background revalidation
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  const lastFetchedTimeRef = useRef<number | null>(null);
  const inFlightRequestRef = useRef<Promise<any> | null>(null);

  const invalidateCache = useCallback(() => {
    lastFetchedTimeRef.current = null;
  }, []);

  const fetchShopsData = useCallback(
    async (retries = 3, force = false) => {
      const now = Date.now();

      // Staleness check: If not forced and last fetch occurred within threshold, skip network call
      if (
        !force &&
        lastFetchedTimeRef.current !== null &&
        now - lastFetchedTimeRef.current < stalenessThresholdMs &&
        shops.length > 0
      ) {
        console.log(
          `[SWR Catalog] Cache is fresh (fetched ${Math.round(
            (now - lastFetchedTimeRef.current) / 1000
          )}s ago). Skipping redundant network request.`
        );
        return shops;
      }

      // Prevent concurrent duplicate background fetches
      if (inFlightRequestRef.current) {
        console.log('[SWR Catalog] Deduplicating in-flight fetch request.');
        return inFlightRequestRef.current;
      }

      const fetchPromise = (async () => {
        let currentShops = shops;
        
        // 1. SWR Phase 1: Stale (Immediate Cache Hit)
        // If we don't have shops loaded yet, try to load from persistent cache first
        if (currentShops.length === 0) {
          try {
            const idbCached = await getCachedBusinessResults('all_shops');
            const cached = idbCached || safeLocalStorageGet('cached_shops', null);
            if (cached && Array.isArray(cached) && cached.length > 0) {
              const hydratedCached = cached.map((s: Shop) => {
                if (!s.menu || s.menu.length === 0) {
                  const matchedFallback =
                    DEFAULT_FALLBACK_SHOPS.find(
                      (f) =>
                        f.category?.toLowerCase() === s.category?.toLowerCase() ||
                        f.name.toLowerCase() === s.name.toLowerCase()
                    ) || DEFAULT_FALLBACK_SHOPS[0];
                  return {
                    ...s,
                    menu: matchedFallback.menu || [],
                  };
                }
                return s;
              });
              
              console.log('[SWR Catalog] STALE: Hydrated from persistent cache', hydratedCached.length, 'shops');
              setShops(hydratedCached);
              currentShops = hydratedCached;
              
              // We have stale data, so we don't need a hard loading screen
              setLoadingShops(false);
            }
          } catch (e) {
            console.warn('[SWR Catalog] Failed to read stale cache:', e);
          }
        }

        // 2. SWR Phase 2: Revalidate (Background Network Fetch)
        // If offline and we already have some data, just abort the background fetch
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false);
          setLoadingShops(false);
          return currentShops;
        }

        setIsSyncing(true);
        setFetchError(null);
        
        // Only show hard loading spinner if we have absolutely no stale data
        if (currentShops.length === 0) {
          setLoadingShops(true);
        }

        try {
          await CircuitBreaker.execute('fetchShopsAndMenu', async () => {
            // Priority 1: Query shared Firestore database (merchant app instance)
            let firestoreShops: Shop[] = [];
            try {
              firestoreShops = await FirestoreService.getShops();
            } catch (e) {
              console.debug('[FirestoreService] fetch error:', e);
            }

            if (firestoreShops && firestoreShops.length > 0) {
              console.log('[Firestore] Loaded', firestoreShops.length, 'live shops from Firestore');
              setShops(firestoreShops);
              safeLocalStorageSet('cached_shops', JSON.stringify(firestoreShops));
              cacheBusinessResults('all_shops', firestoreShops);
              setIsOnline(true);
              lastFetchedTimeRef.current = Date.now();
              return firestoreShops;
            }

            // Priority 2: Query Supabase
            const { data: shopsData, error: shopsError } = await supabase
              .from('shops')
              .select('id, name, description, location, category, rating, logo_url, opening_time, closing_time, phone, latitude, longitude, cash_trust_enabled, allow_external_riders, auto_look_for_rider, is_active, owner_id, updated_at');

            if (shopsError) throw shopsError;

            const { data: menuData, error: menuError } = await supabase
              .from('menu_items')
              .select('id, shop_id, name, price, description, image_url, category, is_available, customizations');
            if (menuError) throw menuError;

            if (shopsData && shopsData.length === 0) {
              setShops(DEFAULT_FALLBACK_SHOPS);
              safeLocalStorageSet('cached_shops', JSON.stringify(DEFAULT_FALLBACK_SHOPS));
              setLoadingShops(false);
              setIsSyncing(false);
              lastFetchedTimeRef.current = Date.now();
              return;
            }

            const formattedShops: Shop[] = (shopsData || [])
              .map((s) => {
                const shopHash = Math.abs(
                  String(s.id)
                    .split('')
                    .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
                );
                return {
                  id: String(s.id),
                  name: s.name,
                  logo: s.logo_url || DEFAULT_FALLBACK_SHOPS[0].logo,
                  rating: Number(s.rating) || 4.5,
                  cash_trust_enabled:
                    s.cash_trust_enabled === true || s.cash_trust_enabled === 'true',
                  allow_external_riders:
                    s.allow_external_riders === true || s.allow_external_riders === 'true',
                  auto_look_for_rider:
                    s.auto_look_for_rider === true || s.auto_look_for_rider === 'true',
                  reviewCount: 12 + (shopHash % 88),
                  prepTime: '15-20 min',
                  isOpen: true,
                  description: s.description || 'Local Flavours',
                  address: s.location || 'Local Eats',
                  category: s.category || 'Kota',
                  owner_id: s.owner_id,
                  owner_email: (s as any).owner_email || (s as any).created_by,
                  is_test: (s as any).is_test === true || (s as any).is_test_store === true,
                  is_test_store: (s as any).is_test_store === true,
                  is_private: (s as any).is_private === true,
                  opening_time: s.opening_time,
                  closing_time: s.closing_time,
                  phone: s.phone || '+27 12 345 6789',
                  latitude: s.latitude || -25.9964,
                  longitude: s.longitude || 28.2268,
                  updated_at: s.updated_at,
                  is_active: s.is_active !== false,
                  images: (s as any).images || [DEFAULT_FALLBACK_SHOPS[0].logo],
                  menu: (menuData || [])
                    .filter((m) => String(m.shop_id) === String(s.id))
                    .map((m) => ({
                      id: String(m.id),
                      name: m.name,
                      price: Number(m.price),
                      displayPrice: `R${Number(m.price).toFixed(2)}`,
                      image: m.image_url || DEFAULT_FALLBACK_SHOPS[0].menu[0]?.image,
                      description: m.description || '',
                      category: m.category || 'Main Course',
                      is_available: m.is_available !== false,
                      customizations: m.customizations || [],
                    })),
                };
              })
              .sort((a, b) => (b.rating || 0) - (a.rating || 0));

            // SWR Phase 3: Refresh UI with the newly fetched data
            console.log('[SWR Catalog] REVALIDATE: Seamlessly updating UI with fresh network data');
            setShops(formattedShops);
            safeLocalStorageSet('cached_shops', JSON.stringify(formattedShops));
            cacheBusinessResults('all_shops', formattedShops);
            
            setIsOnline(true);
            lastFetchedTimeRef.current = Date.now();
            return formattedShops;
          });
        } catch (err: any) {
          const errStr = (err?.message || String(err)).toLowerCase();
          const isTransient =
            errStr.includes("failed to fetch") ||
            errStr.includes("network") ||
            errStr.includes("schema cache") ||
            errStr.includes("retrying") ||
            errStr.includes("circuit breaker") ||
            errStr.includes("pgrst");

          if (!isTransient) {
            console.info('[SWR Catalog] Background revalidation note:', err?.message || err);
          } else {
            console.info('[SWR Catalog] Background revalidation transient note. Retaining cached data.');
          }
          setFetchError(null);
          
          if (currentShops.length === 0) {
            const cached = safeLocalStorageGet('cached_shops', null);
            if (cached && Array.isArray(cached) && cached.length > 0) {
              setShops(cached);
            } else {
              setShops(DEFAULT_FALLBACK_SHOPS);
            }
          }
        } finally {
          setLoadingShops(false);
          setIsSyncing(false);
          inFlightRequestRef.current = null;
        }
        
        return shops;
      })();

      inFlightRequestRef.current = fetchPromise;
      return fetchPromise;
    },
    [stalenessThresholdMs, shops]
  );

  // Set up real-time listener to Firestore shops
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = FirestoreService.listenToShops((liveShops) => {
        if (liveShops && liveShops.length > 0) {
          console.log('[Firestore] Live shop updates received:', liveShops.length);
          setShops(liveShops);
          safeLocalStorageSet('cached_shops', JSON.stringify(liveShops));
          cacheBusinessResults('all_shops', liveShops);
          setLoadingShops(false);
        }
      });
    } catch (e) {
      console.debug('[Firestore] Listener init notice:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const seedDemoShops = useCallback(async () => {
    setLoadingShops(true);
    await FirestoreService.seedDemoShopsIfEmpty();
    const fresh = await FirestoreService.getShops();
    const shopsToSet = fresh.length > 0 ? fresh : DEFAULT_FALLBACK_SHOPS;
    setShops(shopsToSet);
    safeLocalStorageSet('cached_shops', JSON.stringify(shopsToSet));
    cacheBusinessResults('all_shops', shopsToSet);
    setLoadingShops(false);
  }, []);

  return {
    shops,
    setShops,
    loadingShops,
    fetchError,
    isSyncing,
    isOnline,
    lastFetchedTime: lastFetchedTimeRef.current,
    fetchShopsData,
    invalidateCache,
    seedDemoShops,
  };
}
