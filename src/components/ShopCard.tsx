import React, { memo } from "react";
import { motion } from "motion/react";
import {
  Star,
  Plus,
  Heart,
  ShieldCheck,
  Sparkles,
  Clock,
  MapPin,
  Flame,
} from "lucide-react";
import { Shop, MenuItem } from "../types";
import { BlurUpImage } from "./BlurUpImage";
import {
  getShopStatus,
  isShopAway,
  DEFAULT_MENU_IMAGE,
  formatRand,
} from "../utils";

export const ShopCard = memo(
  ({
    shop,
    isFollowed,
    onStoreInfo,
    triggerHaptic,
    dataSaverEnabled,
  }: {
    shop: Shop;
    isFollowed: boolean;
    onStoreInfo: (id: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    dataSaverEnabled?: boolean;
  }) => {
    const status = getShopStatus(shop);

    // Dynamic price tier based on menu items average
    const getPriceTier = (s: Shop) => {
      if (!s.menu || s.menu.length === 0) return "R";
      const avg = s.menu.reduce((acc, item) => acc + (item.price || 0), 0) / s.menu.length;
      if (avg < 45) return "R";
      if (avg < 80) return "RR";
      return "RRR";
    };

    // Stable distance calculation or fallback
    const getShopDistance = (s: Shop) => {
      if (s.distance !== undefined && s.distance !== null) {
        return `${s.distance.toFixed(1)} km`;
      }
      const num = s.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const km = 0.4 + (num % 18) * 0.1;
      return `${km.toFixed(1)} km`;
    };

    // Appetizing food cover photo based on category or menu items
    const getShopHeroImage = (s: Shop) => {
      if (s.images && s.images.length > 0 && !s.images[0].includes("unsplash.com/photo-1546069901-ba9599a7e63c")) {
        return s.images[0];
      }
      if (s.menu && s.menu.length > 0 && s.menu[0].image) {
        return s.menu[0].image;
      }
      const cat = (s.category || "").toLowerCase();
      if (cat.includes("kota") || cat.includes("spatlo")) {
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600";
      }
      if (cat.includes("braai") || cat.includes("shisa") || cat.includes("meat")) {
        return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600";
      }
      return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600";
    };

    const heroImage = getShopHeroImage(shop);
    const priceTier = getPriceTier(shop);
    const distanceStr = getShopDistance(shop);
    const etaStr = shop.delivery_eta || "20-35 min";

    return (
      <motion.div
        layout
        layoutId={`shop-card-${shop.id}`}
        variants={{
          hidden: { opacity: 0, y: 15, scale: 0.98 },
          show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              type: "spring",
              damping: 25,
              stiffness: 300,
            },
          },
        }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          triggerHaptic();
          onStoreInfo(shop.id);
        }}
        className={`flex flex-col bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden transition-all duration-200 cursor-pointer relative group border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-orange-400 dark:hover:border-orange-500/40 w-full h-full active:scale-[0.98] transform ${
          !status.isOpen ? "opacity-80" : ""
        }`}
      >
        {/* Top Half: Appetite-Appealing Hero Image */}
        <div className={`aspect-[16/10] sm:aspect-video w-full overflow-hidden relative bg-slate-100 dark:bg-slate-800 shrink-0 ${
          !status.isOpen ? "grayscale-[0.35]" : ""
        }`}>
          {dataSaverEnabled ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
              <span className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest px-4 text-center">
                [ Image Hidden - Data Saver ]
              </span>
            </div>
          ) : (
            <BlurUpImage
              src={heroImage}
              alt={shop.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
            />
          )}

          {/* Gradient Overlay for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

          {/* Absolute Overlays: Gastro Highlights */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {shop.is_special ? (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
                <Flame className="w-3 h-3 fill-current" />
                Township Favourite
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                {priceTier} • {shop.category || "Local Spot"}
              </span>
            )}
          </div>

          {/* Status & ETA Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md backdrop-blur-md border ${
                status.isOpen
                  ? "bg-emerald-500/90 text-white border-emerald-400/80"
                  : "bg-slate-900/85 text-slate-200 border-slate-700"
              }`}
            >
              {status.isOpen ? "Open Now" : "Closed"}
            </span>

            {/* Heart indicator for Followed */}
            {isFollowed && (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-full shadow-md border border-slate-100 dark:border-slate-800">
                <Heart className="w-3.5 h-3.5 text-orange-500 fill-current" />
              </div>
            )}
          </div>

          {/* Bottom Floating Pill inside Hero: ETA and Distance */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold z-10 drop-shadow-sm">
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
              <Clock className="w-3 h-3 text-orange-400" />
              <span>{etaStr}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>{distanceStr}</span>
            </div>
          </div>
        </div>

        {/* Bottom Half: Merchant Info & Decision Metrics */}
        <div className="p-4 sm:p-5 flex flex-col flex-grow flex-1 gap-2 min-h-[110px] relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 break-words group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
              {shop.name}
              <div className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-0.5 rounded-full" title="Verified Township Kitchen">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </h4>
          </div>

          {/* Social Proof & Rating Metrics */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/20">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-black">{shop.rating || "4.8"}</span>
              <span className="text-[10px] font-semibold opacity-75">
                ({shop.reviewCount || 24})
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700">•</span>

            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
              {shop.address || "Local Kitchen"}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-auto pt-1 overflow-hidden flex-wrap">
            {isShopAway(shop) && (
              <span className="text-[10px] font-black bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse border border-rose-200 dark:border-rose-900/40">
                ⚠️ Temporarily Away
              </span>
            )}
            {!status.isOpen && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Opens {status.nextOpeningTime || "Soon"}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

export const MenuItemSkeleton = memo(() => (
  <div className="bg-white dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-4 animate-pulse shadow-sm">
    <div className="size-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
    </div>
    <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  </div>
));

export const MenuItemCard = memo(
  ({
    item,
    shop,
    addToCart,
    showAlert,
    setCurrentScreen,
    onSelect,
  }: {
    item: MenuItem;
    shop: Shop;
    addToCart?: (
      item: MenuItem,
      shopId: string,
      quantity?: number,
      specialInstructions?: string,
      selectedCustomizations?: { name: string; price: number }[],
    ) => void;
    showAlert: (title: string, message: string) => void;
    setCurrentScreen?: (screen: any) => void;
    onSelect?: (item: MenuItem) => void;
  }) => {
    const status = getShopStatus(shop);
    const isUnavailable = !status.isOpen || item.is_available === false || isShopAway(shop);

    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10, scale: 0.98 },
          show: { opacity: 1, y: 0, scale: 1 },
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex gap-4 group hover:border-orange-500/40 hover:shadow-md transition-all cursor-pointer shadow-xs"
        onClick={() => {
          if (!status.isOpen) {
            showAlert(
              "Closed",
              `This store is currently closed. ${status.message}`,
            );
            return;
          }
          if (isShopAway(shop)) {
            showAlert(
              "Ordering Disabled",
              "This shop hasn't updated its live heartbeat recently. To protect your funds, ordering is temporarily paused."
            );
            return;
          }
          if (item.is_available === false) {
            showAlert("Out of Stock", "This item is currently sold out.");
            return;
          }
          if (onSelect) {
            onSelect(item);
          } else if (addToCart && setCurrentScreen) {
            addToCart(item, shop.id, 1);
            setCurrentScreen("checkout");
          }
        }}
      >
        {/* Food Thumbnail with high-contrast ratio */}
        <div className="size-20 rounded-xl overflow-hidden shrink-0 shadow-xs relative bg-slate-100 dark:bg-slate-800">
          <BlurUpImage
            src={item.image || DEFAULT_MENU_IMAGE}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`}
          />
          {item.customizations && item.customizations.length > 0 && (
            <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-amber-300 p-1 rounded-md">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Item Content & Price Action */}
        <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-orange-600 transition-colors truncate">
                {item.name}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              {item.description || "Freshly made township favourite prepared with local ingredients"}
            </p>
            {item.dietary_tags && item.dietary_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.dietary_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-tight bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-1">
            <p className="font-black text-orange-600 dark:text-orange-400 text-sm tracking-tight">
              {item.displayPrice || formatRand(item.price || 0)}
            </p>

            <button
              type="button"
              className={`h-9 px-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-[11px] font-black uppercase tracking-wider ${
                isUnavailable
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-orange-600 text-white shadow-orange-600/20 group-hover:bg-orange-700 active:scale-95 cursor-pointer"
              }`}
            >
              <span>
                {!status.isOpen
                  ? "Closed"
                  : isShopAway(shop)
                    ? "Away"
                    : item.is_available === false
                      ? "Sold Out"
                      : item.customizations && item.customizations.length > 0
                        ? "Customise"
                        : "Add"}
              </span>
              {!isUnavailable && <Plus className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);
