import type {CartItem,Shop} from "../types";
export function requireRealLocation(point:{lat:number;lng:number}|null) {
 if(!point || !Number.isFinite(point.lat) || Math.abs(point.lat)>90 || !Number.isFinite(point.lng) || Math.abs(point.lng)>180)
  throw new Error("Allow your real location to find available pickup shops within 4 km. No default location is used.");
 return point;
}
export function mapPickupShop(shop:any,items:any[]):Shop {
 const lat=shop.lat ?? shop.latitude,lng=shop.lng ?? shop.longitude;
 requireRealLocation({lat,lng});
 if(!shop.id || typeof shop.name!=="string" || shop.is_active!==true || !Number.isFinite(shop.distance_km) || shop.distance_km>4 || shop.distance_km<0)
  throw new Error("The service returned an ineligible pickup shop.");
 const menu=items.filter(item=>item.is_available===true).map(item=>{
  if(!item.id || typeof item.name!=="string" || typeof item.price!=="number" || !Number.isFinite(item.price) || item.price<0)
   throw new Error("The service returned an invalid menu price.");
  return {...item,id:String(item.id),displayPrice:`R ${item.price.toFixed(2)}`,image:item.image_url || "",customizations:[]};
 });
 return {...shop,id:String(shop.id),logo:shop.logo_url || "",rating:shop.rating ?? 0,description:shop.description || "",
  address:shop.location || "",category:shop.category || "",latitude:lat,longitude:lng,distance:shop.distance_km,isOpen:true,menu};
}
export function pickupCartIntent(cart:CartItem[],location:{lat:number;lng:number},name:string,phone:string,method:string) {
 if(!cart.length || new Set(cart.map(i=>i.shopId)).size!==1) throw new Error("Choose items from one pickup shop per quote.");
 if(!["cash","card_machine"].includes(method)) throw new Error("Pay at the shop with cash or its physical card machine.");
 if(!name.trim() || !/^\+?[0-9 ()-]{9,20}$/.test(phone.trim())) throw new Error("Enter your name and a callable phone number.");
 for(const item of cart) if(!Number.isSafeInteger(item.quantity) || item.quantity<1 || item.quantity>99 || item.selectedCustomizations?.length)
  throw new Error("Check item quantities. Menu options require server support and are unavailable for this pilot.");
 return {contract_version:"pickup-v1",idempotency_key:crypto.randomUUID(),shop_id:cart[0].shopId,
  items:cart.map(i=>({menu_item_id:i.id,quantity:i.quantity})),delivery_type:"collection",delivery_schedule_mode:"standard",
  payment_method:method,tip_amount:0,customer_details:{name:name.trim(),phone:phone.trim()},launch_location:requireRealLocation(location)};
}
export function blockPickupSubmission():never {
 throw new Error("Order submission is not enabled yet. Your quote is not an order. No payment has been taken. Pickup database activation requires separate approval.");
}
