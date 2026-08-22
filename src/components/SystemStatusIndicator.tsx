import React, { useState, useEffect } from 'react';
import { WifiOff, CloudOff, RefreshCw, XCircle } from 'lucide-react';
import { FirestoreService } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function SystemStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseStatus, setSupabaseStatus] = useState<'ok' | 'error' | 'checking'>('checking');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const checkDatabase = async () => {
      if (!isOnline) {
        if (isMounted) setSupabaseStatus('error');
        return;
      }
      
      try {
        if (isMounted) setSupabaseStatus('checking');
        const ok = await FirestoreService.healthCheck();
        if (isMounted) setSupabaseStatus(ok ? 'ok' : 'error');
      } catch (err) {
        if (isMounted) setSupabaseStatus('error');
      }
    };

    checkDatabase();
    const interval = setInterval(checkDatabase, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || supabaseStatus === 'error') {
      setShowIndicator(true);
    } else {
      // Hide after a brief delay when status recovers
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, supabaseStatus]);

  if (!showIndicator) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed top-20 right-4 z-[9999] pointer-events-auto"
      >
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-2xl p-3 flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">System Status</span>
            <button 
              onClick={() => setShowIndicator(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-1.5">
            {/* Network Status */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${!isOnline ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">
                  {isOnline ? 'Network Online' : 'Network Offline'}
                </span>
                {!isOnline && <span className="text-[9px] text-slate-400">Check connection</span>}
              </div>
            </div>

            {/* Database Status */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${supabaseStatus === 'error' ? 'bg-amber-500/20 text-amber-400' : supabaseStatus === 'checking' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {supabaseStatus === 'error' ? <CloudOff className="w-3.5 h-3.5" /> : <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus === 'checking' ? 'animate-spin' : ''}`} />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">
                  {supabaseStatus === 'error' ? 'Database Unreachable' : supabaseStatus === 'checking' ? 'Checking Database...' : 'Database Connected'}
                </span>
                {supabaseStatus === 'error' && <span className="text-[9px] text-slate-400">Using offline cache</span>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
