import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bike, Utensils, Package, ChevronRight, X, Sparkles, Clock } from "lucide-react";
import { Order, Shop, Screen } from "../types";

interface ActiveOrderMiniTrackerProps {
  orders: Order[];
  shops: Shop[];
  currentScreen: Screen;
  onOpenTracking: (orderId?: string) => void;
  triggerHaptic?: (intensity?: number) => void;
}

export const ActiveOrderMiniTracker: React.FC<ActiveOrderMiniTrackerProps> = ({
  orders,
  shops,
  currentScreen,
  onOpenTracking,
  triggerHaptic,
}) => {
  const [minimized, setMinimized] = useState(false);

  // Hidden on screens where full tracking or checkout is already active
  const hiddenScreens: Screen[] = [
    "order-tracking",
    "checkout",
    "splash",
    "signup",
    "login",
    "verify",
    "setup-pin",
    "setup-password",
    "success",
    "shop-dashboard",
    "admin-orders",
  ];

  if (hiddenScreens.includes(currentScreen)) {
    return null;
  }

  // Find the most recent active order
  const activeOrder = orders.find((o) => {
    const s = (o.status || "").toLowerCase();
    return (
      s !== "completed" &&
      s !== "delivered" &&
      s !== "cancelled" &&
      s !== "declined"
    );
  });

  if (!activeOrder) {
    return null;
  }

  const shop = shops.find((s) => String(s.id) === String(activeOrder.shop_id));
  const shopName = shop?.name || (activeOrder as any).shop_name || "Township Kitchen";

  const getStatusDetails = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("delivering") || s.includes("out_for_delivery") || s.includes("approach")) {
      return {
        label: "Driver on the way 🛵",
        subtext: "Approaching your address",
        icon: Bike,
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/30",
        badgeBg: "bg-blue-600",
      };
    }
    if (s.includes("ready") || s.includes("packed")) {
      return {
        label: "Order is Ready 📦",
        subtext: "Packed & awaiting driver pickup",
        icon: Package,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 border-emerald-500/30",
        badgeBg: "bg-emerald-600",
      };
    }
    if (s.includes("cooking") || s.includes("preparing")) {
      return {
        label: "Freshly Cooking 🔥",
        subtext: "Kitchen is preparing your meal",
        icon: Utensils,
        color: "text-orange-500",
        bg: "bg-orange-500/10 border-orange-500/30",
        badgeBg: "bg-orange-600",
      };
    }
    return {
      label: "Order In Progress ⏳",
      subtext: "Confirming with kitchen",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30",
      badgeBg: "bg-amber-600",
    };
  };

  const statusInfo = getStatusDetails(activeOrder.status);
  const StatusIcon = statusInfo.icon;

  const handleClick = () => {
    if (triggerHaptic) triggerHaptic(8);
    onOpenTracking(String(activeOrder.id));
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-[74px] sm:bottom-[80px] left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none flex justify-center">
        {minimized ? (
          <motion.button
            key="minimized-pill"
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMinimized(false)}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 shadow-xl backdrop-blur-md border border-slate-700/60 dark:border-slate-200 text-xs font-bold cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span>Live Order Active</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded-tracker"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="pointer-events-auto w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-2.5 sm:p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5"
          >
            {/* Left side: Icon with pulse */}
            <div
              onClick={handleClick}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center relative shrink-0 ${statusInfo.bg} transition-transform group-hover:scale-105`}
              >
                <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
              </div>

              {/* Middle text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {shopName}
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-1.5 py-0.2 rounded-md shrink-0">
                    Live
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {statusInfo.label}
                </p>
              </div>
            </div>

            {/* Right side: Action Button & Minimize */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleClick}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-md shadow-orange-600/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Track</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Minimize live tracker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
