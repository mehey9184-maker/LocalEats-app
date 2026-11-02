export type PickupOrder = {id:string;shop_id:string;user_id:string;status:string;delivery_type:string;delivery_status:string;
 payment_status:string;payment_method:string;revision:number;customer_name:string;phone:string;total_price:number;
 items:{menu_item_id:string;name:string;quantity:number;unit_price:number;line_total:number}[];created_at:string};
export type Location = {lat:number;lng:number};
export class PickupApiError extends Error {
 status:number; code:string;
 constructor(status:number,code:string,message:string) {super(message);this.status=status;this.code=code;}
}
export type PickupQuote={lines:{menu_item_id:string;name:string;quantity:number;unit_minor:number;line_minor:number}[];total_minor:number;service_fee_minor:number;delivery_fee_minor?:number;discount_minor?:number;tip_minor?:number;subtotal_minor:number;pricing_fingerprint:string};
type ApiResponse={success?:boolean;code?:string;error?:string;order?:PickupOrder;replayed?:boolean;orders?:PickupOrder[];
 shops?:{id:string;name:string;location:string;distance_km:number}[];
 menu_items?:{id:string;name:string;price:number;is_available:boolean}[];quote?:PickupQuote;
 notifications?:{id:string;order_id:string}[];events?:{id:string;kind:string;occurred_at:string;details?:{reason?:string}}[]};
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
 options:{requireExplicitHttps?:boolean}={}) {
 const request=async(path:string,method="GET",body?:unknown,publicRead=false):Promise<ApiResponse>=>{
   const origin=pickupApiOrigin(baseUrl,options.requireExplicitHttps);
   const bearer=publicRead ? "" : await token();
   if(!publicRead && !bearer) throw new PickupApiError(401,"UNAUTHORIZED","Sign in again to continue.");
   let response:Response;
   // Only public read-only catalog calls have a timeout; mutations retain
   // their existing idempotent retry and unknown-outcome handling.
   const controller=publicRead ? new AbortController() : null;
   let catalogTimedOut=false;
   const timeout=controller ? setTimeout(()=>{catalogTimedOut=true;controller.abort();},12000) : null;
   try {
     response=await transport(origin+path,{method,cache:"no-store",
       headers:{"Content-Type":"application/json",...(bearer ? {Authorization:"Bearer fb-"+bearer} : {})},
       ...(controller ? {signal:controller.signal} : {}),
       ...(body===undefined ? {} : {body:JSON.stringify(body)})});
   } catch {
     if(catalogTimedOut)throw new PickupApiError(0,"CATALOG_TIMEOUT","Shops took too long to load. Please retry.");
     throw new PickupApiError(0,"CONNECTION_LOST",publicRead
       ? "Shop information could not be loaded. Please retry."
       : "Connection lost. The outcome may be unknown. Retry the same request.");
   } finally {
     if(timeout!==null)clearTimeout(timeout);
   }
   let result:ApiResponse;
   try {result=await response.json();} catch {throw new PickupApiError(response.status,"INVALID_RESPONSE","The service returned an invalid response.");}
   if(!response.ok || result?.success!==true) throw new PickupApiError(response.status,result?.code ?? "REQUEST_FAILED",result?.error ?? "Request failed.");
   return result;
 };
 return {
  shops:(location:Location)=>request("/api/v1/catalog/pickup-shops?lat="+location.lat+"&lng="+location.lng,"GET",undefined,true),
  // Read-only browsing metadata for shops outside active trading hours.
  // NEVER use this list to create orders or bypass pickup-shops eligibility.
  approvedShops:()=>request("/api/v1/catalog/shops","GET",undefined,true),
  menu:(id:string)=>request("/api/v1/catalog/shops/"+encodeURIComponent(id)+"/menu","GET",undefined,true),
  quote:(intent:unknown)=>request("/api/v1/orders/quote","POST",intent),
  create:async(intent:unknown):Promise<{order:PickupOrder;replayed:boolean}>=>{
    const result=await request("/api/v1/orders","POST",intent);
    if(!result.order?.id || typeof result.replayed!=="boolean") throw new PickupApiError(503,"UNCONFIRMED","Order persistence is unconfirmed. Retry the same request.");
    return {order:result.order,replayed:result.replayed};
  },
  orders:(merchant=false)=>request(merchant ? "/api/v1/merchant/orders" : "/api/v1/orders"),
  order:(id:string)=>request("/api/v1/orders/"+encodeURIComponent(id)),
  command:(id:string,action:string,payload:unknown,merchant=true)=>request((merchant ? "/api/v1/merchant/orders" : "/api/v1/orders")+"/"+encodeURIComponent(id)+"/"+action,"POST",payload),
  notifications:()=>request("/api/v1/notifications"),
  subscribe:(id:string,fcm_token:string)=>request("/api/v1/push-subscriptions/"+id,"PUT",{fcm_token,permission_granted:true}),
  revoke:(id:string)=>request("/api/v1/push-subscriptions/"+id,"DELETE"),
 };
}
export const pickupStatus=(order:PickupOrder,events:{kind:string}[]=[])=>{
 if(order.status==="cancelled") return events.some(e=>e.kind==="merchant_rejected") ? "Rejected" : "Cancelled";
 return ({pending:"Pending",preparing:"Preparing",ready_for_pickup:"Ready for pickup",collected:"Collected / Completed"} as Record<string,string>)[order.status] ?? "Status unavailable";
};
