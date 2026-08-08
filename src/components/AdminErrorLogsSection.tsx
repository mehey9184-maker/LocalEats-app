import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Activity,
  Trash2,
  Copy,
  Check,
  Search,
  RefreshCw,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Terminal,
  WifiOff,
  ServerCrash,
  AlertOctagon,
  ArrowUpDown,
  Bug,
} from "lucide-react";
import { toast } from "sonner";

export interface ErrorLogItem {
  id: string;
  timestamp: string;
  type: "unhandledrejection" | "uncaught_error" | "console_error" | "network_timeout" | string;
  message: string;
  stack?: string;
  details?: string;
}

interface AdminErrorLogsSectionProps {
  onBack?: () => void;
  className?: string;
  embedded?: boolean;
}

export function AdminErrorLogsSection({
  onBack,
  className = "",
  embedded = false,
}: AdminErrorLogsSectionProps) {
  const [logs, setLogs] = useState<ErrorLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Helper to load logs safely from localStorage
  const loadLogs = useCallback(() => {
    try {
      const raw = localStorage.getItem("global_error_logs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLogs(parsed);
          return;
        }
      }
      const winLogs = (window as any).__GLOBAL_ERROR_LOGS__;
      if (Array.isArray(winLogs)) {
        setLogs(winLogs);
        return;
      }
      setLogs([]);
    } catch (e) {
      console.warn("[AdminErrorLogsSection] Error loading global error logs:", e);
      setLogs([]);
    }
  }, []);

  // Initial load and event listeners for real-time reactivity
  useEffect(() => {
    loadLogs();

    const handleUpdate = (e: Event) => {
      const customDetail = (e as CustomEvent)?.detail;
      if (Array.isArray(customDetail)) {
        setLogs(customDetail);
      } else {
        loadLogs();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "global_error_logs") {
        loadLogs();
      }
    };

    window.addEventListener("global-error-log-updated", handleUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("global-error-log-updated", handleUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadLogs]);

  // One-click clear all logs
  const handleClearLogs = () => {
    setIsClearing(true);
    try {
      localStorage.setItem("global_error_logs", "[]");
      if (typeof window !== "undefined") {
        (window as any).__GLOBAL_ERROR_LOGS__ = [];
        window.dispatchEvent(
          new CustomEvent("global-error-log-updated", { detail: [] })
        );
      }
      setLogs([]);
      toast.success("All global error logs cleared successfully! 🧹", {
        id: "clear-error-logs",
        duration: 3000,
      });
    } catch (e) {
      toast.error("Failed to clear error logs.");
    } finally {
      setIsClearing(false);
    }
  };

  // Copy all logs to clipboard as JSON
  const handleCopyAllLogs = async () => {
    if (logs.length === 0) {
      toast.error("No logs to copy.");
      return;
    }
    try {
      const json = JSON.stringify(logs, null, 2);
      await navigator.clipboard.writeText(json);
      setIsCopiedAll(true);
      toast.success(`Copied ${logs.length} error logs to clipboard! 📋`, {
        id: "copy-all-logs",
        duration: 3000,
      });
      setTimeout(() => setIsCopiedAll(false), 2500);
    } catch (e) {
      toast.error("Failed to copy logs to clipboard.");
    }
  };

  // Copy single log to clipboard
  const handleCopySingleLog = async (log: ErrorLogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = `[${log.timestamp}] [${log.type.toUpperCase()}]\nMessage: ${log.message}${log.stack ? `\n\nStack Trace:\n${log.stack}` : ""}${log.details ? `\n\nDetails:\n${log.details}` : ""}`;
      await navigator.clipboard.writeText(text);
      setCopiedId(log.id);
      toast.success("Log item copied! 📋", { id: `copy-log-${log.id}`, duration: 2000 });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      toast.error("Failed to copy log item.");
    }
  };

  // Trigger test error log
  const handleTriggerTestLog = () => {
    const testTypes = ["network_timeout", "unhandledrejection", "console_error", "uncaught_error"] as const;
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
    const messages = {
      network_timeout: "Simulated Supabase REST connection timeout after 8000ms",
      unhandledrejection: "UnhandledPromiseRejection: Simulated transient shop query failure",
      console_error: "Diagnostic warning: Shop menu item schema check completed with fallback",
      uncaught_error: "Uncaught ReferenceError: Simulated diagnostic event in test suite",
    };

    if (typeof (window as any).pushGlobalErrorLog === "function") {
      (window as any).pushGlobalErrorLog(
        randomType,
        messages[randomType],
        `Error: ${messages[randomType]}\n    at DiagnosticTest (AdminErrorLogsSection.tsx:142:15)\n    at triggerTest (testSuite.ts:28:9)`,
        "Triggered manually from Admin Error Logs Section"
      );
      toast.success(`Generated sample ${randomType} log! 🧪`);
    } else {
      const newLog: ErrorLogItem = {
        id: "err_test_" + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        type: randomType,
        message: messages[randomType],
        stack: `Error: ${messages[randomType]}\n    at DiagnosticTest (AdminErrorLogsSection.tsx:150:15)`,
        details: "Triggered manually from Admin Error Logs Section",
      };
      const updated = [newLog, ...logs];
      setLogs(updated);
      try {
        localStorage.setItem("global_error_logs", JSON.stringify(updated));
      } catch {}
      toast.success(`Generated sample ${randomType} log! 🧪`);
    }
  };

  // Metrics overview calculations
  const stats = useMemo(() => {
    const total = logs.length;
    const networkCount = logs.filter(
      (l) =>
        l.type === "network_timeout" ||
        l.message?.toLowerCase().includes("timeout") ||
        l.message?.toLowerCase().includes("network")
    ).length;
    const unhandledCount = logs.filter((l) => l.type === "unhandledrejection").length;
    const uncaughtCount = logs.filter(
      (l) => l.type === "uncaught_error" || l.type === "console_error"
    ).length;
    return { total, networkCount, unhandledCount, uncaughtCount };
  }, [logs]);

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Type filter
        if (selectedType !== "all" && log.type !== selectedType) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchMsg = log.message?.toLowerCase().includes(query);
          const matchType = log.type?.toLowerCase().includes(query);
          const matchTime = log.timestamp?.toLowerCase().includes(query);
          const matchStack = log.stack?.toLowerCase().includes(query);
          const matchDetails = log.details?.toLowerCase().includes(query);
          return matchMsg || matchType || matchTime || matchStack || matchDetails;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return (b.id || "").localeCompare(a.id || "");
        }
        return (a.id || "").localeCompare(b.id || "");
      });
  }, [logs, selectedType, searchQuery, sortOrder]);

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "network_timeout":
        return {
          bg: "bg-amber-100 dark:bg-amber-950/60",
          text: "text-amber-800 dark:text-amber-300",
          border: "border-amber-200 dark:border-amber-800/60",
          icon: WifiOff,
          label: "Network Timeout",
        };
      case "unhandledrejection":
        return {
          bg: "bg-rose-100 dark:bg-rose-950/60",
          text: "text-rose-800 dark:text-rose-300",
          border: "border-rose-200 dark:border-rose-800/60",
          icon: AlertOctagon,
          label: "Promise Rejection",
        };
      case "uncaught_error":
        return {
          bg: "bg-red-100 dark:bg-red-950/60",
          text: "text-red-800 dark:text-red-300",
          border: "border-red-200 dark:border-red-800/60",
          icon: ServerCrash,
          label: "Uncaught Error",
        };
      case "console_error":
        return {
          bg: "bg-purple-100 dark:bg-purple-950/60",
          text: "text-purple-800 dark:text-purple-300",
          border: "border-purple-200 dark:border-purple-800/60",
          icon: Terminal,
          label: "Console Error",
        };
      default:
        return {
          bg: "bg-slate-100 dark:bg-slate-800",
          text: "text-slate-800 dark:text-slate-300",
          border: "border-slate-200 dark:border-slate-700",
          icon: AlertTriangle,
          label: type || "Error",
        };
    }
  };

  return (
    <div
      className={`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors ${
        embedded ? "rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6" : "min-h-screen p-4 sm:p-6"
      } ${className}`}
      id="admin-error-logs-section"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                title="Back to Admin Dashboard"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Crash & Network Diagnostics
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {logs.length} / 50 logs
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect recent app crashes, unhandled rejections, and network timeouts for maintenance.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleTriggerTestLog}
              className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Add a simulated error log for testing"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Simulate Log</span>
            </button>

            <button
              onClick={loadLogs}
              className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Reload error logs from localStorage"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleCopyAllLogs}
              disabled={logs.length === 0}
              className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Copy all logs to clipboard as formatted JSON"
            >
              {isCopiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopiedAll ? "Copied JSON!" : "Copy JSON"}</span>
            </button>

            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0 || isClearing}
              className="px-3.5 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/20"
              title="Clear all error logs in localStorage"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Logs</p>
              <p className="text-lg font-black">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Network Timeouts</p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.networkCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Rejections</p>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">{stats.unhandledCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">System Health</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {logs.length === 0 ? "100% Healthy" : logs.length < 5 ? "Good" : "Needs Review"}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search error messages, types, timestamps, or stack traces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Type:
            </span>
            {[
              { id: "all", label: "All Types", count: logs.length },
              { id: "network_timeout", label: "Network Timeouts", count: stats.networkCount },
              { id: "unhandledrejection", label: "Unhandled Rejections", count: stats.unhandledCount },
              { id: "uncaught_error", label: "Uncaught Errors", count: logs.filter((l) => l.type === "uncaught_error").length },
              { id: "console_error", label: "Console Errors", count: logs.filter((l) => l.type === "console_error").length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                  selectedType === tab.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    selectedType === tab.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Logs List Container */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Recorded Logs ({filteredLogs.length})
            </h3>
            {searchQuery && (
              <span className="text-xs text-slate-500 font-medium">
                Filtered by &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mb-1">
                {logs.length === 0 ? "Zero Error Logs Recorded" : "No Matching Logs Found"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
                {logs.length === 0
                  ? "The application has encountered no unhandled promise rejections or fatal network failures in this browser session."
                  : `No logs match the current search query "${searchQuery}" and type filter.`}
              </p>
              {logs.length === 0 ? (
                <button
                  onClick={handleTriggerTestLog}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Simulate Diagnostic Log
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                  }}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log, index) => {
                const style = getTypeBadgeStyle(log.type);
                const IconComponent = style.icon;
                const isExpanded = expandedLogId === (log.id || `log-${index}`);
                const isCopied = copiedId === log.id;

                return (
                  <div
                    key={log.id || `log-${index}`}
                    onClick={() =>
                      setExpandedLogId(isExpanded ? null : log.id || `log-${index}`)
                    }
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                      isExpanded
                        ? "border-primary ring-1 ring-primary/20 dark:border-primary"
                        : "border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="p-4 space-y-2">
                      {/* Top metadata row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${style.bg} ${style.text} ${style.border}`}
                          >
                            <IconComponent className="w-3 h-3" />
                            {style.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {log.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleCopySingleLog(log, e)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                            title="Copy this error log"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id || `log-${index}`)
                            }
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Error message */}
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 break-words font-mono">
                        {log.message || "Unknown error event occurred"}
                      </div>

                      {/* Optional details summary if collapsed */}
                      {!isExpanded && log.stack && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                          {log.stack.split("\n")[1] || log.stack.slice(0, 100)}...
                        </div>
                      )}
                    </div>

                    {/* Expandable Stack Trace & Full Details */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {log.details && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                              Additional Context / Details
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                              {log.details}
                            </p>
                          </div>
                        )}

                        {log.stack ? (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Stack Trace
                              </p>
                              <button
                                onClick={(e) => handleCopySingleLog(log, e)}
                                className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Copy Stack
                              </button>
                            </div>
                            <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto text-[10px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
                              {log.stack}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            No stack trace available for this error event.
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Log ID: {log.id}</span>
                          <span>Timestamp: {log.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminErrorLogsSection;
