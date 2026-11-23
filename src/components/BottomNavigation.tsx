import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Home, Compass, MapPin, ShoppingBag, UserRound } from "lucide-react";
import { Screen } from "../types";

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  activeOrdersCount: number;
  triggerHaptic?: (intensity?: number) => void;
  isOnline?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  activeOrdersCount,
  triggerHaptic,
  isOnline = true,
}) => {
  const reduceMotion=useReducedMotion();
  // Screens where the persistent bottom navigation should be visible
  const customerNavScreens: Screen[] = [
    "home",
    "discover",
    "explore",
    "order-tracking",
    "order-history",
    "profile",
    "notifications",
    "settings",
    "store-info",
    "contact",
  ];

  if (!customerNavScreens.includes(currentScreen)) {
    return null;
  }

  const handleNavClick = (screen: Screen) => {
    // Re-selecting the active destination must not reset the screen or
    // retrigger location, network effects and unnecessary haptics.
    if (screen === currentScreen) return;
    if (triggerHaptic) triggerHaptic(5);
    onNavigate(screen);
  };

  const isOrdersActive =
    currentScreen === "order-tracking" || currentScreen === "order-history";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-slate-100/80 via-slate-100/40 to-transparent dark:from-slate-950/80 dark:via-slate-950/40 pointer-events-none flex flex-col items-center justify-end transition-all">
      <nav
        id="persistent-bottom-navigation"
        aria-label="Main navigation"
        className="w-full max-w-md md:max-w-lg mx-auto flex justify-around items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] border border-slate-200/70 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] pointer-events-auto"
      >
        {/* Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-label="Home"
          aria-current={currentScreen === "home" ? "page" : undefined}
          onClick={() => handleNavClick("home")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 active:scale-95 motion-reduce:active:scale-100 cursor-pointer group ${
            currentScreen === "home"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform motion-reduce:transition-none group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
              currentScreen === "home"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <motion.span className="flex items-center justify-center" aria-hidden="true"
              animate={reduceMotion ? undefined : (currentScreen === "home" ? {scale:1.12,y:-1} : {scale:1,y:0})}
              transition={{type:"spring",stiffness:370,damping:24}}>
              <Home className="h-5 w-5" strokeWidth={currentScreen === "home" ? 2.5 : 2} fill={currentScreen === "home" ? "currentColor" : "none"}/>
            </motion.span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Home
          </span>
        </button>

        {/* Discover */}
        <button
          id="nav-tab-discover"
          type="button"
          aria-label="Discover"
          aria-current={currentScreen === "discover" ? "page" : undefined}
          onClick={() => handleNavClick("discover")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 active:scale-95 motion-reduce:active:scale-100 cursor-pointer group ${
            currentScreen === "discover"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform motion-reduce:transition-none group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
              currentScreen === "discover"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <motion.span className="flex items-center justify-center" aria-hidden="true"
              animate={reduceMotion ? undefined : (currentScreen === "discover" ? {scale:1.12,y:-1} : {scale:1,y:0})}
              transition={{type:"spring",stiffness:370,damping:24}}>
              <Compass className="h-5 w-5" strokeWidth={currentScreen === "discover" ? 2.5 : 2} />
            </motion.span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Discover
          </span>
        </button>

        {/* Explore / Map */}
        <button
          id="nav-tab-explore"
          type="button"
          aria-label="Map"
          aria-current={currentScreen === "explore" ? "page" : undefined}
          onClick={() => handleNavClick("explore")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 active:scale-95 motion-reduce:active:scale-100 cursor-pointer group ${
            currentScreen === "explore"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform motion-reduce:transition-none group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
              currentScreen === "explore"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <motion.span className="flex items-center justify-center" aria-hidden="true"
              animate={reduceMotion ? undefined : (currentScreen === "explore" ? {scale:1.12,y:-1} : {scale:1,y:0})}
              transition={{type:"spring",stiffness:370,damping:24}}>
              <MapPin className="h-5 w-5" strokeWidth={currentScreen === "explore" ? 2.5 : 2} />
            </motion.span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Map
          </span>
        </button>

        {/* Orders (Tracking or History) */}
        <button
          id="nav-tab-orders"
          type="button"
          aria-label={activeOrdersCount>0 ? `Orders, ${activeOrdersCount} active pickup${activeOrdersCount===1 ? "" : "s"}` : "Orders"}
          aria-current={isOrdersActive ? "page" : undefined}
          onClick={() => {
            if (activeOrdersCount > 0) {
              handleNavClick("order-tracking");
            } else {
              handleNavClick("order-history");
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 active:scale-95 motion-reduce:active:scale-100 cursor-pointer group ${
            isOrdersActive
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform motion-reduce:transition-none group-hover:scale-110 motion-reduce:group-hover:scale-100 relative ${
              isOrdersActive
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <motion.span className="flex items-center justify-center" aria-hidden="true"
              animate={reduceMotion ? undefined : (isOrdersActive ? {scale:1.12,y:-1} : {scale:1,y:0})}
              transition={{type:"spring",stiffness:370,damping:24}}>
              <ShoppingBag className="h-5 w-5" strokeWidth={isOrdersActive ? 2.5 : 2} />
            </motion.span>
            <AnimatePresence>
              {activeOrdersCount > 0 && (
                <motion.span
                  key={`orders-badge-${activeOrdersCount}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={reduceMotion ? {duration:0} : { type: "spring", stiffness: 500, damping: 18 }}
                  className="absolute -top-1 -right-1 flex h-4 w-4"
                >
                  <span aria-hidden="true" className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-30"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[9px] font-bold text-white items-center justify-center shadow-sm">
                    {activeOrdersCount}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Orders
          </span>
        </button>

        {/* Profile */}
        <button
          id="nav-tab-profile"
          type="button"
          aria-label="Profile"
          aria-current={currentScreen === "profile" ? "page" : undefined}
          onClick={() => handleNavClick("profile")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 active:scale-95 motion-reduce:active:scale-100 cursor-pointer group ${
            currentScreen === "profile"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform motion-reduce:transition-none group-hover:scale-110 motion-reduce:group-hover:scale-100 relative ${
              currentScreen === "profile"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <motion.span className="flex items-center justify-center" aria-hidden="true"
              animate={reduceMotion ? undefined : (currentScreen === "profile" ? {scale:1.12,y:-1} : {scale:1,y:0})}
              transition={{type:"spring",stiffness:370,damping:24}}>
              <UserRound className="h-5 w-5" strokeWidth={currentScreen === "profile" ? 2.5 : 2} />
            </motion.span>
            {!isOnline && (
              <span
                className="absolute 0 top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                title="Working offline"
              />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5">
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
};
