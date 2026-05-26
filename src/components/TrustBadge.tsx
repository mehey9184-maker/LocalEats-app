import { memo } from 'react';
import { Clock, Star } from 'lucide-react';
import { Shop } from '../types';
import { getShopStatus } from '../utils';

export const TrustBadge = memo(({ shop }: { shop: Shop }) => {
  const status = getShopStatus(shop);
  const eta = shop.delivery_eta || "25-35 min";
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${status.isOpen ? (status.warning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600') : 'bg-gray-100 text-gray-500'}`}>
        <div className={`w-1 h-1 rounded-full ${status.isOpen ? (status.warning ? 'bg-orange-500 animate-pulse' : 'bg-green-500') : 'bg-gray-400'}`}></div>
        {status.message}
      </div>
      <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
        <Clock className="w-2.5 h-2.5" />
        {eta}
      </div>
      <div className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
        <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
        {shop.rating} Verified
      </div>
    </div>
  );
});
