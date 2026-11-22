import {pickupQuoteAmounts} from "./pickupSummary";
import {auth} from "../lib/firebase";
import {createPickupApi} from "../pickup/client";
import {mapPickupShop, pickupCartIntent, requireRealLocation, blockPickupSubmission, pickupDistanceKm} from "./pickupMapping";
import {createNearbyCatalogReader, type NearbyCatalog} from "./nearbyCatalogCache";
import {createPublicBrowseCatalogReader} from "./publicBrowseCatalog";
import type {CartItem} from "../types";
import {createPickupCancellation,pickupCancellationKey} from './pickupCancellation';
import type {PickupOrder} from '../pickup/client';

export const customerPickupApi=createPickupApi(import.meta.env.VITE_LOCALEATS_API_URL || "", async()=>{
  const user=auth.currentUser;
  if(!user || user.isAnonymous) throw new Error("Please sign in with your existing account.");
  return user.getIdToken();
},fetch,{requireExplicitHttps:import.meta.env.PROD});

const readVerifiedNearbyCatalog=createNearbyCatalogReader({
  // Discovery displays all approved, non-archived public shops. Server quote
  // and order creation remain strictly 4 km. No invented coordinates or
  // distance: only validated public shop coordinates and the device's location.
  shops: async location => {
    requireRealLocation(location);
    const listing=await customerPickupApi.approvedShops();
    if(!Array.isArray(listing.shops))throw new Error("The approved shop catalog is unavailable.");
    const shops=listing.shops.flatMap(raw=>{
      if(!raw || typeof raw.id!=="string" || !raw.id || typeof raw.is_active!=="boolean") return [];
      try {return [{...raw,distance_km:pickupDistanceKm(location,raw)}];}
      catch {return [];} // Missing/unverified shop GPS: do not guess a distance.
    }).sort((a,b)=>a.distance_km-b.distance_km);
    return {shops};
  },
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
export async function readPickupCatalog(location:{lat:number;lng:number}|null,options:{force?:boolean;onProgress?:(partial:NearbyCatalog)=>void}={}):Promise<NearbyCatalog> {
  return readVerifiedNearbyCatalog(location,options);
}

/**
 * Public, location-independent shop discovery for browsers without GPS.
 * Never infers pickup eligibility or substitutes fake distances/coordinates.
 * The API returns only approved nonarchived shops; every menu is read-only.
 */
const publicBrowseReader=createPublicBrowseCatalogReader({
 shops:()=>customerPickupApi.approvedShops(),
 menu:(id,signal)=>customerPickupApi.menu(id,signal),
},mapPickupShop);

// Preserve the existing no-progress API for source compatibility and tests.
export async function readPublicBrowseCatalog():Promise<NearbyCatalog>{
 return publicBrowseReader();
}

/** Preview Home can show each verified browse-only card before other menus finish. */
export async function readPublicBrowseCatalogProgressive(
 onProgress:(partial:NearbyCatalog)=>void,
):Promise<NearbyCatalog>{
 return publicBrowseReader({onProgress});
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
