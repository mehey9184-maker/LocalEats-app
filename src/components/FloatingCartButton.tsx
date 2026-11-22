import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { CartItem, Screen, Shop } from "../types";

interface FloatingCartButtonProps {
  cart: CartItem[];
  shops: Shop[];
  currentScreen: Screen;
  onOpenCart: () => void;
  triggerHaptic?: (intensity?: number) => void;
}

const ALLOWED_SCREENS: Screen[] = [
  "home",
  "discover",
  "explore",
  "store-info",
  "order-history",
  "profile",
  "notifications",
  "settings",
  "contact",
];

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  cart,
  shops,
  currentScreen,
  onOpenCart,
  triggerHaptic,
}) => {
  const reduceMotion=useReducedMotion();
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    const customSum = (item.selectedCustomizations || []).reduce((c, val) => c + val.price, 0);
    return sum + (item.price + customSum) * item.quantity;
  }, 0);

  const isVisible = totalCount > 0 && ALLOWED_SCREENS.includes(currentScreen);

  return (
    <AnimatePresence initial={false}>
      {isVisible && <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? {opacity:1,y:0,scale:1} : { opacity: 0, y: 12, scale: 0.98 }}
        transition={reduceMotion ? {duration:0} : { type: "spring", stiffness: 360, damping: 30 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40"
      >
        <button
          type="button"
          onClick={() => {
            if (triggerHaptic) triggerHaptic(12);
            onOpenCart();
          }}
          className="w-full py-3 px-4 bg-slate-900/95 dark:bg-slate-950/95 hover:bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-3 active:scale-[0.98] motion-reduce:active:scale-100 transition-all motion-reduce:transition-none cursor-pointer group ring-1 ring-white/10"
          aria-label={`View shopping cart: ${totalCount} ${totalCount===1?"item":"items"}, estimated subtotal R ${subtotal.toFixed(2)}. Final pickup price is confirmed at checkout.`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalCount}
              </span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-black text-white truncate">
                View Food Cart
              </p>
              <p className="text-[10px] font-bold text-orange-400">
                {totalCount} {totalCount === 1 ? "dish" : "dishes"} selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-black text-white bg-white/10 px-2.5 py-1 rounded-lg">
              Est. R {subtotal.toFixed(2)}
            </span>
            <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      </motion.div>}
    </AnimatePresence>
  );
};
