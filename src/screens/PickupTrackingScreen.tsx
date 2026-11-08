import {useRef,useState} from 'react';
import {ArrowLeft,RefreshCw,ShoppingBag,Check,Clock,ChefHat,PackageCheck} from 'lucide-react';
import type {PickupOrder} from '../pickup/client';
import type {Shop} from '../types';

interface Props {
 signedIn:boolean; orders:PickupOrder[]|null; error:boolean; refreshing:boolean; authRequired?:boolean; shops:Shop[];
 changesEnabled:boolean; hasPendingCancellation:(order:PickupOrder)=>boolean;
 onCancel:(order:PickupOrder,reason:string)=>Promise<unknown>;
 onBack:()=>void; onRetry:()=>void; onHistory:()=>void; onSignIn:()=>void; onBrowse:()=>void;
}
const stages=[{status:'pending',label:'Pending',icon:Clock},{status:'preparing',label:'Preparing',icon:ChefHat},
 {status:'ready_for_pickup',label:'Ready',icon:PackageCheck},{status:'collected',label:'Collected',icon:Check}];
const descriptions:Record<string,string>={pending:'Waiting for the shop to accept your pickup.',
 preparing:'The shop has accepted your order and is preparing your food.',ready_for_pickup:'Your order is ready. Collect it at the shop.'};

export function PickupTrackingScreen(props:Props){
 const {signedIn,orders,error,refreshing,authRequired=false,shops,changesEnabled,onBack,onRetry,onHistory,onSignIn,onBrowse}=props;
 const [editing,setEditing]=useState<string|null>(null),[reason,setReason]=useState('');
 const [busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState(''),[actionError,setActionError]=useState('');
 const locked=useRef(false);
 const active=orders?.filter(order=>order.delivery_type==='collection'&&!['collected','cancelled'].includes(order.status))??[];
 const cancel=async(order:PickupOrder)=>{
  if(locked.current||error||refreshing||!changesEnabled)return;
  locked.current=true;setBusy(order.id);setActionError('');setNotice('');
  try{await props.onCancel(order,reason);setEditing(null);setReason('');setNotice('Cancellation confirmed by the shop service.');}
  catch(e){setActionError(e instanceof Error?e.message:'Cancellation was not confirmed. Retry or refresh the order.');}
  finally{locked.current=false;setBusy(null);onRetry();}
 };
 return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-32">
  <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
   <button type="button" onClick={onBack} aria-label="Back" className="min-h-11 min-w-11 flex items-center justify-center rounded-xl"><ArrowLeft className="w-5 h-5"/></button>
   <h1 className="flex-1 text-lg font-black text-slate-900 dark:text-white">Track pickup</h1>
   <button type="button" onClick={onRetry} disabled={!signedIn||refreshing||authRequired} aria-label="Refresh pickup status" className="min-h-11 min-w-11 flex items-center justify-center rounded-xl disabled:opacity-50"><RefreshCw className={`w-5 h-5 ${refreshing?'motion-safe:animate-spin':''}`}/></button>
  </header>
  <main className="max-w-2xl mx-auto p-4 space-y-4">
   {notice&&<p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
   {actionError&&<p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{actionError}</p>}
   {signedIn&&error&&<div className="rounded-2xl border border-amber-200 p-4"><p role="status" className="text-sm">{authRequired?'We couldn’t verify your pickup account. Open sign in to check your session. No order changes were made.':orders?.length?'Couldn’t refresh pickup status. These details are from the last successful update.':'Couldn’t load pickup status.'}</p>{authRequired?<button type="button" onClick={onSignIn} className="mt-2 min-h-11 px-4 rounded-xl border border-slate-300">Open sign in</button>:<button type="button" onClick={onRetry} disabled={refreshing} className="mt-2 min-h-11 px-4 rounded-xl border border-slate-300 disabled:opacity-50">{refreshing?'Retrying…':'Retry'}</button>}</div>}
   {!signedIn?<section className="py-16 text-center"><h2 className="font-bold">Sign in to track your pickup</h2><button type="button" onClick={onSignIn} className="mt-4 min-h-11 px-6 rounded-xl bg-orange-600 text-white font-bold">Sign in</button></section>
   :orders===null&&!error?<div role="status" aria-label="Loading pickup orders" className="space-y-4">{[1,2].map(n=><div key={n} className="h-64 rounded-3xl border border-slate-200 bg-white dark:bg-slate-800 motion-safe:animate-pulse"/>)}</div>
   :!error&&active.length===0?<section className="py-16 text-center"><ShoppingBag className="w-12 h-12 mx-auto text-orange-500"/><h2 className="mt-4 font-bold">No active pickups</h2><button type="button" onClick={onBrowse} className="mt-4 min-h-11 px-6 rounded-xl bg-orange-600 text-white font-bold">Browse nearby kitchens</button></section>
   :active.map(order=>{
    const shop=shops.find(s=>s.id===order.shop_id),index=stages.findIndex(s=>s.status===order.status);
    const pending=props.hasPendingCancellation(order),canCancel=order.status==='pending'||pending;
    return <article key={order.id} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
     <div className="flex justify-between gap-3"><div><h2 className="font-black text-slate-900 dark:text-white">{shop?.name||`Store #${order.shop_id}`}</h2><p className="text-xs text-slate-500 mt-1">Order #{order.id.slice(0,8)}</p></div><strong className="whitespace-nowrap">{typeof order.total_price==='number'&&Number.isFinite(order.total_price)?`R ${order.total_price.toFixed(2)}`:'Total unavailable'}</strong></div>
     <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4"><h3 className="font-black text-orange-900 dark:text-orange-200">{order.status==='ready_for_pickup'?'Ready for pickup':stages[index]?.label||'Status unavailable'}</h3><p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{descriptions[order.status]||'Refresh to verify the current pickup status.'}</p></div>
     {index>=0&&<ol aria-label="Pickup progress" className="grid grid-cols-4 gap-1">{stages.map((stage,n)=>{const Icon=stage.icon;return <li key={stage.status} aria-current={n===index?'step':undefined} className={`text-center text-[11px] font-bold ${n<=index?'text-orange-700 dark:text-orange-300':'text-slate-500'}`}><span className={`w-9 h-9 mx-auto mb-2 rounded-full flex items-center justify-center ${n<=index?'bg-orange-100 dark:bg-orange-950':'bg-slate-100 dark:bg-slate-700'}`}><Icon className="w-4 h-4"/></span>{stage.label}</li>;})}</ol>}
     <p className="text-sm font-semibold">{order.payment_status==='paid'?'Paid at shop':order.payment_status==='unpaid'?'Unpaid · Pay at shop':'Payment status unavailable'}</p>
     <p className="text-xs text-slate-500">Wait for Ready before collecting. The shop confirms payment and food handover separately.</p>
     {Array.isArray(order.items)&&<p className="text-sm rounded-2xl bg-slate-50 dark:bg-slate-900 p-3">{order.items.map(item=>`${item.quantity} × ${item.name}`).join(', ')}</p>}
     {canCancel&&(editing!==order.id?<button type="button" onClick={()=>{setEditing(order.id);setReason('');setActionError('');}} disabled={!changesEnabled||error||refreshing||!!busy} className="min-h-11 px-4 rounded-xl border border-rose-200 text-rose-700 font-semibold disabled:opacity-50">{pending?'Retry cancellation':'Cancel pickup'}</button>
      :<form onSubmit={event=>{event.preventDefault();void cancel(order);}} className="space-y-3 border-t pt-4">
       {pending?<p className="text-sm">Retry uses your original cancellation request.</p>:<label className="block text-sm font-semibold">Cancellation reason<textarea value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} required className="mt-2 w-full min-h-24 border border-slate-300 rounded-xl p-3 bg-transparent"/></label>}
       <div className="flex flex-wrap gap-2"><button type="submit" disabled={!!busy||error||refreshing||!changesEnabled||(!pending&&!reason.trim())} className="min-h-11 px-4 bg-rose-700 text-white rounded-xl disabled:opacity-50">{busy===order.id?'Confirming cancellation…':pending?'Retry cancellation':'Confirm cancellation'}</button><button type="button" onClick={()=>setEditing(null)} disabled={!!busy} className="min-h-11 px-4 border rounded-xl">Keep order</button></div>
      </form>)}
    </article>;
   })}
   {signedIn&&<button type="button" onClick={onHistory} className="min-h-11 px-4 rounded-xl border border-slate-300 text-sm font-bold">View order history</button>}
  </main>
 </div>;
}
