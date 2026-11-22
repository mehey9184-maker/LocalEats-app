/**
 * L3-P1: Progressive public browse for customers without confirmed GPS.
 *
 * Display only validated public shop/menu pairs as they arrive. This reader
 * never authorizes a pickup, persists catalog data, or fabricates menu items.
 * Bounded network concurrency avoids exhausting low-end phones/connections.
 */
import type {Shop} from "../types";

export const PUBLIC_BROWSE_PARALLEL_MENUS = 6;
export const PUBLIC_BROWSE_MENU_TIMEOUT_MS = 5000;

export type PublicBrowseCatalog = {shops:Shop[];incomplete:boolean};
export type PublicBrowseOptions = {onProgress?:(partial:PublicBrowseCatalog)=>void};
type Source = {
  shops:()=>Promise<{shops?:unknown[]}>;
  menu:(id:string, signal:AbortSignal)=>Promise<{menu_items?:unknown[]}>;
};

export function createPublicBrowseCatalogReader(
  source:Source,
  mapShop:(raw:any, items:any[])=>Shop,
  settings:{parallelMenus?:number; menuTimeoutMs?:number}={},
) {
  const parallelMenus = Math.max(1,Math.min(8,Math.floor(settings.parallelMenus ?? PUBLIC_BROWSE_PARALLEL_MENUS)));
  const menuTimeoutMs = Math.max(1,settings.menuTimeoutMs ?? PUBLIC_BROWSE_MENU_TIMEOUT_MS);
  return async ({onProgress}:PublicBrowseOptions={}):Promise<PublicBrowseCatalog> => {
    const listing=await source.shops();
    if(!Array.isArray(listing.shops))throw new Error("The public shop catalog is unavailable.");
    const rawShops=listing.shops;
    const verified:Array<Shop|null>=Array(rawShops.length).fill(null);
    let cursor=0;

    const readMenu=async (id:string) => {
      const controller=new AbortController();
      let deadline:ReturnType<typeof setTimeout>|undefined;
      try {
        return await Promise.race([
          source.menu(id,controller.signal),
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
        const index=cursor++;
        if(index>=rawShops.length)return;
        const raw=rawShops[index] as Record<string,unknown>|null;
        if(!raw || typeof raw!=="object" || typeof raw.id!=="string" ||
            !raw.id || typeof raw.is_active!=="boolean")continue;
        try {
          const menu=await readMenu(raw.id);
          if(!Array.isArray(menu.menu_items))continue;
          // Missing GPS is represented by unknown distance: browsing is safe,
          // but add-to-cart and authoritative quote remain location gated.
          verified[index]=mapShop({...raw,distance_km:undefined},menu.menu_items);
          if(onProgress){
            const ready=verified.filter((shop):shop is Shop=>shop!==null);
            if(ready.length)onProgress({shops:ready,incomplete:true});
          }
        }catch{
          // Do not render an unverified menu or invent a substitute item.
        }
      }
    };
    await Promise.all(Array.from(
      {length:Math.min(parallelMenus,rawShops.length)},
      ()=>worker(),
    ));
    const shops=verified.filter((shop):shop is Shop=>shop!==null);
    const incomplete=shops.length!==rawShops.length;
    if(incomplete && shops.length===0 && rawShops.length>0)
      throw new Error("Shop menus could not be loaded. Please retry.");
    return {shops,incomplete};
  };
}
