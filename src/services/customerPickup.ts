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
