import React, { useState } from 'react';
import { Layers, MapPin, Store, Bike, ChevronDown, ChevronUp, Crosshair, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface MapLegendProps {
  userLocation?: { lat: number; lng: number } | null;
  activeFilter?: 'all' | 'customer' | 'shop' | 'closed_shop' | 'rider';
  onSelectFilter?: (filter: 'all' | 'customer' | 'shop' | 'closed_shop' | 'rider') => void;
  shopCount?: number;
  riderCount?: number;
  onFocusCustomer?: () => void;
  onFocusShop?: () => void;
  onFocusRider?: () => void;
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  userLocation,
  activeFilter = 'all',
  onSelectFilter,
  shopCount,
  riderCount,
  onFocusCustomer,
  onFocusShop,
  onFocusRider,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const legendItems = [
    {
      id: 'customer' as const,
      title: 'Customer Location',
      badge: 'Blue Pin',
      desc: userLocation ? 'Your verified live delivery spot' : 'Tap locate to display your spot',
      color: 'bg-blue-600',
      borderColor: 'border-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
      icon: (
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white animate-pulse">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
        </div>
      ),
      action: onFocusCustomer,
    },
    {
      id: 'shop' as const,
      title: 'Open Kitchen / Shop',
      badge: shopCount !== undefined ? `${shopCount} Stores` : 'Orange Pin',
      desc: 'Orange Pins — Active food vendors ready for orders',
      color: 'bg-orange-600',
      borderColor: 'border-orange-500',
      lightBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
      icon: (
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md border-2 border-white">
            <Store className="w-3.5 h-3.5" />
          </div>
          <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
        </div>
      ),
      action: onFocusShop,
    },
    {
      id: 'closed_shop' as const,
      title: 'Closed Kitchen',
      badge: 'Gray Pin',
      desc: 'Muted Slate Pins — Vendors currently offline/closed',
      color: 'bg-slate-500',
      borderColor: 'border-slate-400',
      lightBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      icon: (
        <div className="relative flex items-center justify-center opacity-75">
          <div className="w-6 h-6 rounded-lg bg-slate-500 text-white flex items-center justify-center shadow-md border-2 border-white">
            <Store className="w-3.5 h-3.5" />
          </div>
          <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
        </div>
      ),
      action: onFocusShop,
    },
    {
      id: 'rider' as const,
      title: 'Live Courier / Driver',
      badge: riderCount !== undefined ? `${riderCount} Active` : 'Indigo Pin',
      desc: 'Indigo Pins — Live township delivery couriers',
      color: 'bg-indigo-600',
      borderColor: 'border-indigo-500',
      lightBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
      icon: (
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-white">
            <Bike className="w-3.5 h-3.5" />
          </div>
          <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
        </div>
      ),
      action: onFocusRider,
    },
  ];

  return (
    <div className={`relative z-[1000] select-none ${className}`}>
      {/* Legend Header Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl text-slate-800 dark:text-slate-100 transition-all flex items-center gap-2 cursor-pointer active:scale-95 group"
        title="Toggle Map Pin Legend"
      >
        <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
          <Layers className="w-4 h-4" />
        </div>
        <div className="text-left flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider leading-none flex items-center gap-1">
            Map Legend
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          </span>
          <span className="text-[10px] whitespace-nowrap font-bold text-slate-400 dark:text-slate-500 leading-none mt-0.5">
            {isOpen ? 'Tap to hide' : 'Customer & Shop pins'}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
        )}
      </button>

      {/* Expanded Interactive Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Interactive Pin Types
              </span>
              {onSelectFilter && (
                <button
                  type="button"
                  onClick={() => onSelectFilter('all')}
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Show All
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {legendItems.map((item) => {
                const isSelected = activeFilter === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelectFilter) {
                        onSelectFilter(isSelected ? 'all' : item.id);
                      }
                      if (item.action) {
                        item.action();
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? `${item.lightBg} ${item.borderColor} shadow-sm ring-1 ${item.borderColor}`
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0">{item.icon}</div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-850 dark:text-slate-100 truncate">
                            {item.title}
                          </span>
                          <span className={`text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded-md ${item.lightBg}`}>
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {item.action && (
                        <span className="text-slate-400 hover:text-orange-500 transition-colors p-1" title="Focus on Map">
                          <Crosshair className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-center">
              <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                💡 Click any pin type to focus or highlight on map
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
