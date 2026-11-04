/**
 * Verified public pickup catalog cache.
 *
 * Never persists precise locations, menu prices, authenticated responses or
 * availability to browser storage. The authoritative server still owns the
 * current catalog and every checkout quote.
 */
import {mapPickupShop, requireRealLocation} from "./pickupMapping";
import type {Shop} from "../types";

type Point={lat:number;lng:number};
type PublicSource={
  shops:(point:Point)=>Promise<{shops?:Array<{id:string;[key:string]:unknown}>}>;
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
  now:()=>number=()=>Date.now(),
) {
  const verified=new Map<string,{time:number;shops:Shop[]}>();
  const pending=new Map<string,Promise<Shop[]>>();

  return async (location:Point|null, options:{force?:boolean}={}):Promise<Shop[]> => {
    const point=requireRealLocation(location);
    const key=nearbyCatalogKey(point)!;
    const cached=verified.get(key);
    const age=cached ? now()-cached.time : Infinity;
    if(cached && (age<0 || age>=NEARBY_CATALOG_TTL_MS))verified.delete(key);
    if(!options.force && cached && age>=0 && age<NEARBY_CATALOG_TTL_MS)return cached.shops;

    // React effects, focus and manual refreshes may overlap. Coalesce without
    // showing a cached response whose freshness has expired.
    const inFlight=pending.get(key);
    if(inFlight)return inFlight;
    const task=(async()=>{
      const catalog=await source.shops(point);
      if(!Array.isArray(catalog.shops))throw new Error("The shop service returned an invalid catalog.");
      const result=await Promise.all(catalog.shops.map(async shop=>{
        if(!shop || typeof shop.id!=="string" || !shop.id)throw new Error("The shop service returned an invalid shop.");
        const menu=await source.menu(shop.id);
        if(!Array.isArray(menu.menu_items))throw new Error("The menu service returned an invalid menu.");
        return mapPickupShop(shop,menu.menu_items);
      }));
      verified.delete(key);
      verified.set(key,{time:now(),shops:result});
      while(verified.size>MAX_LOCATIONS)verified.delete(verified.keys().next().value!);
      return result;
    })();
    pending.set(key,task);
    try{return await task;}
    finally{if(pending.get(key)===task)pending.delete(key);}
  };
}
