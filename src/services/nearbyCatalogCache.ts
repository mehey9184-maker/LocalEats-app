/**
 * Verified public pickup catalog cache.
 *
 * Never persists precise locations, menu prices, authenticated responses or
 * availability to browser storage. The authoritative server still owns the
 * current catalog and every checkout quote.
 */
import type {Shop} from "../types";

type Point={lat:number;lng:number};
export type NearbyCatalog = {shops: Shop[]; incomplete: boolean};
type PublicSource={
  shops:(point:Point)=>Promise<{shops?:Array<{id:string}>}>;
  menu:(id:string)=>Promise<{menu_items?:unknown[]}>;
};
export const NEARBY_CATALOG_TTL_MS=15_000;
export const NEARBY_CATALOG_PARALLEL_MENUS=6;
export const NEARBY_CATALOG_MENU_TIMEOUT_MS=6_000;
const MAX_LOCATIONS=3;

export function nearbyCatalogKey(point:Point|null):string|null {
  if(!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
     Math.abs(point.lat)>90 || Math.abs(point.lng)>180)return null;
  // Exact coordinates, not broad geohash buckets: a 4 km boundary must not
  // inherit nearby results from a different location.
  return `${point.lat}:${point.lng}`;
}

export function createNearbyCatalogReader(
  source:PublicSource,
  mapShop:(shop:any,menu:any[])=>Shop,
  now:()=>number=()=>Date.now(),
  settings:{parallelMenus?:number;menuTimeoutMs?:number}={},
) {
  const parallelMenus=Math.max(1,Math.min(8,Math.floor(settings.parallelMenus ?? NEARBY_CATALOG_PARALLEL_MENUS)));
  const menuTimeoutMs=Math.max(1,settings.menuTimeoutMs ?? NEARBY_CATALOG_MENU_TIMEOUT_MS);
  const verified=new Map<string,{time:number;catalog:NearbyCatalog}>();
  const pending=new Map<string,Promise<NearbyCatalog>>();
  // Overlapping same-location reloads share network requests *and* verified progress.
  const listeners=new Map<string,Set<(partial:NearbyCatalog)=>void>>();

  return async (location:Point|null, options:{force?:boolean;onProgress?:(partial:NearbyCatalog)=>void}={}):Promise<NearbyCatalog> => {
    const key=nearbyCatalogKey(location);
    if(!key || !location)throw new Error("Allow your real location to find available pickup shops within 4 km.");
    const point=location;
    const cached=verified.get(key);
    const age=cached ? now()-cached.time : Infinity;
    if(cached && (age<0 || age>=NEARBY_CATALOG_TTL_MS))verified.delete(key);
    if(!options.force && cached && age>=0 && age<NEARBY_CATALOG_TTL_MS)return cached.catalog;

    // React effects, focus and manual refreshes may overlap. Coalesce without
    // showing a cached response whose freshness has expired.
    const inFlight=pending.get(key);
    if(inFlight){
      if(options.onProgress)listeners.get(key)?.add(options.onProgress);
      return inFlight;
    }
    verified.delete(key);
    const callbacks=new Set<(partial:NearbyCatalog)=>void>();
    if(options.onProgress)callbacks.add(options.onProgress);
    listeners.set(key,callbacks);
    const task=(async()=>{
      const catalog=await source.shops(point);
      if(!Array.isArray(catalog.shops))throw new Error("The shop service returned an invalid catalog.");
      // Keep original distance ordering, omit malformed menus and bound fan-out
      // for customers on slow connections. Only complete results enter the cache.
      const ready:(Shop|null)[]=Array(catalog.shops.length).fill(null);
      let next=0,validated=0;
      const worker=async()=>{
        while(true){
          const index=next++;
          if(index>=catalog.shops.length)return;
          const shop=catalog.shops[index];
          if(!shop || typeof shop.id!=="string" || !shop.id)continue;
          let timeout:ReturnType<typeof setTimeout>|undefined;
          try{
            const menu=await Promise.race([
              source.menu(shop.id),
              new Promise<never>((_,reject)=>{
                timeout=setTimeout(()=>reject(new Error("Pickup menu timed out.")),menuTimeoutMs);
              }),
            ]);
            if(!Array.isArray(menu?.menu_items))continue;
            const mapped=mapShop(shop,menu.menu_items);
            ready[index]=mapped;
            validated++;
            // First card is immediate; batching later updates avoids a React
            // re-render for every image/menu on a large catalog.
            if(validated===1 || validated%4===0){
              const partial={shops:ready.filter((item):item is Shop=>item!==null),incomplete:true};
              for(const notify of callbacks){
                try{notify(partial);}catch{/* UI progress must not invalidate verified catalog data. */}
              }
            }
          }catch{
            // A stalled, missing or invalid menu never becomes a fake shop.
          }finally{
            if(timeout!==undefined)clearTimeout(timeout);
          }
        }
      };
      await Promise.all(Array.from(
        {length:Math.min(parallelMenus,catalog.shops.length)},
        ()=>worker(),
      ));
      const shops=ready.filter((shop):shop is Shop=>shop!==null);
      const incomplete=shops.length!==catalog.shops.length;
      if(incomplete && shops.length===0)
        throw new Error("Pickup menus could not be loaded. Please retry.");
      const result={shops,incomplete};
      if(!incomplete){
        verified.set(key,{time:now(),catalog:result});
        while(verified.size>MAX_LOCATIONS)verified.delete(verified.keys().next().value!);
      }
      return result;
    })();
    pending.set(key,task);
    try{return await task;}
    finally{
      if(pending.get(key)===task){pending.delete(key);listeners.delete(key);}
    }
  };
}
