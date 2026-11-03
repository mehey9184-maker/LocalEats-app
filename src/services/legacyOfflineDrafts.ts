/**
 * Keep legacy unsent order drafts when an account changes.
 *
 * This is a LOCAL support archive only: it does not authenticate, upload,
 * replay or represent orders. The legacy queue is never a source of truth.
 * If localStorage is unavailable/at quota, do not remove anything.
 */
export const LEGACY_ORDER_QUEUE_KEY="offline_orders_queue";
export function archiveLegacyOrderDrafts(
  previousUid:string|undefined|null,
  storage:Pick<Storage,"getItem"|"setItem"|"removeItem">,
):boolean{
  if(!previousUid || !/^[a-zA-Z0-9:_-]{1,128}$/.test(previousUid))return false;
  try{
    const raw=storage.getItem(LEGACY_ORDER_QUEUE_KEY);
    if(!raw)return false;
    const rows=JSON.parse(raw);
    if(!Array.isArray(rows)||rows.length===0)return false;
    const key="localeats_unsent_order_drafts_"+previousUid;
    const archivedRaw=storage.getItem(key);
    const old=archivedRaw?JSON.parse(archivedRaw):[];
    if(!Array.isArray(old))return false;
    const byId=new Map<string,unknown>();
    for(const row of [...old,...rows]){
      if(!row || typeof row!=="object" || Array.isArray(row))continue;
      const id=(row as {id?:unknown}).id;
      if(typeof id!=="string"||!id)continue;
      if(!byId.has(id))byId.set(id,row);
    }
    if(byId.size===0)return false;
    const saved=JSON.stringify([...byId.values()]);
    storage.setItem(key,saved);
    if(storage.getItem(key)!==saved)return false;
    storage.removeItem(LEGACY_ORDER_QUEUE_KEY);
    return true;
  }catch{
    return false;
  }
}
