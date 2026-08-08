import React from 'react';
import { RotateCcw, Heart, Zap, ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { Order, Shop } from '../types';
import { formatRand } from '../utils';
import { BlurUpImage } from './BlurUpImage';

interface QuickReorderWidgetProps {
  orders: Order[];
  shops: Shop[];
  favorites: string[];
  onQuickReorder: (itemData: { product_name: string; price: number; quantity: number; shop_id: string }) => void;
  onSelectShop: (shop: Shop) => void;
  onViewAllFavorites?: () => void;
}

export const QuickReorderWidget: React.FC<QuickReorderWidgetProps> = ({
  orders,
  shops,
  favorites,
  onQuickReorder,
  onSelectShop,
  onViewAllFavorites,
}) => {
  // Compute Most Frequently Purchased Items across all past orders
  const topFrequentItems = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const frequencyMap: Record<string, {
      product_name: string;
      shop_id: string;
      price: number;
      quantity: number;
      orderCount: number;
      lastOrderedAt: string;
    }> = {};

    orders.forEach((o) => {
      if (!o.product_name) return;
      const key = `${o.shop_id}_${o.product_name.toLowerCase().trim()}`;
      if (!frequencyMap[key]) {
        frequencyMap[key] = {
          product_name: o.product_name,
          shop_id: o.shop_id,
          price: o.price || 0,
          quantity: o.quantity || 1,
          orderCount: 1,
          lastOrderedAt: o.created_at || new Date().toISOString(),
        };
      } else {
        frequencyMap[key].orderCount += 1;
        // Keep highest price / latest quantity
        if (o.price && o.price > 0) frequencyMap[key].price = o.price;
        if (o.created_at && o.created_at > frequencyMap[key].lastOrderedAt) {
          frequencyMap[key].lastOrderedAt = o.created_at;
        }
      }
    });

    // Sort by order frequency descending, then by last ordered timestamp
    return Object.values(frequencyMap)
      .sort((a, b) => b.orderCount - a.orderCount || new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime())
      .slice(0, 6);
  }, [orders]);

  // Find favorite shops objects
  const favoriteShops = React.useMemo(() => {
    if (!favorites || favorites.length === 0 || !shops) return [];
    return shops.filter((s) => favorites.includes(s.id));
  }, [favorites, shops]);

  if (topFrequentItems.length === 0 && favoriteShops.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3.5 my-2">
      {/* 1-Tap Quick Reorder Section for Most Frequently Purchased Items */}
      {topFrequentItems.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-500/20 dark:via-amber-500/15 dark:to-slate-900 rounded-2xl p-4 border border-orange-500/20 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
                  <span>Quick Reorder</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-600 text-white">
                    Top Cravings
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Re-order your most frequently purchased meals in 1 tap</p>
              </div>
            </div>
          </div>

          {/* Horizontal scrollable reorder cards */}
          <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-none snap-x">
            {topFrequentItems.map((item) => {
              const matchingShop = shops.find((s) => s.id === item.shop_id);
              return (
                <div
                  key={`${item.shop_id}-${item.product_name}`}
                  className="snap-start shrink-0 w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 truncate uppercase tracking-wider">
                          {matchingShop?.name || 'Local Joint'}
                        </p>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-orange-600 transition-colors">
                          {item.product_name}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                        {formatRand(item.price || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 my-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/50">
                        <ShoppingBag className="w-3 h-3 text-orange-500" />
                        Ordered {item.orderCount}×
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onQuickReorder({
                      product_name: item.product_name,
                      price: item.price,
                      quantity: 1,
                      shop_id: item.shop_id,
                    })}
                    className="w-full mt-2.5 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reorder in 1 Tap</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Favorite Local Spots Shortcuts */}
      {favoriteShops.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Favorite Spots ({favoriteShops.length})
              </h3>
            </div>
            {onViewAllFavorites && (
              <button
                onClick={onViewAllFavorites}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {favoriteShops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => onSelectShop(shop)}
                className="shrink-0 flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-700/60 rounded-xl text-left transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                  <BlurUpImage
                    src={shop.logo_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=120&q=80'}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0 max-w-[130px]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400">
                    {shop.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {shop.category || 'Kota Joint'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
