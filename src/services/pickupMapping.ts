import type {CartItem,Shop} from "../types";
const PICKUP_ORDER_RADIUS_KM = 4;

export function isWithinPickupArea(shop: Pick<Shop, "distance">): boolean {
 return typeof shop.distance === "number" && Number.isFinite(shop.distance) &&
  shop.distance >= 0 && shop.distance <= PICKUP_ORDER_RADIUS_KM;
}

export function requireRealLocation(point:{lat:number;lng:number}|null) {
 if(!point || !Number.isFinite(point.lat) || Math.abs(point.lat)>90 || !Number.isFinite(point.lng) || Math.abs(point.lng)>180)
  throw new Error("Allow your real location to find available pickup shops within 4 km. No default location is used.");
 return point;
}
export function mapPickupShop(shop:any,items:any[]):Shop {
 const lat=shop.lat ?? shop.latitude,lng=shop.lng ?? shop.longitude;
 requireRealLocation({lat,lng});
 if(!shop.id || typeof shop.name!=="string" || typeof shop.is_active!=="boolean" || !isWithinPickupArea({distance:shop.distance_km}))
  throw new Error("The service returned an ineligible pickup shop.");
 const menu=items.filter(item=>item.is_available===true).map(item=>{
  if(!item.id || typeof item.name!=="string" || typeof item.price!=="number" || !Number.isFinite(item.price) || item.price<0)
   throw new Error("The service returned an invalid menu price.");
  // API data is untrusted JSON. Only approved public item display fields
  // enter the Customer card/cart; never spread provider or private metadata.
  return {id:String(item.id),name:item.name,price:item.price,
   displayPrice:`R ${item.price.toFixed(2)}`,
   image:typeof item.image_url==="string" ? item.image_url : "",
   description:typeof item.description==="string" ? item.description : "",
   category:typeof item.category==="string" ? item.category : "",
   is_available:true,customizations:[]};
 });
 // Never expose credentials, shop owner IDs/emails, direct phone, approval
 // metadata, internal availability revisions or unexpected nested fields.
 // Merchant/Customer presentation keeps the original ShopCard contract.
 return {id:String(shop.id),name:shop.name,
  logo:typeof shop.logo_url==="string" ? shop.logo_url : "",
  rating:typeof shop.rating==="number" && Number.isFinite(shop.rating) ? shop.rating : 0,
  description:typeof shop.description==="string" ? shop.description : "",
  address:typeof shop.location==="string" ? shop.location : "",
  category:typeof shop.category==="string" ? shop.category : "",
  opening_time:typeof shop.opening_time==="string" ? shop.opening_time : undefined,
  closing_time:typeof shop.closing_time==="string" ? shop.closing_time : undefined,
  latitude:lat,longitude:lng,distance:shop.distance_km,
  isOpen:shop.is_active,is_active:shop.is_active,menu};
}
export const MAX_PICKUP_ITEM_QUANTITY = 20;

export function pickupCartIntent(cart:CartItem[],location:{lat:number;lng:number},name:string,phone:string,method:string) {
 if(!cart.length || new Set(cart.map(i=>i.shopId)).size!==1) throw new Error("Choose items from one pickup shop per quote.");
 if(!["cash","card_machine"].includes(method)) throw new Error("Pay at the shop with cash or its physical card machine.");
 if(!name.trim() || !/^\+?[0-9 ()-]{9,20}$/.test(phone.trim())) throw new Error("Enter your name and a callable phone number.");
 for(const item of cart) if(!Number.isSafeInteger(item.quantity) || item.quantity<1 || item.quantity>MAX_PICKUP_ITEM_QUANTITY || item.selectedCustomizations?.length)
  throw new Error("Choose 1 to 20 of each menu item. Priced menu options are unavailable for this pilot.");
 const groups=new Map<string,{quantity:number;notes:string}[]>();
 for(const item of cart){
  if(item.specialInstructions != null && typeof item.specialInstructions!=="string") throw new Error("Check your item instructions.");
  const notes=(item.specialInstructions || "").trim();
  if(notes.length>500) throw new Error("Keep instructions within 500 characters per menu item.");
  const entries=groups.get(item.id) || []; entries.push({quantity:item.quantity,notes});groups.set(item.id,entries);
 }
 const items=Array.from(groups,([menu_item_id,entries])=>{
  const quantity=entries.reduce((sum,line)=>sum+line.quantity,0);
  if(quantity>MAX_PICKUP_ITEM_QUANTITY) throw new Error("Choose no more than 20 of each menu item across your cart.");
  const sameNotes=entries.every(line=>line.notes===entries[0].notes);
  const notes=sameNotes ? entries[0].notes : entries.map(line=>`${line.quantity} ×: ${line.notes || "No special instructions"}`).join("\n");
  if(notes.length>500) throw new Error("Keep combined instructions within 500 characters per menu item.");
  return {menu_item_id,quantity,...(notes ? {notes} : {})};
 });
 return {contract_version:"pickup-v1",idempotency_key:crypto.randomUUID(),shop_id:cart[0].shopId,
  items,delivery_type:"collection",delivery_schedule_mode:"standard",
  payment_method:method,tip_amount:0,customer_details:{name:name.trim(),phone:phone.trim()},launch_location:requireRealLocation(location)};
}
export function blockPickupSubmission():never {
 throw new Error("Order submission is not enabled yet. Your quote is not an order. No payment has been taken. Pickup database activation requires separate approval.");
}

export function retryPickupDiscovery(point:{lat:number;lng:number}|null,locate:()=>void,reload:()=>void):void {
 if(!point){locate();return;}
 requireRealLocation(point);reload();
}
