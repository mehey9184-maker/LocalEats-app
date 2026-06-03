import React from 'react';

// A single block with the sweep shimmer animation gradient
export const Shimmer = ({ className = "" }: { className?: string; key?: React.Key }) => {
  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800/80 rounded ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    </div>
  );
};

// Beautiful stats counters summary skeleton at the top
export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col gap-2">
          {/* Stats Label */}
          <Shimmer className="h-3 w-12 bg-slate-200 dark:bg-slate-700" />
          {/* Stats Value */}
          <Shimmer className="h-7 w-16 bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
};

// Premium stack of Facebook-style shimmering order cards matching the original theme layout perfectly
export const OrderHistorySkeleton = () => {
  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Top Row: Order ID, Name, Date vs Badge */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              {/* Order index ID */}
              <Shimmer className="h-3.5 w-24 bg-orange-100/50 dark:bg-orange-950/20" />
              {/* Meal Name */}
              <Shimmer className="h-5.5 w-48 bg-slate-200 dark:bg-slate-750" />
              {/* Timestamp */}
              <Shimmer className="h-3.5 w-32 bg-slate-150 dark:bg-slate-800/60" />
            </div>
            
            {/* Status Pill Badge */}
            <Shimmer className="h-7 w-20 rounded-xl bg-slate-200 dark:bg-slate-750" />
          </div>

          {/* Separator line */}
          <div className="border-t border-dashed border-slate-150 dark:border-slate-800 my-1"></div>

          {/* Live tracking stepper visual mimicry */}
          <div className="px-2 py-3 relative flex justify-between items-center">
            {/* Tracker Bar Thread line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            
            {/* Individual progress node dots */}
            {[1, 2, 3, 4].map((dot) => (
              <Shimmer key={dot} className="size-6.5 rounded-full z-10 border-4 border-white dark:border-slate-950 shadow-sm bg-slate-150 dark:bg-slate-800" />
            ))}
          </div>

          {/* Stepper text lines under tracker */}
          <div className="flex justify-between items-center px-1">
            <Shimmer className="h-2 w-10 bg-slate-150 dark:bg-slate-800" />
            <Shimmer className="h-2 w-10 bg-slate-150 dark:bg-slate-800" />
            <Shimmer className="h-2 w-10 bg-slate-150 dark:bg-slate-800" />
            <Shimmer className="h-2 w-10 bg-slate-150 dark:bg-slate-800" />
          </div>

          {/* Helper details slot */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 mt-1">
            <div className="flex items-center gap-2">
              <Shimmer className="size-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-1">
                <Shimmer className="h-3 w-28 bg-slate-150 dark:bg-slate-750" />
                <Shimmer className="h-2.5 w-20 bg-slate-150 dark:bg-slate-750" />
              </div>
            </div>
            <Shimmer className="h-5 w-12 bg-slate-200 dark:bg-slate-750" />
          </div>

          {/* Footer Action buttons */}
          <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/40">
            <Shimmer className="h-8.5 w-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <Shimmer className="h-8.5 w-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Premium stack of Facebook-style shimmering shop dashboard cards
export const ShopOrdersSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              {/* Order title */}
              <Shimmer className="h-3.5 w-24 bg-orange-100/50 dark:bg-orange-950/20" />
              {/* Product/User name */}
              <Shimmer className="h-5 w-44 bg-slate-200 dark:bg-slate-750" />
              {/* Sub-line summary */}
              <Shimmer className="h-3.5 w-32 bg-slate-150 dark:bg-slate-800/60" />
            </div>
            {/* Status pills or timer */}
            <Shimmer className="h-8 w-24 bg-slate-200 dark:bg-slate-750 rounded-full" />
          </div>
          
          <Shimmer className="h-4 w-full bg-slate-50 dark:bg-slate-800 rounded mb-1" />
          
          <div className="flex gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
            <Shimmer className="h-10 flex-1 bg-slate-200 dark:bg-slate-750 rounded-xl" />
            <Shimmer className="h-10 flex-1 bg-slate-200 dark:bg-slate-750 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Rider dispatch tracker loading page skeleton
export const RiderDashboardSkeleton = () => {
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden max-w-screen-xl mx-auto w-full">
      {/* Header bar shimmer */}
      <div className="sticky top-0 bg-white dark:bg-slate-900/80 px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-850">
        <Shimmer className="h-8 w-8 rounded-full" />
        <Shimmer className="h-6 w-36" />
        <Shimmer className="h-8 w-8 rounded-full" />
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Map Placeholder */}
        <div className="h-48 bg-slate-100 dark:bg-slate-900/40 rounded-3xl relative overflow-hidden border border-slate-100 dark:border-slate-800/80">
          <Shimmer className="w-full h-full" />
          <div className="absolute inset-x-4 bottom-4 bg-white/90 dark:bg-slate-950/90 p-3.5 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <Shimmer className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700" />
              <Shimmer className="h-2.5 w-20 bg-slate-150 dark:bg-slate-800" />
            </div>
            <Shimmer className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
            <Shimmer className="h-3 w-10" />
            <Shimmer className="h-6 w-16" />
          </div>
          <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-6 w-12" />
          </div>
        </div>

        {/* Current Shipping Task / Order Queue List header */}
        <div className="pt-2 flex justify-between items-center">
          <Shimmer className="h-4.5 w-32" />
          <Shimmer className="h-3 w-12" />
        </div>

        {/* Orders list stack */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <Shimmer className="h-3 w-20 bg-orange-100/50 dark:bg-orange-950/20" />
                  <Shimmer className="h-4.5 w-36 bg-slate-200 dark:bg-slate-750" />
                </div>
                <Shimmer className="h-6 w-16 bg-slate-200 dark:bg-slate-750 rounded-lg" />
              </div>
              <Shimmer className="h-3 w-full bg-slate-50 dark:bg-slate-800 rounded" />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <Shimmer className="h-7 w-20 bg-slate-200 dark:bg-slate-750 rounded-lg" />
                <Shimmer className="h-7 w-24 bg-slate-200 dark:bg-slate-750 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
