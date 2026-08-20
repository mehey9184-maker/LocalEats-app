import React from 'react';
import { Activity, Zap, Wifi, WifiOff, RefreshCw, AlertCircle, BarChart2, ShieldCheck } from 'lucide-react';
import { NetworkHealthMetrics, PingSample } from '../hooks/useNetworkHeartbeat';

export interface NetworkHeartbeatMonitorProps {
  metrics: NetworkHealthMetrics;
  isPinging: boolean;
  onRunPing: () => Promise<void> | void;
}

export const NetworkHeartbeatMonitor: React.FC<NetworkHeartbeatMonitorProps> = ({
  metrics,
  isPinging,
  onRunPing,
}) => {
  const getStatusBadge = () => {
    switch (metrics.status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Latency Degraded
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Backend Offline
          </span>
        );
      case 'testing':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            Measuring...
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-4 text-left shadow-lg select-none">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs text-white">Network Health Heartbeat Monitor</h4>
              {getStatusBadge()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Real-time Supabase latency telemetry & timeout pattern analyzer
            </p>
          </div>
        </div>

        <button
          onClick={() => onRunPing()}
          disabled={isPinging}
          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Pinging...' : 'Ping Now'}</span>
        </button>
      </div>

      {/* Primary Latency Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Latency</span>
          <div className="text-base font-black text-amber-400 mt-0.5 font-mono">
            {metrics.currentLatencyMs !== null ? `${metrics.currentLatencyMs} ms` : '—'}
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg / Min / Max</span>
          <div className="text-xs font-bold text-slate-200 mt-1 font-mono">
            {metrics.avgLatencyMs !== null ? `${metrics.avgLatencyMs}ms` : '—'} /{' '}
            <span className="text-emerald-400">{metrics.minLatencyMs !== null ? `${metrics.minLatencyMs}ms` : '—'}</span> /{' '}
            <span className="text-red-400">{metrics.maxLatencyMs !== null ? `${metrics.maxLatencyMs}ms` : '—'}</span>
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</span>
          <div className={`text-base font-black mt-0.5 font-mono ${metrics.successRatePercent >= 90 ? 'text-emerald-400' : 'text-red-400'}`}>
            {metrics.successRatePercent}%
          </div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pings / Failures</span>
          <div className="text-xs font-bold text-slate-200 mt-1 font-mono">
            {metrics.totalPings} total / <span className="text-red-400">{metrics.consecutiveFailures} consecutive err</span>
          </div>
        </div>
      </div>

      {/* Visual Sparkline / Bar chart of last 20 pings */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-bold flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-amber-400" /> Latency History (Last {metrics.history.length} pings)
          </span>
          {metrics.lastPingTime && <span>Last ping at {metrics.lastPingTime}</span>}
        </div>

        <div className="h-14 bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-end justify-between gap-1 overflow-x-auto">
          {metrics.history.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 italic">
              No ping telemetry data collected yet
            </div>
          ) : (
            metrics.history
              .slice()
              .reverse()
              .map((sample: PingSample) => {
                const maxVal = Math.max(...metrics.history.map((h) => h.latencyMs || 0), 500);
                const heightPercent = sample.success ? Math.max(15, Math.min(100, (sample.latencyMs / maxVal) * 100)) : 100;

                let barColor = 'bg-emerald-500';
                if (!sample.success) barColor = 'bg-red-500';
                else if (sample.latencyMs > 800) barColor = 'bg-amber-500';

                return (
                  <div
                    key={sample.id}
                    className="flex-1 min-w-[12px] flex flex-col items-center group relative cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-800 text-white text-[9px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-700">
                        {sample.timestamp}: {sample.success ? `${sample.latencyMs}ms` : sample.error || 'Failed'}
                      </div>
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${barColor} group-hover:brightness-125`}
                    />
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Detailed Ping Log Table */}
      {metrics.history.length > 0 && (
        <details className="text-[10px]">
          <summary className="cursor-pointer font-bold text-slate-400 hover:text-slate-200 select-none flex items-center gap-1">
            <span>View Detailed Ping Log Table ({metrics.history.length})</span>
          </summary>
          <div className="mt-2 bg-slate-950 rounded-xl p-2 max-h-36 overflow-y-auto border border-slate-800 font-mono text-[9px] space-y-1">
            {metrics.history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">{h.timestamp}</span>
                <span className={`font-bold ${h.success ? (h.latencyMs > 800 ? 'text-amber-400' : 'text-emerald-400') : 'text-red-400'}`}>
                  {h.success ? `${h.latencyMs}ms` : h.error || 'Timeout'}
                </span>
                <span className="text-slate-600 uppercase text-[10px] whitespace-nowrap">{h.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
