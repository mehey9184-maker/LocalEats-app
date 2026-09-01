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
import { Shop, UserProfile, Order } from "../types";
import { supabase } from "../lib/supabase";

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
  showConfirm,
  shops = [],
  addToCart,
  setCart,
  setCurrentScreen,
  triggerHaptic,
  onScanFlyer,
}: OrderHistoryScreenProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const userId = session?.user?.id || userProfile?.id;
        if (userId) {
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(30);

          if (error) {
            console.debug("Supabase orders history notice:", error);
          } else if (data) {
            setOrders(data as Order[]);
          }
        }
      } catch (err) {
        console.debug("Order history fetch notice:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [session?.user?.id, userProfile?.id]);

  const handleReorder = (order: Order) => {
    if (triggerHaptic) triggerHaptic(10);
    const shop = shops.find((s) => String(s.id) === String(order.shop_id));
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      if (showConfirm) {
        showConfirm(
          "Reorder Items",
          `Add ${order.items.length} items from ${shop?.name || "this store"} to your current cart?`,
          () => {
            order.items.forEach((item) => {
              addToCart(
                item,
                String(order.shop_id),
                shop?.name || "Local Eats",
                shop?.logo || ""
              );
            });
            showAlert("Cart Updated", "Items added to your bag!", "success");
            if (setCurrentScreen) setCurrentScreen("checkout");
          }
        );
      } else {
        order.items.forEach((item) => {
          addToCart(
            item,
            String(order.shop_id),
            shop?.name || "Local Eats",
            shop?.logo || ""
          );
        });
        showAlert("Cart Updated", "Items added to your bag!", "success");
        if (setCurrentScreen) setCurrentScreen("checkout");
      }
    } else {
      showAlert("Notice", "Order item details are not available for direct reordering.", "info");
    }
  };

  const formatStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
      case "completed":
        return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Delivered</span>;
      case "out_for_delivery":
      case "delivering":
        return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">On the way</span>;
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
              Receipts, tracking & reordering
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
        {loading ? (
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
              No orders placed yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
              When you order legendary local Kotas and meals, your receipt and tracking history will appear here.
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
              !["delivered", "completed", "cancelled", "declined"].includes(
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
                      R{Number(order.total_amount || order.total || 0).toFixed(2)}
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
                          setCurrentScreen("order-tracking");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Track Live
                      </button>
                    )}

                    <button
                      onClick={() => handleReorder(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Order Again
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
