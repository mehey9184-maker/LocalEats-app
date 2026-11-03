import React from "react";
import {ArrowLeft,RefreshCw,ShoppingBag,Clock,CheckCircle2,BookOpen,MapPin} from "lucide-react";
import type {Order,Shop} from "../types";
import {confirmedCustomerPickupOrders,confirmedPickupDisplayStatus,confirmedPickupTotal,confirmedPickupPayment,confirmedPickupShopName} from "../services/customerOrdersPolicy";

interface Props{
 ownerUid?:string;orders:Order[];shops:Shop[];
 selectedOrderId:string|null;loadState:"loading"|"ready"|"error";
 onBack:()=>void;onRefresh:()=>void;onOpenShop:(id:string)=>void;
}
const statusToneClasses={
 slate:"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
 orange:"bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
 blue:"bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
 green:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
 red:"bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};
const stages=[
 {label:"Pending",detail:"Waiting for the shop to accept the order"},
 {label:"Preparing",detail:"The shop accepted the order"},
 {label:"Ready for collection",detail:"Visit the shop when it is ready"},
 {label:"Collected",detail:"The shop confirmed handover"},
];
export function CustomerPickupTrackingScreen({
 ownerUid,orders,shops,selectedOrderId,loadState,onBack,onRefresh,onOpenShop,
}:Props){
 const confirmed=confirmedCustomerPickupOrders(orders,ownerUid);
 const chosen=selectedOrderId?confirmed.find(order=>order.id===selectedOrderId):confirmed.find(order=>!confirmedPickupDisplayStatus(order.status).terminal)||confirmed[0];
 const state=chosen?confirmedPickupDisplayStatus(chosen.status):null;
 const shop=chosen?shops.find(item=>String(item.id)===String(chosen.shop_id)):null;
 const total=chosen?confirmedPickupTotal(chosen):null;
 const created=chosen?Date.parse(chosen.created_at||""):NaN;
 const date=Number.isFinite(created)?new Date(created).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}):"Date unavailable";
 return (
  <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-xl pb-24">
   <header className="sticky top-0 z-50 border-b border-orange-100 dark:border-orange-950 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
     <button type="button" onClick={onBack} aria-label="Back from order status"
      className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-orange-500">
      <ArrowLeft className="w-5 h-5"/>
     </button>
     <div><h1 className="text-lg font-black">Pickup Status</h1><p className="text-xs text-slate-500 dark:text-slate-400">Confirmed by the LocalEats API</p></div>
    </div>
    <button type="button" aria-label="Refresh pickup status" onClick={onRefresh}
     className="min-w-11 min-h-11 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-orange-500">
     <RefreshCw className="w-5 h-5"/>
    </button>
   </header>
   <main className="flex-1 p-4 space-y-4">
    {loadState==="error" && (
     <div role="alert" className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200 text-xs">
      Order status could not refresh. Previously confirmed information may be stale.
      <button type="button" onClick={onRefresh} className="font-bold underline ml-2">Retry</button>
     </div>
    )}
    {loadState==="loading" && !chosen ? (
     <div role="status" className="p-8 text-center text-slate-500">Checking confirmed orders…</div>
    ):!chosen ? (
     <div className="rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center space-y-3">
      <ShoppingBag className="mx-auto text-orange-500 w-10 h-10"/>
      <h2 className="font-bold">{loadState==="error"?"Order details unavailable":"No confirmed pickup order found"}</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Only authenticated, server-confirmed orders appear here. Retry to check the latest status.</p>
      <button type="button" onClick={onRefresh} className="px-5 min-h-11 rounded-xl bg-orange-600 text-white font-bold text-xs">Retry</button>
     </div>
    ):(
     <>
      <section aria-label="Confirmed pickup order" className="rounded-[28px] p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
         <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order #{chosen.id.slice(0,8)}</p>
         <h2 className="text-lg font-black break-words mt-1">{confirmedPickupShopName(chosen,shops)}</h2>
         <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:text-right">
         <p className="text-base font-black">{total!==null?`R${total.toFixed(2)}`:"Amount unavailable"}</p>
         {state && <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusToneClasses[state.tone]}`}>{state.label}</span>}
        </div>
       </div>
       {state?.step===-1 ? (
        <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm">
         {state.label}. Contact the shop if you need more information.
        </div>
       ):(
        <ol className="space-y-0" aria-label="Confirmed pickup progress">
         {stages.map((stage,index)=> {
          const done=index<=state!.step;
          const current=index===state!.step;
          return (
           <li key={stage.label} aria-current={current?"step":undefined} className="flex gap-3 min-h-16">
            <div className="flex flex-col items-center">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${done?"border-orange-600 bg-orange-600 text-white":"border-slate-200 dark:border-slate-700 text-slate-400"}`}>
              {done?<CheckCircle2 className="w-4 h-4"/>:<span className="text-xs font-bold">{index+1}</span>}
             </div>
             {index<stages.length-1 && <div className={`w-0.5 flex-1 min-h-5 ${index<state!.step?"bg-orange-500":"bg-slate-200 dark:bg-slate-800"}`}/>}
            </div>
            <div className="pt-1 pb-5 min-w-0">
             <p className={`text-sm font-bold ${current?"text-orange-700 dark:text-orange-300":done?"text-slate-900 dark:text-white":"text-slate-500 dark:text-slate-400"}`}>{stage.label}</p>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stage.detail}</p>
            </div>
           </li>
          );
         })}
        </ol>
       )}
       <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Payment</p>
         <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{confirmedPickupPayment(chosen)}</p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
         <MapPin className="w-3.5 h-3.5 inline-block mr-1"/>
         Collection at the shop. Payment and handover must be confirmed by the shop.
        </p>
       </div>
       {shop && (
        <button type="button" onClick={()=>onOpenShop(shop.id)}
         className="w-full min-h-12 inline-flex gap-2 items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-2xl focus-visible:outline-2 focus-visible:outline-orange-500">
         <BookOpen className="w-4 h-4"/>View Shop Menu
        </button>
       )}
      </section>
      {confirmed.length>1 && !selectedOrderId && (
       <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
        Showing your most recent active pickup order. Open Order History to choose another order.
       </div>
      )}
     </>
    )}
   </main>
  </div>
 );
}
