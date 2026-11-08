import { ArrowLeft, ShoppingBag, Clock, Receipt } from "lucide-react";
import type { Shop } from "../types";
import { pickupStatus, type PickupOrder } from "../pickup/client";

interface OrderHistoryScreenProps {
  signedIn: boolean;
  orders: PickupOrder[] | null;
  error: boolean;
  refreshing: boolean;
  authRequired?: boolean;
  shops: Shop[];
  onBack: () => void;
  onRetry: () => void;
  onSignIn: () => void;
  onBrowse: () => void;
  onStoreInfo: (shopId: string) => void;
}

export function OrderHistoryScreen({
  signedIn, orders, error, refreshing, authRequired = false, shops, onBack, onRetry, onSignIn, onBrowse, onStoreInfo,
}: OrderHistoryScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
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
              Pickup status and order history
            </p>
          </div>
        </div>

      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {signedIn && error && (
          <div className="rounded-2xl border border-amber-200 p-4 dark:border-amber-800">
            <p role="status" className="text-sm text-slate-700 dark:text-slate-200">
              {authRequired
                ? "We couldn’t verify the account for your pickup orders. Please sign in again. Your orders have not been deleted."
                : orders?.length
                  ? "Couldn’t refresh pickup orders. The status below is from the last successful update."
                  : "Couldn’t load pickup orders."}
            </p>
            {authRequired ? (
              <button type="button" onClick={onSignIn}
                className="mt-2 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600">
                Open sign in
              </button>
            ) : (
              <button type="button" onClick={onRetry} disabled={refreshing}
                className="mt-2 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">
                {refreshing ? "Retrying…" : "Retry"}
              </button>
            )}
          </div>
        )}
        {!signedIn ? (
          <div className="py-16 text-center">
            <h2 className="font-semibold">Sign in to see your pickup orders</h2>
            <button type="button" onClick={onSignIn} className="mt-4 min-h-11 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white">
              Sign in
            </button>
          </div>
        ) : orders === null && !error ? (
          <div className="space-y-4" role="status" aria-label="Loading pickup orders">
            {[1, 2, 3].map((n) => (
              <div
                key={`history-skeleton-${n}`}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm motion-safe:animate-pulse space-y-3"
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
        ) : error && !orders?.length ? null : orders?.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Receipt className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No pickup orders yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
              Your pickup orders and their latest status will appear here.
            </p>
            <button type="button" onClick={onBrowse}
              className="min-h-11 rounded-xl bg-orange-600 px-6 text-xs font-bold text-white">
              Browse pickup shops
            </button>
          </div>
        ) : (
          orders?.map((order) => {
            const shop = shops.find(s => s.id === order.shop_id);
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
                      {order.total_price != null && Number.isFinite(Number(order.total_price))
                        ? `R ${Number(order.total_price).toFixed(2)}` : "Total unavailable"}
                    </span>
                    <div className="mt-1">{pickupStatus(order)}</div>
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
                  
                  {shop && (
                    <button type="button" onClick={() => onStoreInfo(shop.id)}
                      className="min-h-11 rounded-xl px-3 text-xs font-semibold text-orange-700 dark:text-orange-300">
                      View current menu
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
