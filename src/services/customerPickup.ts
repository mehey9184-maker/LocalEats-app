import {auth} from "../lib/firebase";
import {createPickupApi} from "../pickup/client";
import {mapPickupShop, pickupCartIntent, requireRealLocation, blockPickupSubmission} from "./pickupMapping";
import type {CartItem, Shop} from "../types";

export const customerPickupApi=createPickupApi(import.meta.env.VITE_LOCALEATS_API_URL || "", async()=>{
  const user=auth.currentUser;
  if(!user) throw new Error("Please sign in with your existing account.");
  return user.getIdToken();
},fetch,{requireExplicitHttps:import.meta.env.PROD});

export async function readPickupCatalog(location:{lat:number;lng:number}|null):Promise<Shop[]> {
  const point=requireRealLocation(location);
  const result=await customerPickupApi.shops(point);
  if(!Array.isArray(result.shops)) throw new Error("The shop service returned an invalid catalog.");
  return Promise.all(result.shops.map(async shop=>{
    const menu=await customerPickupApi.menu(shop.id);
    if(!Array.isArray(menu.menu_items)) throw new Error("The menu service returned an invalid menu.");
    return mapPickupShop(shop,menu.menu_items);
  }));
}

export async function quotePickupCart(cart:CartItem[],location:{lat:number;lng:number}|null,name:string,phone:string,method:string) {
  const intent=pickupCartIntent(cart,requireRealLocation(location),name,phone,method);
  const result=await customerPickupApi.quote(intent);
  if(!result.quote || !Number.isSafeInteger(result.quote.total_minor) || result.quote.total_minor<0)
    throw new Error("The service did not confirm an authoritative quote.");
  return {intent,quote:result.quote};
}
export {blockPickupSubmission};

export const pickupOrderingEnabled=()=>import.meta.env?.VITE_PICKUP_ORDERING_ENABLED === "true";
export async function submitPickupQuote(review:Awaited<ReturnType<typeof quotePickupCart>>|null) {
 if(!pickupOrderingEnabled())blockPickupSubmission();
 const uid=auth.currentUser?.uid;
 if(!uid)throw new Error("Sign in before submitting an order.");
 const key=`pickup-create:${uid}`;
 const stored=sessionStorage.getItem(key);
 const payload=review ? {...review.intent,consent:{currency:"ZAR",total_minor:review.quote.total_minor,pricing_fingerprint:review.quote.pricing_fingerprint}} : null;
 const pending=stored ? JSON.parse(stored) : payload;
 if(!pending)throw new Error("Review a quote before submitting.");
 if(stored && payload && JSON.stringify(pending)!==JSON.stringify(payload))throw new Error("A previous order outcome is unresolved. Use Retry previous submission first.");
 sessionStorage.setItem(key,JSON.stringify(pending));
 let result:Awaited<ReturnType<typeof customerPickupApi.create>>;
 try{result=await customerPickupApi.create(pending);}catch(error){
  if(error && typeof error==="object" && "status" in error && [400,403,404,409,422].includes(Number(error.status)))sessionStorage.removeItem(key);
  throw error;
 }
 if(result.order.user_id!==uid || result.order.shop_id!==pending.shop_id || result.order.delivery_type!=="collection")throw new Error("Order persistence was not confirmed for your account and shop.");
 sessionStorage.removeItem(key);
 return result.order;
}
