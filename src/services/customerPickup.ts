import {pickupQuoteAmounts} from "./pickupSummary";
import {auth} from "../lib/firebase";
import {createPickupApi} from "../pickup/client";
import {mapPickupShop, pickupCartIntent, requireRealLocation, blockPickupSubmission} from "./pickupMapping";
import {createNearbyCatalogReader, type NearbyCatalog} from "./nearbyCatalogCache";
import type {CartItem} from "../types";
import {createPickupCancellation,pickupCancellationKey} from './pickupCancellation';
import type {PickupOrder} from '../pickup/client';

export const customerPickupApi=createPickupApi(import.meta.env.VITE_LOCALEATS_API_URL || "", async()=>{
  const user=auth.currentUser;
  if(!user) throw new Error("Please sign in with your existing account.");
  return user.getIdToken();
},fetch,{requireExplicitHttps:import.meta.env.PROD});

const readVerifiedNearbyCatalog=createNearbyCatalogReader({
  shops: customerPickupApi.shops,
  menu: async id => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 5000);
    try {
      return await customerPickupApi.menu(id, controller.signal);
    } finally {
      clearTimeout(deadline);
    }
  },
}, mapPickupShop);
export async function readPickupCatalog(location:{lat:number;lng:number}|null,options:{force?:boolean}={}):Promise<NearbyCatalog> {
  return readVerifiedNearbyCatalog(location,options);
}

export async function quotePickupCart(cart:CartItem[],location:{lat:number;lng:number}|null,name:string,phone:string,method:string,signal?:AbortSignal) {
  const intent=pickupCartIntent(cart,requireRealLocation(location),name,phone,method);
  const result=await customerPickupApi.quote(intent,signal);
  if(!result.quote || !Number.isSafeInteger(result.quote.total_minor) || result.quote.total_minor<0)
    throw new Error("The service did not confirm an authoritative quote.");
  pickupQuoteAmounts(result.quote);
  return {intent,quote:result.quote};
}
export {blockPickupSubmission};

export const pickupOrderingEnabled=()=>import.meta.env?.VITE_PICKUP_ORDERING_ENABLED === "true";
export const cancelCustomerPickup=createPickupCancellation({
 identity:()=>auth.currentUser?.uid,enabled:pickupOrderingEnabled,command:customerPickupApi.command,
 storage:{getItem:key=>sessionStorage.getItem(key),setItem:(key,value)=>sessionStorage.setItem(key,value),removeItem:key=>sessionStorage.removeItem(key)},
});
export function hasPendingPickupCancellation(order:PickupOrder):boolean {
 const uid=auth.currentUser?.uid;
 if(!uid||order.user_id!==uid)return false;
 try{return !!sessionStorage.getItem(pickupCancellationKey(uid,order.id));}catch{return false;}
}
export async function submitPickupQuote(review:Awaited<ReturnType<typeof quotePickupCart>>|null) {
 if(!pickupOrderingEnabled())blockPickupSubmission();
 if(review && review.quote.can_submit !== true)throw new Error("Pickup ordering is not available for this quote.");
 const uid=auth.currentUser?.uid;
 if(!uid)throw new Error("Sign in before submitting an order.");
 const key=`pickup-create:${uid}`;
 const stored=sessionStorage.getItem(key);
 const payload=review ? {...review.intent,consent:{currency:"ZAR",total_minor:review.quote.total_minor,pricing_fingerprint:review.quote.pricing_fingerprint}} : null;
 const pending=stored ? JSON.parse(stored) : payload;
 if(!pending)throw new Error("Review a quote before submitting.");
 if(stored && payload && JSON.stringify(pending)!==JSON.stringify(payload))throw new Error("A previous order outcome is unresolved. Use Retry previous submission first.");
 // A recovered order must match the same original amount and payment choice.
 // Keep the unresolved request if its consent or response cannot be verified.
 const consentTotalMinor=pending?.consent?.total_minor;
 const consentPaymentMethod=pending?.payment_method;
 if(!Number.isSafeInteger(consentTotalMinor) || consentTotalMinor<0 ||
    !["cash","card_machine"].includes(consentPaymentMethod))
  throw new Error("The pending pickup request has invalid consent or payment details.");
 sessionStorage.setItem(key,JSON.stringify(pending));
 let result:Awaited<ReturnType<typeof customerPickupApi.create>>;
 try{result=await customerPickupApi.create(pending);}catch(error){
  if(error && typeof error==="object" && "status" in error && [400,403,404,409,422].includes(Number(error.status)))sessionStorage.removeItem(key);
  throw error;
 }
 if(result.order.user_id!==uid || result.order.shop_id!==pending.shop_id || result.order.delivery_type!=="collection")throw new Error("Order persistence was not confirmed for your account and shop.");
 const persistedTotalMinor=result.order.total_price == null ? NaN : Math.round(Number(result.order.total_price)*100);
 if(!Number.isSafeInteger(persistedTotalMinor) || persistedTotalMinor!==consentTotalMinor ||
    result.order.payment_method!==consentPaymentMethod)
  throw new Error("The API returned an order that does not match the confirmed total or payment choice.");
 sessionStorage.removeItem(key);
 return result.order;
}
