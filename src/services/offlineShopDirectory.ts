/**
 * No offline menus or prices: a deliberately tiny, untrusted public directory.
 * This is NOT the pickup catalog. It contains only previously viewed approved
 * shop names and categories, never IDs, locations, photos, phones, menu prices,
 * opening hours, status, account data or orders. It must never feed ShopCard,
 * maps, quote, favorites, ordering, ratings or authoritative catalog state.
 */
import type {Shop} from "../types";

export const OFFLINE_DIRECTORY_STORAGE_KEY="localeats:public-directory:names-only:v1";
export const OFFLINE_DIRECTORY_TTL_MS=24*60*60*1000;
export const OFFLINE_DIRECTORY_MAX_SHOPS=40;
export type OfflineShopEntry={name:string;category:string};
export type OfflineShopDirectory={savedAt:number;shops:OfflineShopEntry[]};
type MinimalStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;

export function saveOfflineShopDirectory(
 shops:readonly Shop[],
 storage:MinimalStorage|undefined,
 now:number=Date.now(),
):void{
 if(!storage || !Array.isArray(shops) || !Number.isFinite(now))return;
 try{
  // A genuinely empty verified catalog invalidates yesterday's directory.
  if(shops.length===0){storage.removeItem(OFFLINE_DIRECTORY_STORAGE_KEY);return;}
  const unique=new Set<string>();
  const names:OfflineShopEntry[]=[];
  for(const shop of shops){
   if(typeof shop?.name!=="string"||!shop.name.trim())continue;
   const name=shop.name.trim().slice(0,80);
   const category=typeof shop.category==="string"?shop.category.trim().slice(0,40):"";
   const key=name.toLocaleLowerCase();
   if(unique.has(key))continue;
   unique.add(key);
   names.push({name,category});
   if(names.length>=OFFLINE_DIRECTORY_MAX_SHOPS)break;
  }
  if(names.length)storage.setItem(OFFLINE_DIRECTORY_STORAGE_KEY,JSON.stringify({savedAt:now,shops:names}));
 }catch{/* storage disabled/quota exceeded; live browsing still works */}
}

export function readOfflineShopDirectory(
 storage:MinimalStorage|undefined,
 now:number=Date.now(),
):OfflineShopDirectory|null{
 if(!storage||!Number.isFinite(now))return null;
 try{
  const raw=storage.getItem(OFFLINE_DIRECTORY_STORAGE_KEY);
  if(!raw||raw.length>12000)return null;
  const obj:unknown=JSON.parse(raw);
  if(!obj||typeof obj!=="object")return null;
  const snapshot=obj as Record<string,unknown>;
  if(typeof snapshot.savedAt!=="number"||!Number.isFinite(snapshot.savedAt)||
     snapshot.savedAt>now||now-snapshot.savedAt>=OFFLINE_DIRECTORY_TTL_MS ||
     !Array.isArray(snapshot.shops)||snapshot.shops.length>OFFLINE_DIRECTORY_MAX_SHOPS)return null;
  const entries:OfflineShopEntry[]=[];
  for(const row of snapshot.shops){
   if(!row||typeof row!=="object")return null;
   const item=row as Record<string,unknown>;
   if(typeof item.name!=="string"||item.name.length===0||item.name.length>80||
      typeof item.category!=="string"||item.category.length>40||
      Object.keys(item).some(key=>key!=="name"&&key!=="category"))return null;
   entries.push({name:item.name,category:item.category});
  }
  return entries.length?{savedAt:snapshot.savedAt,shops:entries}:null;
 }catch{return null;}
}
