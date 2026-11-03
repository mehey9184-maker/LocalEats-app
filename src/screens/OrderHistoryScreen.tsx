import React from "react";
import {ArrowLeft,ShoppingBag,Clock,ChevronRight,RotateCcw,Receipt,RefreshCw} from "lucide-react";
import type {Shop,Order} from "../types";
import {
 confirmedCustomerPickupOrders,confirmedPickupDisplayStatus,
 confirmedPickupTotal,confirmedPickupPayment,confirmedPickupShopName,
} from "../services/customerOrdersPolicy";

interface OrderHistoryScreenProps {
 ownerUid?:string;
 onBack:()=>void;
 shops:Shop[];
 pickupOrders:Order[];
 loadState:"loading"|"ready"|"error";
 onRefresh:()=>void;
 onOpenShop:(shopId:string)=>void;
 onViewOrder:(orderId:string)=>void;
 triggerHaptic?:(duration?:number)=>void;
}
const toneClasses={
 slate:"text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700",
 orange:"text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40",
 blue:"text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40",
 green:"text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40",
 red:"text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40",
};
export function OrderHistoryScreen({
 ownerUid,onBack,shops,pickupOrders,loadState,onRefresh,
 onOpenShop,onViewOrder,triggerHaptic,
}:OrderHistoryScreenProps){
 const orders=confirmedCustomerPickupOrders(pickupOrders,ownerUid);
 const loading=loadState==="loading";
 const error=loadState==="error";
 return (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
   <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
    <div className="flex items-center gap-3">
     <button type="button" onClick={onBack} aria-label="Back from order history"
      className="min-w-11 min-h-11 inline-flex items-center justify-center -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 transition">
      <ArrowLeft className="w-5 h-5"/>
     </button>
     <div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
       <ShoppingBag className="w-5 h-5 text-orange-500"/> Order History
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">Confirmed pickup order status and amounts</p>
     </div>
    </div>
    <button type="button" onClick={onRefresh} disabled={!ownerUid} aria-label="Refresh confirmed orders"
     className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl text-orange-600 bg-orange-50 dark:bg-orange-950/30 focus-visible:outline-2 focus-visible:outline-orange-500">
     <RefreshCw className="w-5 h-5"/>
    </button>
   </div>

   <div className="max-w-2xl mx-auto p-4 space-y-4">
    <p className="text-xs text-slate-500 dark:text-slate-400">
      This page displays only server-confirmed pickup orders for the signed-in account.
      Older orders from previous LocalEats systems are not imported or deleted by this Preview.
    </p>
    {error && ownerUid && (
     <div role="alert" className="rounded-2xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3 text-sm text-orange-800 dark:text-orange-200">
      Order history could not refresh. Check your connection and retry. Older confirmed information may be outdated.
      <button type="button" onClick={onRefresh} className="ml-2 underline underline-offset-2 font-bold">Retry</button>
     </div>
    )}
    {!ownerUid ? (
     <div role="status" className="text-center rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign in to view pickup history</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
       Order history belongs to a verified account. Nothing is assumed from an old cached profile.
      </p>
      <button type="button" onClick={onBack} className="mt-4 px-5 min-h-11 rounded-xl bg-orange-600 text-white font-bold text-xs">
       Back to account
      </button>
     </div>
    ) : loading ? (
     <div aria-label="Loading confirmed orders" className="space-y-4">
      {[1,2,3].map(n=>(
       <div key={n} className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2"/>
        <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-md w-1/3"/>
        <div className="h-10 bg-slate-100 dark:bg-slate-700/40 rounded-2xl"/>
       </div>
      ))}
     </div>
    ) : orders.length===0 ? (
     <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
       <Receipt className="w-8 h-8 opacity-40"/>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
       {error?"Order history unavailable":"No confirmed pickup orders yet"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
       {error?"The server has not confirmed your history. Retry to check.":"No confirmed pickup orders were returned for this signed-in account. Older legacy orders are not included in this Preview."}
      </p>
      <button type="button" onClick={onBack}
       className="px-6 min-h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition">
       Explore Nearby Shops
      </button>
     </div>
    ) : orders.map(order=>{
     const status=confirmedPickupDisplayStatus(order.status);
     const total=confirmedPickupTotal(order);
     const shop=shops.find(value=>String(value.id)===String(order.shop_id));
     const createdAt=Date.parse(order.created_at||"");
     const dateLabel=Number.isFinite(createdAt)?new Date(createdAt).toLocaleDateString(undefined,{
      month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",
     }):"Date unavailable";
     const items=Array.isArray(order.items)?order.items.filter(item=>item&&typeof item.name==="string"&&typeof item.quantity==="number"&&item.quantity>0):[];
     return (
      <article key={order.id} className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
       <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
         <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{confirmedPickupShopName(order,shops)}</h3>
         <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
          <Clock className="w-3.5 h-3.5"/>{dateLabel}
         </p>
        </div>
        <div className="text-right shrink-0">
         <p className="text-sm font-black text-slate-900 dark:text-white">{total!==null?`R${total.toFixed(2)}`:"Amount unavailable"}</p>
         <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-[10px] font-bold ${toneClasses[status.tone]}`}>{status.label}</span>
        </div>
       </div>
       {items.length>0 ? (
        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
         {items.map((item,index)=>(
          <span key={String(item.menu_item_id||index)}>
           {item.quantity}x {item.name}{index<items.length-1?", ":""}
          </span>
         ))}
        </div>
       ) : <p className="text-xs text-slate-500 dark:text-slate-400">Menu item details unavailable</p>}
       <p className="text-xs text-slate-600 dark:text-slate-300">{confirmedPickupPayment(order)}</p>
       <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3 gap-2">
        <span className="text-[10px] font-mono text-slate-400 truncate">ID: #{order.id.slice(0,8)}</span>
        <div className="flex items-center gap-2 shrink-0">
         <button type="button" onClick={()=>{triggerHaptic?.(8);onViewOrder(order.id);}}
          className="min-h-11 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-xs inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-orange-500">
          View Status <ChevronRight className="w-4 h-4"/>
         </button>
         <button type="button" disabled={!shop} onClick={()=>{if(shop){triggerHaptic?.(8);onOpenShop(shop.id);}}}
          aria-label={shop?`Browse current menu at ${shop.name}`:"Shop menu unavailable"}
          className="min-h-11 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-orange-500">
          <RotateCcw className="w-3.5 h-3.5"/> Current Menu
         </button>
        </div>
       </div>
      </article>
     );
    })}
   </div>
  </div>
 );
}
