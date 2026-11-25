import {createReadBackoff} from "../services/readBackoff.ts";
export type PickupOrder = {id:string;shop_id:string;user_id:string;status:string;delivery_type:string;delivery_status:string;
 payment_status:string;payment_method:string;revision:number;customer_name:string;phone:string;total_price:number;
 items:{menu_item_id:string;name:string;quantity:number;unit_price:number;line_total:number}[];created_at:string};
export type PickupOrderEvent = {id:string;kind:string;revision:number;occurred_at:string;details?:{
 reason?:string;amount?:unknown;currency?:unknown;method?:unknown;
}};
export type PickupOrderDetail = {order?:PickupOrder;events?:PickupOrderEvent[]};
export type PickupHistoryBefore = Pick<PickupOrder, "id" | "created_at">;
export type PickupHistoryPage = {orders:PickupOrder[];has_more:boolean};
export type Location = {lat:number;lng:number};
export class PickupApiError extends Error {
 status:number; code:string;
 constructor(status:number,code:string,message:string) {super(message);this.status=status;this.code=code;}
}
export type PickupQuote={can_submit?:boolean;lines:{menu_item_id:string;name:string;quantity:number;unit_minor:number;line_minor:number}[];total_minor:number;service_fee_minor:number;delivery_fee_minor?:number;discount_minor?:number;tip_minor?:number;subtotal_minor:number;pricing_fingerprint:string};
type ApiResponse=PickupOrderDetail & {success?:boolean;code?:string;error?:string;replayed?:boolean;orders?:PickupOrder[];
 shops?:{id:string;name:string;location:string;distance_km?:number;lat?:number;lng?:number;latitude?:number;longitude?:number;is_active?:boolean}[];
 menu_items?:{id:string;name:string;price:number;is_available:boolean}[];quote?:PickupQuote;
 notifications?:{id:string;order_id:string}[];menus?:unknown[]};
export function pickupApiOrigin(baseUrl:string,requireExplicitHttps=false):string {
 const value=baseUrl.trim();
 if (!value && !requireExplicitHttps) return ""; // Local Vite proxy / explicit development fixtures only.
 try {
  const url=new URL(value);
  const loopback=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(url.username || url.password || url.pathname!=="/" || url.search || url.hash ||
    (url.protocol!=="https:" && !(url.protocol==="http:" && loopback && !requireExplicitHttps)) ||
    (requireExplicitHttps && loopback)) throw new Error("invalid origin");
  return url.origin;
 } catch {
  throw new PickupApiError(503,"API_CONFIGURATION_INVALID","Ordering service is not configured. Please try again later.");
 }
}
export function createPickupApi(baseUrl:string,token:()=>Promise<string>,transport:typeof fetch=fetch,
 options:{requireExplicitHttps?:boolean;batchCatalogMenus?:boolean;now?:()=>number}={}) {
 const readBackoff=createReadBackoff(options.now);
 const request=async(path:string,method="GET",body?:unknown,publicRead=false,signal?:AbortSignal):Promise<ApiResponse>=>{
   const readScope=path.startsWith("/api/v1/catalog/")?"catalog":path.startsWith("/api/v1/notifications")?"notifications":"orders";
   if(method==="GET" && readBackoff.remaining(readScope)>0)throw new PickupApiError(429,"RATE_LIMITED","Too many requests. Please try again later.");
   const origin=pickupApiOrigin(baseUrl,options.requireExplicitHttps);
   const bearer=publicRead ? "" : await token();
   signal?.throwIfAborted();
   if(!publicRead && !bearer) throw new PickupApiError(401,"UNAUTHORIZED","Sign in again to continue.");
   let response:Response;
   try {response=await transport(origin+path,{method,cache:"no-store",...(signal ? {signal} : {}),
     headers:{"Content-Type":"application/json",...(bearer ? {Authorization:"Bearer fb-"+bearer} : {})},
     ...(body===undefined ? {} : {body:JSON.stringify(body)})});}
   catch {signal?.throwIfAborted();throw new PickupApiError(0,"CONNECTION_LOST","Connection lost. The outcome may be unknown. Retry the same request.");}
   if(method==="GET")readBackoff.observe(readScope,response.status,response.headers?.get("Retry-After")??null);
   let result:ApiResponse;
   try {result=await response.json();} catch {signal?.throwIfAborted();throw new PickupApiError(response.status,"INVALID_RESPONSE","The service returned an invalid response.");}
   if(!response.ok || result?.success!==true) throw new PickupApiError(response.status,result?.code ?? "REQUEST_FAILED",result?.error ?? "Request failed.");
   return result;
 };
 // Coalesce only concurrent public menu reads. Existing callers keep individual
 // deadlines and the original legacy endpoint; no location or auth goes in a batch.
 const singleMenu=(id:string,signal?:AbortSignal)=>request("/api/v1/catalog/shops/"+encodeURIComponent(id)+"/menu","GET",undefined,true,signal);
 type WaitingMenu={id:string;signal?:AbortSignal;resolve:(value:ApiResponse)=>void;reject:(error:unknown)=>void};
 let queued:WaitingMenu[]=[];
 let scheduled=false;
 const readGroup=async(group:WaitingMenu[])=>{
   const controller=new AbortController();
   const onAbort=()=>{if(group.every(job=>job.signal?.aborted))controller.abort();};
   for(const job of group)job.signal?.addEventListener("abort",onAbort,{once:true});
   const active=()=>group.filter(job=>!job.signal?.aborted);
   const ids=[...new Set(active().map(job=>job.id))];
   try {
     if(!ids.length)return;
     if(ids.length===1){
       const result=await singleMenu(ids[0],controller.signal);
       for(const job of active())job.resolve(result);
       return;
     }
     const result=await request("/api/v1/catalog/menus?"+new URLSearchParams({ids:ids.join(",")}),"GET",undefined,true,controller.signal);
     if(!Array.isArray(result.menus))throw new PickupApiError(503,"INVALID_MENU_BATCH","Shop menus could not be verified.");
     const verified=new Map<string,ApiResponse>();
     for(const value of result.menus){
       const row=value as {shop_id?:unknown;menu_items?:unknown}|null;
       if(!row || typeof row.shop_id!=="string" || !ids.includes(row.shop_id) || verified.has(row.shop_id) ||
          !Array.isArray(row.menu_items) || row.menu_items.some(item=>!item || typeof item!=="object" || item.shop_id!==row.shop_id))
         throw new PickupApiError(503,"INVALID_MENU_BATCH","Shop menus could not be verified.");
       verified.set(row.shop_id,{success:true,menu_items:row.menu_items});
     }
     for(const job of active()){
       const menu=verified.get(job.id);
       if(menu)job.resolve(menu);
       else job.reject(new PickupApiError(404,"SHOP_NOT_FOUND","Shop not found."));
     }
   }catch(error){
     // Compatibility only: an older API or an explicitly oversized batch.
     // Never multiply rate-limited, network-failed, malformed or 5xx requests.
     if(error instanceof PickupApiError && ([404,405].includes(error.status) ||
       (error.status===413 && error.code==="MENU_BATCH_TOO_LARGE")) && ids.length>1){
       await Promise.all(active().map(async job=>{try{job.resolve(await singleMenu(job.id,job.signal));}catch(e){job.reject(e);}}));
     }else for(const job of active())job.reject(error);
   }finally{
     for(const job of group)job.signal?.removeEventListener("abort",onAbort);
   }
 };
 const batchedMenu=(id:string,signal?:AbortSignal):Promise<ApiResponse>=>{
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))return singleMenu(id,signal);
   return new Promise((resolve,reject)=>{
     if(signal?.aborted){reject(signal.reason);return;}
     const abort=()=>reject(signal?.reason ?? new Error("Menu request aborted."));
     const cleanup=()=>signal?.removeEventListener("abort",abort);
     signal?.addEventListener("abort",abort,{once:true});
     queued.push({id,signal,resolve:value=>{cleanup();resolve(value);},reject:error=>{cleanup();reject(error);}});
     if(!scheduled){
       scheduled=true;
       queueMicrotask(()=>{
         scheduled=false;
         const jobs=queued;queued=[];
         for(let i=0;i<jobs.length;i+=6)void readGroup(jobs.slice(i,i+6));
       });
     }
   });
 };
 return {
  shops:(location:Location)=>request("/api/v1/catalog/pickup-shops?lat="+location.lat+"&lng="+location.lng,"GET",undefined,true),
  // Read-only wider visibility: only approved, non-archived public shop fields.
  // Checkout quote/create still enforce the server's strict 4 km limit.
  approvedShops:()=>request("/api/v1/catalog/shops","GET",undefined,true),
  menu:(id:string,signal?:AbortSignal)=>options.batchCatalogMenus?batchedMenu(id,signal):singleMenu(id,signal),
  priorityMenu:singleMenu,
  quote:(intent:unknown,signal?:AbortSignal)=>request("/api/v1/orders/quote","POST",intent,false,signal),
  create:async(intent:unknown):Promise<{order:PickupOrder;replayed:boolean}>=>{
    const result=await request("/api/v1/orders","POST",intent);
    if(!result.order?.id || typeof result.replayed!=="boolean") throw new PickupApiError(503,"UNCONFIRMED","Order persistence is unconfirmed. Retry the same request.");
    return {order:result.order,replayed:result.replayed};
  },
  orders:(merchant=false,signal?:AbortSignal)=>request(merchant ? "/api/v1/merchant/orders" : "/api/v1/orders","GET",undefined,false,signal),
  history:async(before:PickupHistoryBefore,signal?:AbortSignal):Promise<PickupHistoryPage>=>{
    const query=new URLSearchParams({before_id:before.id,before_created_at:before.created_at});
    const result=await request("/api/v1/orders/history?"+query,"GET",undefined,false,signal);
    const page=result as ApiResponse & {has_more?:unknown};
    if(!Array.isArray(page.orders) || typeof page.has_more!=="boolean" || page.orders.length>50)
      throw new PickupApiError(503,"INVALID_HISTORY_PAGE","Older orders could not be verified.");
    return {orders:page.orders,has_more:page.has_more};
  },
  order:(id:string,signal?:AbortSignal)=>request("/api/v1/orders/"+encodeURIComponent(id),"GET",undefined,false,signal),
  command:(id:string,action:string,payload:unknown,merchant=true,signal?:AbortSignal)=>request((merchant ? "/api/v1/merchant/orders" : "/api/v1/orders")+"/"+encodeURIComponent(id)+"/"+action,"POST",payload,false,signal),
  notifications:(signal?:AbortSignal)=>request("/api/v1/notifications","GET",undefined,false,signal),
  subscribe:(id:string,fcm_token:string)=>request("/api/v1/push-subscriptions/"+id,"PUT",{fcm_token,permission_granted:true}),
  revoke:(id:string)=>request("/api/v1/push-subscriptions/"+id,"DELETE"),
 };
}
export const pickupStatus=(order:PickupOrder,events:{kind:string}[]=[])=>{
 if(order.status==="cancelled") return events.some(e=>e.kind==="merchant_rejected") ? "Rejected" : "Cancelled";
 return ({pending:"Pending",preparing:"Preparing",ready_for_pickup:"Ready for pickup",collected:"Collected / Completed"} as Record<string,string>)[order.status] ?? "Status unavailable";
};
