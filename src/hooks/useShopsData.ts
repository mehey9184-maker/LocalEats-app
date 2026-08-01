import { useState, useCallback, useRef } from 'react';
import { Shop } from '../types';
import { supabase } from '../lib/supabase';
import { DEFAULT_FALLBACK_SHOPS } from '../App-constants';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils';
import { getCachedBusinessResults, cacheBusinessResults } from '../lib/offlineCache';
import { CircuitBreaker } from '../utils/circuitBreaker';

export interface UseShopsDataOptions {
  /** Configurable staleness threshold in milliseconds. Defaults to 30000ms (30 seconds). */
  stalenessThresholdMs?: number;
}

export function useShopsData(options: UseShopsDataOptions = {}) {
  const stalenessThresholdMs = options.stalenessThresholdMs ?? 30000;
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const lastFetchedTimeRef = useRef<number | null>(null);

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
          `[useShopsData] Cache is fresh (fetched ${Math.round(
            (now - lastFetchedTimeRef.current) / 1000
          )}s ago). Skipping redundant network request.`
        );
        return shops;
      }

      setLoadingShops(true);
      setIsSyncing(true);
      setFetchError(null);

      // Offline fallback check
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
            setShops(hydratedCached);
            setLoadingShops(false);
            setIsSyncing(false);
            lastFetchedTimeRef.current = Date.now();
            return hydratedCached;
          }
        } catch (e) {
          console.warn('Retrieving shops from offline storage failed:', e);
        }
      }

      try {
        await CircuitBreaker.execute('fetchShopsAndMenu', async () => {
          const { data: shopsData, error: shopsError } = await supabase.from('shops').select('*');

          if (shopsError) {
            const errObj = new Error(shopsError.message || 'Unknown Supabase error');
            (errObj as any).code = shopsError.code;
            (errObj as any).details = shopsError.details;
            throw errObj;
          }

          const { data: menuData, error: menuError } = await supabase
            .from('menu_items')
            .select('*');

          if (menuError) {
            throw menuError;
          }

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

          setShops(formattedShops);
          safeLocalStorageSet('cached_shops', JSON.stringify(formattedShops));
          cacheBusinessResults('all_shops', formattedShops);
          setIsOnline(true);
          lastFetchedTimeRef.current = Date.now();
        });
      } catch (err: any) {
        const cached = safeLocalStorageGet('cached_shops', null);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setShops(cached);
        } else {
          setShops(DEFAULT_FALLBACK_SHOPS);
        }
      } finally {
        setLoadingShops(false);
        setIsSyncing(false);
      }
    },
    [stalenessThresholdMs, shops]
  );

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
  };
}
