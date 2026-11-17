import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, Compass, MapPin, ClipboardList, User } from "lucide-react";
import { Screen } from "../types";

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  activeOrdersCount: number;
  triggerHaptic?: (intensity?: number) => void;
  isOnline?: boolean;
}

/** Shared screen scope: only these pages reserve space for persistent navigation. */
export const customerNavScreens: ReadonlyArray<Screen> = [
  "home", "discover", "explore", "order-tracking", "order-history",
  "profile", "notifications", "settings", "store-info", "contact",
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  activeOrdersCount,
  triggerHaptic,
  isOnline = true,
}) => {
  // Keep content below this overlay reachable, even with large text or the
  // iPhone/Android home indicator. Use the actual rendered navigation height
  // instead of assuming a hard-coded number of pixels.
  const barRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const element = barRef.current;
    if (!element) return;
    const updateClearance = () => {
      const measured = element.getBoundingClientRect().height;
      if (measured > 0) {
        document.documentElement.style.setProperty(
          "--customer-bottom-nav-clearance", `${Math.ceil(measured + 16)}px`
        );
      }
    };
    updateClearance();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateClearance) : null;
    observer?.observe(element);
    window.addEventListener("resize", updateClearance, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateClearance);
      document.documentElement.style.removeProperty("--customer-bottom-nav-clearance");
    };
  }, [currentScreen]);

  if (!customerNavScreens.includes(currentScreen)) {
    return null;
  }

  const handleNavClick = (screen: Screen) => {
    if (triggerHaptic) {
      triggerHaptic(5);
    }
    onNavigate(screen);
  };

  const isOrdersActive =
    currentScreen === "order-tracking" || currentScreen === "order-history";

  return (
    <div ref={barRef} data-customer-bottom-nav="true" className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-slate-100/80 via-slate-100/40 to-transparent dark:from-slate-950/80 dark:via-slate-950/40 pointer-events-none flex flex-col items-center justify-end transition-all">
      <nav
        id="persistent-bottom-navigation"
        aria-label="Customer main navigation"
        className="w-full max-w-md md:max-w-lg mx-auto flex justify-around items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] border border-slate-200/70 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] pointer-events-auto"
      >
        {/* Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-current={currentScreen === "home" ? "page" : undefined}
          aria-label="Home"
          onClick={() => handleNavClick("home")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer group ${
            currentScreen === "home"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "home"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <Home aria-hidden="true" className="w-5 h-5 transition-transform" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight mt-0.5">
            Home
          </span>
        </button>

        {/* Discover */}
        <button
          id="nav-tab-discover"
          type="button"
          aria-current={currentScreen === "discover" ? "page" : undefined}
          aria-label="Discover"
          onClick={() => handleNavClick("discover")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer group ${
            currentScreen === "discover"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "discover"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <Compass aria-hidden="true" className="w-5 h-5 transition-transform" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight mt-0.5">
            Discover
          </span>
        </button>

        {/* Explore / Map */}
        <button
          id="nav-tab-explore"
          type="button"
          aria-current={currentScreen === "explore" ? "page" : undefined}
          aria-label="Map"
          onClick={() => handleNavClick("explore")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer group ${
            currentScreen === "explore"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "explore"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <MapPin aria-hidden="true" className="w-5 h-5 transition-transform" />
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight mt-0.5">
            Map
          </span>
        </button>

        {/* Orders (Tracking or History) */}
        <button
          id="nav-tab-orders"
          type="button"
          aria-current={isOrdersActive ? "page" : undefined}
          aria-label="Orders"
          onClick={() => {
            if (activeOrdersCount > 0) {
              handleNavClick("order-tracking");
            } else {
              handleNavClick("order-history");
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer group ${
            isOrdersActive
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 relative ${
              isOrdersActive
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <ClipboardList aria-hidden="true" className="w-5 h-5 transition-transform" />
            <AnimatePresence>
              {activeOrdersCount > 0 && (
                <motion.span
                  key={`orders-badge-${activeOrdersCount}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="absolute -top-1 -right-1 flex h-4 w-4"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[9px] font-bold text-white items-center justify-center shadow-sm">
                    {activeOrdersCount}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight mt-0.5">
            Orders
          </span>
        </button>

        {/* Profile */}
        <button
          id="nav-tab-profile"
          type="button"
          aria-current={currentScreen === "profile" ? "page" : undefined}
          aria-label="Profile"
          onClick={() => handleNavClick("profile")}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer group ${
            currentScreen === "profile"
              ? "text-orange-600 dark:text-orange-500 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 relative ${
              currentScreen === "profile"
                ? "bg-orange-50 dark:bg-orange-950/50"
                : ""
            }`}
          >
            <User aria-hidden="true" className="w-5 h-5 transition-transform" />
            {!isOnline && (
              <span
                className="absolute 0 top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                title="Working offline"
              />
            )}
          </div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-tight mt-0.5">
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
};
