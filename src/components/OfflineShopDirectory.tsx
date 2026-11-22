import {Store,WifiOff} from "lucide-react";
import {useMemo} from "react";
import {readOfflineShopDirectory} from "../services/offlineShopDirectory";

/**
 * Reference-only names. Never present these as selectable real shops:
 * no live menus, prices, photos, distance, availability or ordering.
 */
export function OfflineShopDirectory(){
 const directory=useMemo(()=>{
   try{return readOfflineShopDirectory(
     typeof window==="undefined"?undefined:window.localStorage,
   );}catch{return null;}
 },[]);
 if(!directory)return null;
 return <section aria-label="Last seen shops, offline reference only"
   className="mt-6 w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-left dark:border-amber-800 dark:bg-amber-950/30">
   <div className="flex items-start gap-2">
    <WifiOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-800 dark:text-amber-200"/>
    <div>
      <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">Previously seen shops</h4>
      <p className="mt-1 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
        Saved names only, not a live menu. Reconnect to confirm shops, prices, opening times and pickup eligibility. Offline ordering is unavailable.
      </p>
    </div>
   </div>
   <ul className="mt-3 space-y-2" aria-label="Saved shop names">
    {directory.shops.map((shop,index)=><li key={index}
      className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 dark:border-amber-900 dark:bg-slate-900">
      <Store aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"/>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{shop.name}</span>
      {shop.category&&<span className="max-w-20 truncate text-xs text-slate-600 dark:text-slate-300">{shop.category}</span>}
    </li>)}
   </ul>
 </section>;
}
