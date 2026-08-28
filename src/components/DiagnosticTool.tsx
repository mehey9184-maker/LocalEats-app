import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FirestoreService } from '../lib/firebase';
import { ShieldAlert, Play, CheckCircle2, XCircle } from 'lucide-react';

export function DiagnosticTool() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog("Starting Permission Diagnostics...");

    try {
      // 1. Check Auth Status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        addLog(`❌ Auth Error: ${authError.message}`);
      } else if (session?.user) {
        addLog(`✅ Supabase Auth Active. User ID: ${session.user.id}`);
        addLog(`   Email: ${session.user.email}`);
        
        // 2. Try fetching Supabase Profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (profileErr) {
          addLog(`❌ Supabase Profile Fetch Failed: ${profileErr.message}`);
        } else {
          addLog(`✅ Supabase Profile Role: ${profile?.role || 'customer'}`);
        }

        // 3. Try fetching Firestore Profile
        addLog(`⏳ Attempting Firestore Profile Fetch (Path: /profiles/${session.user.id})`);
        try {
          const fsProfile = await FirestoreService.getProfile(session.user.id);
          addLog(`✅ Firestore Profile Fetch Success. Result: ${fsProfile ? 'Found' : 'Not Found'}`);
        } catch (fsErr: any) {
          addLog(`❌ Firestore Profile Fetch Failed: ${fsErr?.message || fsErr}`);
        }

        // 4. Try fetching Firestore Shops
        addLog(`⏳ Attempting Firestore Shops Fetch (Path: /shops)`);
        try {
          const shops = await FirestoreService.getShops();
          addLog(`✅ Firestore Shops Fetch Success. Found: ${shops?.length || 0} shops`);
        } catch (shopErr: any) {
          addLog(`❌ Firestore Shops Fetch Failed: ${shopErr?.message || shopErr}`);
        }

      } else {
        addLog("⚠️ No active Supabase session found. User is anonymous.");
      }
    } catch (e: any) {
      addLog(`❌ Unexpected Error: ${e?.message || e}`);
    }

    addLog("Diagnostics Complete.");
    setIsRunning(false);
  };

  return (
    <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-700 shadow-xl mt-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
        <div className="flex items-center space-x-2 text-indigo-400">
          <ShieldAlert size={16} />
          <span className="font-bold tracking-wider">AUTH & PERMISSIONS DIAGNOSTIC</span>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md transition-colors disabled:opacity-50"
        >
          <Play size={12} />
          <span>{isRunning ? 'RUNNING...' : 'RUN'}</span>
        </button>
      </div>

      <div className="bg-slate-950 p-3 rounded-lg min-h-[150px] max-h-[300px] overflow-y-auto space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic">Click RUN to start tests...</div>
        ) : (
          logs.map((log, i) => {
            const isError = log.includes('❌');
            const isSuccess = log.includes('✅');
            return (
              <div key={i} className={`${isError ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-slate-400'}`}>
                {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
