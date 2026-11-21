import { memo } from 'react';
import { Clock, Star, Store } from 'lucide-react';
import type { Shop } from '../types';
import { getShopStatus } from '../utils';
import { shopRatingFacts } from '../services/catalogFacts';

export const TrustBadge = memo(({ shop }: { shop: Shop }) => {
  const status = getShopStatus(shop);
  const rating = shopRatingFacts(shop);
  // No synthetic preparation ETA, merchant verification or POPIA compliance guarantee.
  const prepTime = typeof shop.prepTime === 'string' && /^\d{1,3}(?:-\d{1,3})?\s*min$/.test(shop.prepTime.trim())
    ? shop.prepTime.trim() : null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 items-center">
      <div className={`h-5 px-2 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none border ${status.isOpen ? (status.warning ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/40 dark:text-orange-400' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400') : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? (status.warning ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-slate-400'}`} aria-hidden="true" />
        <span>{status.message}</span>
      </div>

      <div className="h-5 px-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none">
        <Store className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
        <span>Pickup at shop</span>
      </div>

      {prepTime && (
        <div className="h-5 px-2 rounded-md bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none">
          <Clock className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
          <span>{prepTime}</span>
        </div>
      )}

      {rating && (
        <div className="h-5 px-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none">
          <Star className="w-2.5 h-2.5 fill-amber-500 shrink-0" aria-hidden="true" />
          <span>{rating.rating.toFixed(1)}{rating.count !== null ? ` (${rating.count})` : ''}</span>
        </div>
      )}
    </div>
  );
});
