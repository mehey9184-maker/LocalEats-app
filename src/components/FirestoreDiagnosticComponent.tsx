import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, limit } from 'firebase/firestore';
import { Database, Play, Loader2, ServerCrash, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function FirestoreDiagnosticComponent() {
  const [logs, setLogs] = useState<{ type: 'info' | 'success' | 'error'; message: string; data?: any }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (type: 'info' | 'success' | 'error', message: string, data?: any) => {
    setLogs(prev => [...prev, { type, message, data }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('info', 'Starting Firestore Query Diagnostics...');

    try {
      // 1. Check Auth Status First
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        addLog('error', 'No active Supabase session found. Test will run as unauthenticated (guest).');
      } else {
        addLog('info', `Active Supabase Auth detected. User ID: ${userId}`);
      }

      // 2. Test 'profiles' (Expects doc fetch)
      addLog('info', 'Testing collection: /profiles');
      if (userId) {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', userId));
          if (profileDoc.exists()) {
            addLog('success', 'Profile fetch SUCCESS', profileDoc.data());
          } else {
            addLog('info', 'Profile fetch SUCCESS (but document does not exist yet)');
          }
        } catch (e: any) {
          addLog('error', `Profile fetch FAILED: ${e.message}`, e);
        }
      } else {
        addLog('info', 'Skipping /profiles test (requires auth)');
      }

      // 3. Test 'orders' (Expects bounded list fetch)
      addLog('info', 'Testing collection: /orders');
      try {
        const qOrders = query(collection(db, 'orders'), limit(1));
        const ordersSnap = await getDocs(qOrders);
        addLog('success', `Orders fetch SUCCESS. Found ${ordersSnap.size} documents.`);
      } catch (e: any) {
        addLog('error', `Orders fetch FAILED: ${e.message}`, e);
      }

      // 4. Test 'menu_items' (Expects bounded list fetch)
      addLog('info', 'Testing collection: /menu_items');
      try {
        const qMenu = query(collection(db, 'menu_items'), limit(1));
        const menuSnap = await getDocs(qMenu);
        addLog('success', `Menu Items fetch SUCCESS. Found ${menuSnap.size} documents.`);
      } catch (e: any) {
        addLog('error', `Menu Items fetch FAILED: ${e.message}`, e);
      }

      // 5. Test 'reviews' (Expects bounded list fetch)
      addLog('info', 'Testing collection: /reviews');
      try {
        const qReviews = query(collection(db, 'reviews'), limit(1));
        const reviewsSnap = await getDocs(qReviews);
        addLog('success', `Reviews fetch SUCCESS. Found ${reviewsSnap.size} documents.`);
      } catch (e: any) {
        addLog('error', `Reviews fetch FAILED: ${e.message}`, e);
      }

    } catch (e: any) {
      addLog('error', `Unexpected critical error during diagnostics: ${e.message}`, e);
    }

    addLog('info', 'Diagnostics Complete.');
    setIsRunning(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-white font-bold tracking-wide">Firestore Health Diagnostic</h2>
            <p className="text-xs text-slate-400">Verifying secure endpoints and query permissions</p>
          </div>
        </div>
        
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors font-semibold text-sm disabled:opacity-50"
        >
          {isRunning ? (
            <><Loader2 size={16} className="animate-spin" /> RUNNING</>
          ) : (
            <><Play size={16} /> START TEST</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#0B101E] font-mono text-xs space-y-3">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <ServerCrash size={48} className="opacity-20" />
            <p className="text-sm">Ready to scan. Click START TEST.</p>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border ${
                log.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                'bg-slate-800/50 border-slate-700/50 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {log.type === 'error' ? '❌' : log.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-400" /> : 'ℹ️'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{log.message}</div>
                  {log.data && (
                    <pre className="mt-2 p-2 bg-slate-950 rounded-md overflow-x-auto text-[10px] text-slate-400 leading-relaxed">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="text-[9px] opacity-40 ml-2 whitespace-nowrap">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
