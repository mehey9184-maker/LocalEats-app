import React from 'react';
import { RotateCcw, Heart, ShoppingBag, Sparkles, ArrowRight, Zap, Store } from 'lucide-react';
import { Order, Shop } from '../types';
import { formatRand } from '../utils';

interface QuickReorderWidgetProps {
  orders: Order[];
  shops: Shop[];
  favorites: string[];
  onQuickReorder: (order: Order) => void;
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
  // Get recent 4 completed or placed orders for quick 1-tap reordering
  const recentOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders
      .filter((o) => o.product_name)
      .slice(0, 5);
  }, [orders]);

  // Find favorite shops objects
  const favoriteShops = React.useMemo(() => {
    if (!favorites || favorites.length === 0 || !shops) return [];
    return shops.filter((s) => favorites.includes(s.id));
  }, [favorites, shops]);

  if (recentOrders.length === 0 && favoriteShops.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4 my-2">
      {/* Power User Quick Reorder Banner */}
      {recentOrders.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-500/20 dark:via-amber-500/15 dark:to-orange-500/10 rounded-2xl p-3.5 border border-orange-500/20 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  1-Tap Reorder
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-600/15 text-orange-600 dark:bg-orange-400/20 dark:text-orange-300">
                    Power Shortcut
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Re-up your usual order instantly</p>
              </div>
            </div>
          </div>

          {/* Horizontal scrollable reorder cards */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
            {recentOrders.map((ord) => {
              const matchingShop = shops.find((s) => s.id === ord.shop_id);
              return (
                <div
                  key={ord.id}
                  className="snap-start shrink-0 w-60 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 truncate">
                        {matchingShop?.name || 'Local Joint'}
                      </p>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {ord.quantity}x {ord.product_name}
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      {formatRand(ord.price || 0)}
                    </span>
                  </div>

                  <button
                    onClick={() => onQuickReorder(ord)}
                    className="w-full mt-2 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-orange-600/20 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reorder Now</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Favorite Local Spots Shortcuts */}
      {favoriteShops.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Favorite Spots Shortcuts ({favoriteShops.length})
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
                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-700/60 rounded-xl text-left transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                  <img
                    src={shop.logo_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=120&q=80'}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 max-w-[120px]">
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
