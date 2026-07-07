import { memo } from 'react';
import { Clock, Star } from 'lucide-react';
import { Shop } from '../types';
import { getShopStatus } from '../utils';

export const TrustBadge = memo(({ shop }: { shop: Shop }) => {
  const status = getShopStatus(shop);
  const eta = shop.delivery_eta || "25-35 min";
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 items-center">
      <div className={`h-5 px-2 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none border ${status.isOpen ? (status.warning ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400' : 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400') : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
        <div className={`w-1 h-1 rounded-full ${status.isOpen ? (status.warning ? 'bg-orange-500 animate-pulse' : 'bg-green-500') : 'bg-slate-400'}`}></div>
        <span>{status.message}</span>
      </div>
      <div className="h-5 px-2 rounded-md bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none">
        <Clock className="w-2.5 h-2.5 text-blue-500 shrink-0" />
        <span>{eta}</span>
      </div>
      <div className="h-5 px-2 rounded-md bg-yellow-50 text-amber-700 border border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900/30 dark:text-amber-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider leading-none">
        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
        <span>{shop.rating} Verified</span>
      </div>
    </div>
  );
});
