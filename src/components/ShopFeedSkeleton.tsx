import React, { memo } from "react";

export const ShopCardSkeleton = memo(() => (
  <div className="flex flex-col bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-200/70 dark:border-slate-800 shadow-sm animate-pulse w-full">
    {/* Image Placeholder */}
    <div className="aspect-[16/10] sm:aspect-video w-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
      <div className="absolute top-3 left-3 w-20 h-5 bg-slate-300 dark:bg-slate-700 rounded-full" />
      <div className="absolute top-3 right-3 w-16 h-5 bg-slate-300 dark:bg-slate-700 rounded-full" />
      <div className="absolute bottom-2.5 left-3 right-3 flex justify-between">
        <div className="w-20 h-5 bg-slate-300 dark:bg-slate-700 rounded-lg" />
        <div className="w-16 h-5 bg-slate-300 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>

    {/* Content Placeholder */}
    <div className="p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3" />
      <div className="flex items-center gap-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-32" />
      </div>
      <div className="h-4 bg-slate-100 dark:bg-slate-800/40 rounded-md w-1/2 mt-1" />
    </div>
  </div>
));

export const ShopFeedSkeleton = memo(({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
    {Array.from({ length: count }).map((_, idx) => (
      <ShopCardSkeleton key={`skeleton-card-${idx}`} />
    ))}
  </div>
));
