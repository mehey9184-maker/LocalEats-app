import type {Order} from "../types";

// The Orders UI reads only a snapshot returned from the authenticated
// LocalEats API. Supabase, local cache, old receipts and FCM are not authority.
export function confirmedCustomerPickupOrders(
 orders:readonly Order[]|null|undefined,ownerUid:string|undefined,
):Order[]{
 if(!ownerUid || !Array.isArray(orders))return [];
 const seen=new Set<string>();
 return orders.filter(order=>{
  if(!order || typeof order.id!=="string" || !order.id ||
    order.user_id!==ownerUid ||
    !(order.delivery_type==="collection" || order.order_type==="collection") ||
    seen.has(order.id))return false;
  seen.add(order.id);
  return true;
 }).sort((a,b)=>{
  const timestamp=(x:string)=>{const n=Date.parse(x||"");return Number.isFinite(n)?n:0;};
  return timestamp(b.created_at)-timestamp(a.created_at) || String(a.id).localeCompare(String(b.id));
 });
}

export type PickupDisplayStatus={
 label:string;tone:"slate"|"orange"|"green"|"red"|"blue";
 terminal:boolean;step:number;
};
export function confirmedPickupDisplayStatus(status:string|undefined):PickupDisplayStatus{
 switch(String(status||"").toLowerCase()){
  case "pending":return {label:"Pending shop acceptance",tone:"slate",terminal:false,step:0};
  case "accepted":
  case "preparing":return {label:"Preparing",tone:"orange",terminal:false,step:1};
  case "ready":
  case "ready_for_pickup":return {label:"Ready for collection",tone:"blue",terminal:false,step:2};
  case "collected":
  case "completed":return {label:"Collected",tone:"green",terminal:true,step:3};
  case "cancelled":
  case "rejected":
  case "declined":return {label:"Cancelled",tone:"red",terminal:true,step:-1};
  default:return {label:"Status unavailable",tone:"slate",terminal:false,step:-1};
 }
}

export function confirmedPickupTotal(order:Order):number|null{
 // A snapshot's authoritative server-calculated total is the only amount
 // that may be shown. Historical unit prices and price/total fallbacks are
 // explicitly not a payment quote.
 const total=order?.total_price;
 return typeof total==="number" && Number.isFinite(total) && total>=0 ? total:null;
}
export function confirmedPickupPayment(order:Order):string{
 if(order?.payment_status==="paid")return "Payment confirmed by shop";
 if(order?.payment_status==="unpaid") {
  return order.payment_method==="cash" ? "Cash payable at the shop" :
   order.payment_method==="card_machine" ? "Card payable at the shop" :
   "Payment method unavailable — confirm with shop";
 }
 return "Payment status unavailable — confirm with shop";
}
export function confirmedPickupShopName(order:Order,shops:readonly {id:string;name:string}[]):string{
 const shop=shops.find(value=>String(value.id)===String(order.shop_id));
 return typeof shop?.name==="string" && shop.name.trim()?shop.name:"Shop information unavailable";
}
