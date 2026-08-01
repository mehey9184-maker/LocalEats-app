import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Terminal, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GlobalErrorLog } from '../main';

export interface OfflineBannerProps {
  isOnline: boolean;
  consecutiveFailures?: number;
  onManualSync: () => Promise<void> | void;
  isSyncing?: boolean;
  onOpenDiagnostics?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  consecutiveFailures = 0,
  onManualSync,
  isSyncing = false,
  onOpenDiagnostics,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [latestErrors, setLatestErrors] = useState<GlobalErrorLog[]>([]);

  useEffect(() => {
    const updateLogs = () => {
      try {
        const raw = (window as any).__GLOBAL_ERROR_LOGS__ || JSON.parse(localStorage.getItem('global_error_logs') || '[]');
        setLatestErrors(raw.slice(0, 5));
      } catch {
        setLatestErrors([]);
      }
    };

    updateLogs();
    window.addEventListener('global-error-log-updated', updateLogs);
    return () => window.removeEventListener('global-error-log-updated', updateLogs);
  }, []);

  // Show banner if explicitly offline OR if 2+ consecutive heartbeat network failures occurred
  const isCriticalOffline = !isOnline || consecutiveFailures >= 2;

  // Reset dismissed state when network status flips back to offline
  useEffect(() => {
    if (isCriticalOffline) {
      setDismissed(false);
    }
  }, [isCriticalOffline]);

  const troubleshootingSteps = useMemo(() => {
    const lastError = latestErrors[0];
    const msg = (lastError?.message || '').toLowerCase();

    if (!isOnline) {
      return [
        { title: 'Check Device Connectivity', desc: 'Ensure Wi-Fi or Mobile Data is active on your device.' },
        { title: 'Offline Storage Active', desc: 'Menus and cached shops are available locally. Orders will queue automatically.' },
        { title: 'Auto-Reconnect', desc: 'LocalEats will automatically sync as soon as network signal is restored.' },
      ];
    }

    if (msg.includes('upstream') || msg.includes('timeout') || msg.includes('connection')) {
      return [
        { title: 'Supabase Server Latency / Timeout', desc: 'Backend server timed out responding to network ping.' },
        { title: 'Trigger Manual Sync', desc: 'Click "Manual Sync" below to flush queue and force a fresh fetch.' },
        { title: 'Fallback Cache In Use', desc: 'LocalEats is using locally cached menu items for smooth ordering.' },
      ];
    }

    return [
      { title: 'Network Instability Detected', desc: 'Intermittent signal drops detected on recent requests.' },
      { title: 'Queued Request Engine Active', desc: 'Failed operations are stored in IndexedDB and retrying automatically.' },
      { title: 'Run Diagnostics', desc: 'Inspect the Developer Diagnostic Panel for exact stack traces & logs.' },
    ];
  }, [isOnline, latestErrors]);

  if (!isCriticalOffline || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white shadow-xl border-b border-white/20 select-none"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            {/* Main status alert line */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
                <WifiOff className="w-5 h-5 text-white animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
                    {!isOnline ? 'Offline Mode Active' : 'Network Instability Detected'}
                  </span>
                  {consecutiveFailures > 0 && isOnline && (
                    <span className="text-[10px] bg-red-950/60 font-mono px-2 py-0.5 rounded text-red-200">
                      {consecutiveFailures} Ping Failures
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  {!isOnline
                    ? 'Working offline with cached data. Your changes will automatically sync when connected.'
                    : `Backend connection timed out. Using local fallback cache.`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={async () => {
                  if (onManualSync) {
                    await onManualSync();
                  }
                }}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-white text-orange-700 hover:bg-amber-50 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Manual Sync'}</span>
              </button>

              <button
                onClick={() => setExpanded(!expanded)}
                className="px-2.5 py-1.5 bg-black/20 hover:bg-black/30 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/20 flex items-center gap-1"
                title="Troubleshooting Steps"
              >
                <span>Guide</span>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {onOpenDiagnostics && (
                <button
                  onClick={onOpenDiagnostics}
                  className="p-1.5 bg-black/20 hover:bg-black/30 text-amber-200 rounded-xl transition-all cursor-pointer border border-white/20"
                  title="Open Diagnostic Logs"
                >
                  <Terminal className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setDismissed(true)}
                className="text-white/70 hover:text-white text-xs font-bold px-1.5 py-1"
                title="Dismiss Banner"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Expandable Troubleshooting Guide */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-white/20 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {troubleshootingSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-black/30 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-amber-200 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{step.title}</span>
                      </div>
                      <p className="text-[11px] text-amber-100/90 leading-tight">{step.desc}</p>
                    </div>
                  ))}
                </div>

                {latestErrors.length > 0 && (
                  <div className="mt-3 bg-black/40 p-2.5 rounded-xl text-left font-mono text-[10px] text-red-200 border border-red-500/30">
                    <div className="flex items-center gap-1.5 font-bold text-red-300 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Last Diagnostic Exception ({latestErrors[0].timestamp}):</span>
                    </div>
                    <p className="truncate">{latestErrors[0].message}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
