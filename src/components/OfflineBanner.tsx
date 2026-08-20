import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, ShieldCheck } from 'lucide-react';

export interface OfflineBannerProps {
  isOnline: boolean;
  consecutiveFailures?: number;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  onOpenDiagnostics?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  onManualSync,
  isSyncing = false,
}) => {
  if (isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-2.5 shadow-md border-b border-slate-800"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="font-bold text-amber-400">Offline Mode</span>
              <span className="text-slate-300 ml-1.5 hidden sm:inline">
                Your cart and active orders are safely saved locally.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onManualSync && (
              <button
                type="button"
                onClick={() => onManualSync()}
                disabled={isSyncing}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Reconnecting..." : "Reconnect"}</span>
              </button>
            )}
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold hidden xs:flex">
              <ShieldCheck className="w-3 h-3" />
              <span>Data Safe</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineBanner;
