/**
 * L3-P1: Progressive public browse for customers without confirmed GPS.
 * This reader never authorizes pickup, persists catalog data, or invents
 * distances, reviews, menus or prices. Complete catalogs are cached briefly
 * in memory; partial progress remains transient and is never cached.
 */
import type {Shop} from "../types";

export const PUBLIC_BROWSE_PARALLEL_MENUS=6;
export const PUBLIC_BROWSE_MENU_TIMEOUT_MS=5000;
export const PUBLIC_BROWSE_TTL_MS=15_000;

export type PublicBrowseCatalog={shops:Shop[];incomplete:boolean};
export type PublicBrowseOptions={
  force?:boolean;
  onProgress?:(partial:PublicBrowseCatalog)=>void;
};
type Source={
  shops:()=>Promise<{shops?:unknown[]}>;
  menu:(id:string,signal:AbortSignal)=>Promise<{menu_items?:unknown[]}>;
  priorityMenu?:(id:string,signal:AbortSignal)=>Promise<{menu_items?:unknown[]}>;
};

export function createPublicBrowseCatalogReader(
  source:Source,
  mapShop:(raw:any,items:any[])=>Shop,
  settings:{parallelMenus?:number;menuTimeoutMs?:number}={},
  now:()=>number=()=>Date.now(),
) {
  const parallelMenus=Math.max(1,Math.min(8,Math.floor(settings.parallelMenus ?? PUBLIC_BROWSE_PARALLEL_MENUS)));
  const menuTimeoutMs=Math.max(1,settings.menuTimeoutMs ?? PUBLIC_BROWSE_MENU_TIMEOUT_MS);
  let verified:{time:number;catalog:PublicBrowseCatalog}|null=null;
  let pending:Promise<PublicBrowseCatalog>|null=null;
  let listeners=new Set<(partial:PublicBrowseCatalog)=>void>();

  return async ({force=false,onProgress}:PublicBrowseOptions={}):Promise<PublicBrowseCatalog>=>{
    const age=verified?now()-verified.time:Infinity;
    if(!force && verified && age>=0 && age<PUBLIC_BROWSE_TTL_MS)return verified.catalog;
    if(pending){
      if(onProgress)listeners.add(onProgress);
      return pending;
    }
    // A new network read cannot fall back to a stale menu after failure.
    verified=null;
    listeners=new Set();
    if(onProgress)listeners.add(onProgress);
    const task=(async()=>{
      const listing=await source.shops();
      if(!Array.isArray(listing.shops))throw new Error("The public shop catalog is unavailable.");
      const rawShops=listing.shops;
      const ready:Array<Shop|null>=Array(rawShops.length).fill(null);
      let next=0,validated=0;
      const readMenu=async(id:string,priority:boolean)=>{
        const controller=new AbortController();
        let deadline:ReturnType<typeof setTimeout>|undefined;
        try {
          return await Promise.race([
            (priority && source.priorityMenu ? source.priorityMenu : source.menu)(id,controller.signal),
            new Promise<never>((_,reject)=>{
              deadline=setTimeout(()=>{
                controller.abort();
                reject(new Error("Shop menu request timed out."));
              },menuTimeoutMs);
            }),
          ]);
        } finally {
          if(deadline!==undefined)clearTimeout(deadline);
        }
      };
      const worker=async()=>{
        while(true){
          const index=next++;
          if(index>=rawShops.length)return;
          const raw=rawShops[index] as Record<string,unknown>|null;
          if(!raw || typeof raw!=="object" || typeof raw.id!=="string" ||
             !raw.id || typeof raw.is_active!=="boolean")continue;
          try{
            const menu=await readMenu(raw.id,index===0);
            if(!Array.isArray(menu.menu_items))continue;
            // GPS is unknown. Never claim distance or pickup eligibility.
            ready[index]=mapShop({...raw,distance_km:undefined},menu.menu_items);
            validated++;
            // Render first verified shop immediately, then batch progress.
            if(validated===1 || validated%4===0){
              const partial={shops:ready.filter((shop):shop is Shop=>shop!==null),incomplete:true};
              for(const notify of listeners){
                try{notify(partial);}catch{/* UI updates cannot invalidate catalog data. */}
              }
            }
          }catch{/* Never fabricate a missing/broken menu. */}
        }
      };
      await Promise.all(Array.from(
        {length:Math.min(parallelMenus,rawShops.length)},
        ()=>worker(),
      ));
      const shops=ready.filter((shop):shop is Shop=>shop!==null);
      const incomplete=shops.length!==rawShops.length;
      if(incomplete && shops.length===0 && rawShops.length>0)
        throw new Error("Shop menus could not be loaded. Please retry.");
      return {shops,incomplete};
    })();
    pending=task;
    try{
      const result=await task;
      if(!result.incomplete)verified={time:now(),catalog:result};
      return result;
    }finally{
      if(pending===task){pending=null;listeners.clear();}
    }
  };
}
