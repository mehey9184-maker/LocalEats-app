/**
 * L3-N8M — prepared Customer ↔ server Community *READ* contract.
 * NOT mounted in the Customer UI; server-side router is also unmounted.
 * The isolated staging Supabase project has no verified review/follow/chat or
 * order schema. This adapter MUST NOT claim empty data or successful writes.
 */
export type CustomerCommunityReview={
 id:string;shop_id:string;rating:number;comment:string;created_at:string;
};
export type CustomerCommunityMessage={
 id:string;order_id:string;sender_role:"customer"|"merchant";
 message:string;created_at:string;
};
export type CustomerCommunityFollows={shop_ids:string[]};
export class CustomerCommunityApiError extends Error {
 constructor(public readonly status:number,public readonly code:string,message:string){
  super(message);
 }
}
export const communityWritesEnabled=()=>false as const;
export const communityFeatureMounted=()=>false as const;

const validId=(value:unknown):value is string=>
 typeof value==="string"&&/^[a-zA-Z0-9_-]{1,128}$/.test(value);
const validText=(value:unknown,max:number):value is string=>
 typeof value==="string" && value.length>0 && value.length<=max;
const endpointOrigin=(value:string,requireHttps:boolean):string=>{
 try{
  const url=new URL(value);
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(url.username||url.password||url.pathname!=="/"||url.search||url.hash||
     (url.protocol!=="https:"&&!(url.protocol==="http:"&&local&&!requireHttps))||
     (requireHttps&&local))
   throw Error("invalid");
  return url.origin;
 }catch{
  throw new CustomerCommunityApiError(503,"COMMUNITY_API_CONFIGURATION_INVALID",
    "Customer community service is not configured.");
 }
};
const validReview=(v:unknown,shopId:string):v is CustomerCommunityReview=>{
 if(!v||typeof v!=="object")return false;
 const r=v as Record<string,unknown>;
 return validId(r.id) && r.shop_id===shopId &&
  Number.isInteger(r.rating) && (r.rating as number)>=1 && (r.rating as number)<=5 &&
  validText(r.comment,1200) && validText(r.created_at,60);
};
const validMessage=(v:unknown,orderId:string):v is CustomerCommunityMessage=>{
 if(!v||typeof v!=="object")return false;
 const r=v as Record<string,unknown>;
 return validId(r.id)&&r.order_id===orderId&&
  (r.sender_role==="customer"||r.sender_role==="merchant") &&
  validText(r.message,2000)&&validText(r.created_at,60);
};

export function createCustomerCommunityReadClient(
 apiOrigin:string,
 getIdToken:()=>Promise<string>,
 transport:typeof fetch=fetch,
 options:{requireHttps?:boolean}={},
){
 const base=endpointOrigin(apiOrigin,options.requireHttps??true);
 const get=async(path:string,signal?:AbortSignal):Promise<Record<string,unknown>>=>{
  signal?.throwIfAborted();
  let token:string;
  try{token=await getIdToken();}catch{
   throw new CustomerCommunityApiError(401,"UNAUTHORIZED","Sign in to view this information.");
  }
  if(!token||typeof token!=="string"||token.length>8192)
   throw new CustomerCommunityApiError(401,"UNAUTHORIZED","Sign in to view this information.");
  let response:Response;
  try{response=await transport(base+"/api/v1/community"+path,{
   method:"GET",cache:"no-store",signal,
   headers:{"Accept":"application/json","Authorization":"Bearer fb-"+token},
  });}
  catch{
   signal?.throwIfAborted();
   throw new CustomerCommunityApiError(503,"COMMUNITY_NETWORK_UNAVAILABLE",
    "Community information is currently unavailable.");
  }
  // The dormant API route is intentionally 404 until both releases are approved.
  if(!response.ok){
   throw new CustomerCommunityApiError(response.status,
     response.status===404?"COMMUNITY_ROUTE_NOT_ACTIVE":"COMMUNITY_UNAVAILABLE",
     "Community information is currently unavailable. No change was saved.");
  }
  let body:unknown;
  try{body=await response.json();}catch{
   throw new CustomerCommunityApiError(503,"COMMUNITY_RESPONSE_INVALID",
    "Community information could not be verified.");
  }
  if(!body || typeof body!=="object" || (body as Record<string,unknown>).success!==true)
   throw new CustomerCommunityApiError(503,"COMMUNITY_RESPONSE_INVALID",
    "Community information could not be verified.");
  return body as Record<string,unknown>;
 };
 return Object.freeze({
  reviews:async(shopId:string,signal?:AbortSignal):Promise<CustomerCommunityReview[]>=>{
   if(!validId(shopId))throw new CustomerCommunityApiError(404,"SHOP_NOT_FOUND","Shop not found.");
   const body=await get("/shops/"+encodeURIComponent(shopId)+"/reviews",signal);
   if(!Array.isArray(body.reviews)||body.reviews.length>25||!body.reviews.every(v=>validReview(v,shopId)))
    throw new CustomerCommunityApiError(503,"COMMUNITY_RESPONSE_INVALID","Reviews could not be verified.");
   return body.reviews.map((r:CustomerCommunityReview)=>({
    id:r.id,shop_id:r.shop_id,rating:r.rating,comment:r.comment,created_at:r.created_at,
   }));
  },
  followedShops:async(signal?:AbortSignal):Promise<CustomerCommunityFollows>=>{
   // No caller supplied user ID; verified UID comes from the server token.
   const body=await get("/me/follows",signal);
   if(!Array.isArray(body.shop_ids)||body.shop_ids.length>50||
      !body.shop_ids.every(validId))
    throw new CustomerCommunityApiError(503,"COMMUNITY_RESPONSE_INVALID",
      "Followed shops could not be verified.");
   return {shop_ids:[...new Set(body.shop_ids as string[])]};
  },
  pickupMessages:async(orderId:string,signal?:AbortSignal):Promise<CustomerCommunityMessage[]>=>{
   if(!validId(orderId))throw new CustomerCommunityApiError(404,"ORDER_NOT_FOUND","Order not found.");
   const body=await get("/orders/"+encodeURIComponent(orderId)+"/messages",signal);
   if(!Array.isArray(body.messages)||body.messages.length>50||
      !body.messages.every(v=>validMessage(v,orderId)))
    throw new CustomerCommunityApiError(503,"COMMUNITY_RESPONSE_INVALID",
      "Order messages could not be verified.");
   return body.messages.map((m:CustomerCommunityMessage)=>({
    id:m.id,order_id:m.order_id,sender_role:m.sender_role,message:m.message,created_at:m.created_at,
   }));
  },
 });
}
