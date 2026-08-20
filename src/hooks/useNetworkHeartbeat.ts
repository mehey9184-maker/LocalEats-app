import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { pushGlobalErrorLog } from '../main';

export interface PingSample {
  id: string;
  timestamp: string;
  latencyMs: number;
  success: boolean;
  status: 'healthy' | 'degraded' | 'offline' | 'timeout';
  error?: string;
}

export interface NetworkHealthMetrics {
  status: 'healthy' | 'degraded' | 'offline' | 'testing';
  currentLatencyMs: number | null;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  successRatePercent: number;
  consecutiveFailures: number;
  totalPings: number;
  lastPingTime: string | null;
  history: PingSample[];
}

export function useNetworkHeartbeat(intervalMs = 15000, enabled = true) {
  const [metrics, setMetrics] = useState<NetworkHealthMetrics>({
    status: 'testing',
    currentLatencyMs: null,
    avgLatencyMs: null,
    minLatencyMs: null,
    maxLatencyMs: null,
    successRatePercent: 100,
    consecutiveFailures: 0,
    totalPings: 0,
    lastPingTime: null,
    history: [],
  });

  const [isPinging, setIsPinging] = useState(false);
  const consecutiveFailuresRef = useRef(0);

  const runHeartbeatPing = useCallback(async () => {
    setIsPinging(true);
    const startTime = performance.now();
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    let success = false;
    let latencyMs = 0;
    let errorMsg: string | undefined;
    let pingStatus: 'healthy' | 'degraded' | 'offline' | 'timeout' = 'healthy';

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      pingStatus = 'offline';
      errorMsg = 'Browser is offline';
      consecutiveFailuresRef.current += 1;
    } else {
      try {
        // Ping Supabase DB using a fast lightweight head request or simple select
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout threshold

        const { error } = await supabase
          .from('shops')
          .select('id')
          .limit(1)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        const endTime = performance.now();
        latencyMs = Math.round(endTime - startTime);

        if (error) {
          throw new Error(error.message || 'Supabase query error');
        }

        success = true;
        consecutiveFailuresRef.current = 0;

        if (latencyMs > 1000) {
          pingStatus = 'degraded';
        } else {
          pingStatus = 'healthy';
        }
      } catch (err: any) {
        const endTime = performance.now();
        latencyMs = Math.round(endTime - startTime);
        success = false;
        consecutiveFailuresRef.current += 1;
        errorMsg = err.name === 'AbortError' ? 'Heartbeat ping timeout (4000ms exceeded)' : err.message || 'Ping failed';
        pingStatus = err.name === 'AbortError' ? 'timeout' : 'offline';
      }
    }

    const sample: PingSample = {
      id: 'ping_' + Date.now(),
      timestamp,
      latencyMs: success ? latencyMs : 0,
      success,
      status: pingStatus,
      error: errorMsg,
    };

    setMetrics((prev) => {
      const updatedHistory = [sample, ...prev.history].slice(0, 20);
      const successfulPings = updatedHistory.filter((h) => h.success);
      const latencies = successfulPings.map((h) => h.latencyMs);

      const avg =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null;
      const min = latencies.length > 0 ? Math.min(...latencies) : null;
      const max = latencies.length > 0 ? Math.max(...latencies) : null;
      const rate =
        updatedHistory.length > 0
          ? Math.round((successfulPings.length / updatedHistory.length) * 100)
          : 100;

      let overallStatus: NetworkHealthMetrics['status'] = 'healthy';
      if (consecutiveFailuresRef.current >= 2 || !navigator.onLine) {
        overallStatus = 'offline';
      } else if (avg && avg > 800) {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        currentLatencyMs: success ? latencyMs : null,
        avgLatencyMs: avg,
        minLatencyMs: min,
        maxLatencyMs: max,
        successRatePercent: rate,
        consecutiveFailures: consecutiveFailuresRef.current,
        totalPings: prev.totalPings + 1,
        lastPingTime: timestamp,
        history: updatedHistory,
      };
    });

    setIsPinging(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Run initial ping
    runHeartbeatPing();

    const interval = setInterval(() => {
      runHeartbeatPing();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, runHeartbeatPing]);

  return {
    metrics,
    isPinging,
    runHeartbeatPing,
  };
}
