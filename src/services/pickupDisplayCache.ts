import type {AppNotification, Shop} from "../types";

type Store = Pick<Storage,"getItem"|"setItem">;
type Point={lat:number;lng:number};

const CATALOG_KEY="localeats:pickup-public-catalog:v1";
const CATALOG_MAX_AGE=5*60*1000;
const INBOX_MAX_AGE=15*60*1000;

function storeOrNull(store?:Store):Store|null {
 try {return store ?? (typeof sessionStorage==="undefined"?null:sessionStorage);}catch{return null;}
}

export function distanceKm(a:Point,b:Point):number {
 const rad=Math.PI/180;
 const dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;
 const k=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(k),Math.sqrt(Math.max(0,1-k)));
}
function validPoint(point:Point|null|undefined):point is Point {
 return Boolean(point && Number.isFinite(point.lat) && Math.abs(point.lat)<=90 &&
  Number.isFinite(point.lng) && Math.abs(point.lng)<=180);
}
function withinRadius(shop:Shop,point:Point):boolean {
 const lat=Number(shop.latitude),lng=Number(shop.longitude);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&distanceKm({lat,lng},point)<=4;
}

// Previously verified API catalog for display only. Does not grant checkout,
// shop availability or prices; the authenticated API revalidates all actions.
export function readDisplayCatalog(point:Point|null,store?:Store,now=Date.now()):Shop[]|null {
 if(!validPoint(point))return null;
 try{
  const raw=storeOrNull(store)?.getItem(CATALOG_KEY);
  if(!raw)return null;
  const entry=JSON.parse(raw);
  if(entry?.version!==1 || !Number.isFinite(entry.savedAt) || entry.savedAt>now ||
     now-entry.savedAt>CATALOG_MAX_AGE || !validPoint(entry.location) ||
     distanceKm(entry.location,point)>0.15 || !Array.isArray(entry.shops))return null;
  // Do not turn an empty response into fake shops.
  if(entry.shops.some((s:Shop)=>!s || typeof s.id!=="string" ||
     typeof s.name!=="string" || !Array.isArray(s.menu) ||
     !s.menu.every((m:any)=>typeof m.id==="string"&&typeof m.name==="string"&&Number.isFinite(m.price)&&m.price>=0)))return null;
  return (entry.shops as Shop[]).filter(s=>withinRadius(s,point));
 }catch{return null;}
}
export function saveDisplayCatalog(point:Point|null,shops:Shop[],store?:Store,now=Date.now()):void {
 if(!validPoint(point)||!Array.isArray(shops))return;
 try{
  // Public items only; the stored location is rounded to ~100m and stays in tab-scoped storage.
  const location={lat:Math.round(point.lat*1000)/1000,lng:Math.round(point.lng*1000)/1000};
  storeOrNull(store)?.setItem(CATALOG_KEY,JSON.stringify({
   version:1,savedAt:now,location,shops:shops.filter(s=>withinRadius(s,point)).slice(0,80),
  }));
 }catch{/* Cache failure does not affect the API. */}
}

function inboxKey(userId:string):string {return "localeats:pickup-inbox:v1:"+encodeURIComponent(userId);}
export function readDisplayInbox(userId:string,store?:Store,now=Date.now()):AppNotification[]|null {
 if(!userId)return null;
 try{
  const raw=storeOrNull(store)?.getItem(inboxKey(userId));if(!raw)return null;
  const entry=JSON.parse(raw);
  if(entry?.version!==1||entry.userId!==userId||!Number.isFinite(entry.savedAt)||
     entry.savedAt>now||now-entry.savedAt>INBOX_MAX_AGE||!Array.isArray(entry.items))return null;
  if(entry.items.some((item:AppNotification)=>!item||typeof item.id!=="string"||
     typeof item.title!=="string"||typeof item.message!=="string"||
     typeof item.timestamp!=="number"||!Number.isFinite(item.timestamp)||
     typeof item.read!=="boolean"))return null;
  return (entry.items as AppNotification[]).slice(0,50);
 }catch{return null;}
}
export function saveDisplayInbox(userId:string,items:AppNotification[],store?:Store,now=Date.now()):void {
 if(!userId||!Array.isArray(items))return;
 try{storeOrNull(store)?.setItem(inboxKey(userId),JSON.stringify({
  version:1,userId,savedAt:now,items:items.slice(0,50),
 }));}catch{/* Cache failure does not affect authorized reads. */}
}
