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
) {
  const verified=new Map<string,{time:number;catalog:NearbyCatalog}>();
  const pending=new Map<string,Promise<NearbyCatalog>>();

  return async (location:Point|null, options:{force?:boolean}={}):Promise<NearbyCatalog> => {
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
    if(inFlight)return inFlight;
    verified.delete(key);
    const task=(async()=>{
      const catalog=await source.shops(point);
      if(!Array.isArray(catalog.shops))throw new Error("The shop service returned an invalid catalog.");
      const menus = await Promise.all(catalog.shops.map(async shop => {
        if (!shop || typeof shop.id !== "string" || !shop.id) {
          throw new Error("The shop service returned an invalid shop.");
        }
        const menu = await source.menu(shop.id).catch(() => null);
        if (!Array.isArray(menu?.menu_items)) return null;
        return mapShop(shop, menu.menu_items);
      }));
      const shops = menus.filter((shop): shop is Shop => shop !== null);
      const incomplete = shops.length !== menus.length;
      if (incomplete && shops.length === 0) {
        throw new Error("Pickup menus could not be loaded. Please retry.");
      }
      const result = {shops, incomplete};
      if (!incomplete) {
        verified.set(key, {time: now(), catalog: result});
        while (verified.size > MAX_LOCATIONS) verified.delete(verified.keys().next().value!);
      }
      return result;
    })();
    pending.set(key,task);
    try{return await task;}
    finally{if(pending.get(key)===task)pending.delete(key);}
  };
}
