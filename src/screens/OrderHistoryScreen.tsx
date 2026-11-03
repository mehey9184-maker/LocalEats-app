import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  MapPin,
  ChevronRight,
  RotateCcw,
  Receipt,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { Shop, UserProfile } from "../types";
import type {PickupOrder} from "../pickup/client";
import {customerPickupApi} from "../services/customerPickup";
import {auth} from "../lib/firebase";

interface OrderHistoryScreenProps {
  session: any;
  onBack: () => void;
  userProfile: UserProfile;
  showAlert: (title: string, message: string, type?: "success" | "error" | "info" | "warning") => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  isOnline?: boolean;
  shops: Shop[];
  addToCart: any;
  setCart: (cart: any) => void;
  setCurrentScreen?: (screen: any) => void;
  triggerHaptic?: (duration?: number) => void;
  onScanFlyer?: () => void;
}

export function OrderHistoryScreen({
  session,
  onBack,
  userProfile,
  showAlert,
  shops = [],
  setCurrentScreen,
  triggerHaptic,
  onScanFlyer,
}: OrderHistoryScreenProps) {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string|null>(null);
  const [lastCheckedAt,setLastCheckedAt] = useState<string|null>(null);
  const [refreshKey,setRefreshKey] = useState(0);
  const ownerUid = session?.user?.id;

  useEffect(() => {
    let active=true;
    setOrders([]);
    setHistoryError(null);
    setLastCheckedAt(null);
    if (!ownerUid) {setLoading(false);return()=>{active=false;};}
    setLoading(true);
    void (async()=>{
      try {
        // Never trust the previous user's cached profile or a mock DB result.
        if(auth.currentUser?.uid!==ownerUid)
          throw new Error("Sign in again to verify the account owning these orders.");
        const result=await customerPickupApi.orders();
        if(!Array.isArray(result.orders) || result.orders.some(o=>
          !o || typeof o.id!=="string" || o.user_id!==ownerUid))
          throw new Error("The history response was not confirmed for your signed-in account.");
        const pickups=result.orders.filter(o=>o.delivery_type==="collection");
        if(active){
          setOrders(pickups);
          setLastCheckedAt(new Date().toLocaleTimeString());
        }
      }catch(e){
        if(active){setOrders([]);setHistoryError(e instanceof Error?e.message:"Order history unavailable.");}
      }finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[ownerUid,refreshKey]);

  const handleCurrentMenu=(order:PickupOrder)=>{
    if(triggerHaptic)triggerHaptic(10);
    // Historical prices and menu availability are never reused for a new cart.
    const shop=shops.find(s=>String(s.id)===String(order.shop_id));
    showAlert("Current Menu",shop
      ? "Reopen this shop from Home to see its current menu and verified prices."
      : "This shop is not currently available in your nearby catalog. No order was created.","info");
    if(shop&&setCurrentScreen)setCurrentScreen("home");
  };

  const formatStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "collected":
      case "completed":
        return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Collected</span>;
      case "out_for_delivery":
      case "delivering":
        return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">On the way</span>;
      case "ready_for_pickup":
        return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ready for collection</span>;
      case "cooking":
      case "preparing":
        return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">Preparing</span>;
      case "cancelled":
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">Cancelled</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{status || "Pending"}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Order History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirmed pickup orders · current account
            </p>
          </div>
        </div>

        {onScanFlyer && (
          <button
            onClick={onScanFlyer}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Scan receipt QR"
          >
            <QrCode className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Pickup history only. Older legacy orders aren't imported into this list.</p>
          {ownerUid && <button type="button" onClick={()=>setRefreshKey(k=>k+1)} disabled={loading}
            className="text-xs font-bold text-orange-700 disabled:opacity-50">Refresh</button>}
        </div>
        {lastCheckedAt && <p className="text-xs text-slate-500">Last checked: {lastCheckedAt}</p>}
        {!ownerUid ? (
          <div role="status" className="text-center py-12 px-4 text-sm text-slate-600 dark:text-slate-300">
            Sign in with your LocalEats account to check confirmed pickup orders.
          </div>
        ) : historyError ? (
          <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/40 p-4 text-sm text-orange-800 dark:text-orange-200">
            Couldn't verify your order history. {historyError} Nothing was deleted. Tap Refresh to retry.
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={`history-skeleton-${n}`}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm animate-pulse space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 w-1/2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded-md w-1/2" />
                  </div>
                  <div className="space-y-1.5 w-20 flex flex-col items-end">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-14" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded-full w-16" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 dark:bg-slate-700/40 rounded-2xl" />
                <div className="flex justify-between pt-1">
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-20" />
                  <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-xl w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Receipt className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No confirmed pickup orders returned
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
              The server returned no confirmed pickups for this signed-in account. Older orders from previous LocalEats systems aren't included here.
            </p>
            {setCurrentScreen && (
              <button
                onClick={() => setCurrentScreen("home")}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-md shadow-orange-600/20"
              >
                Explore Nearby Spots
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => {
            const shop = shops.find((s) => String(s.id) === String(order.shop_id));
            const isOngoing =
              order.status &&
              !["collected", "completed", "cancelled", "declined"].includes(
                order.status.toLowerCase()
              );
            const dateStr = order.created_at
              ? new Date(order.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent Order";

            return (
              <div
                key={order.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {shop?.name || `Store #${order.shop_id}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {dateStr}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      R{Number(order.total_price).toFixed(2)}
                    </span>
                    <div className="mt-1">{formatStatus(order.status)}</div>
                  </div>
                </div>

                {order.items && Array.isArray(order.items) && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {order.items.map((it: any, idx: number) => (
                      <span key={idx}>
                        {it.quantity || 1}x {it.name || "Menu item"}
                        {idx < order.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: #{String(order.id).slice(0, 8)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {isOngoing && setCurrentScreen && (
                      <button
                        onClick={() => {
                          if (triggerHaptic) triggerHaptic(8);
                          showAlert("Confirmed pickup status",`Latest confirmed status: ${order.status}. Refresh for a newer update.`,"info");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        View Status
                      </button>
                    )}

                    <button
                      onClick={() => handleCurrentMenu(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Current Menu
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
