import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

export interface GlobalErrorLog {
  id: string;
  timestamp: string;
  type: "unhandledrejection" | "uncaught_error" | "console_error" | "network_timeout";
  message: string;
  stack?: string;
  details?: string;
}

const MAX_ERROR_LOGS = 50;

const isIgnorableErrorLog = (msg?: string) => {
  if (!msg) return true;
  const trimmed = msg.trim();
  if (
    !trimmed ||
    trimmed === '{}' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'Unhandled Promise Rejection, Reason:' ||
    trimmed.toLowerCase().startsWith('unhandled promise rejection')
  ) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('load failed') ||
    lower.includes('network error') ||
    lower.includes('networkerror') ||
    lower.includes('upstream connect error') ||
    lower.includes('connection timeout') ||
    lower.includes('disconnect/reset') ||
    lower.includes('websocket') ||
    lower.includes('aborted') ||
    lower.includes('abort error') ||
    lower.includes('circuit breaker') ||
    lower.includes('schema cache') ||
    lower.includes('error fetching shops')
  );
};

const getStoredGlobalErrorLogs = (): GlobalErrorLog[] => {
  try {
    const raw = localStorage.getItem("global_error_logs");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: GlobalErrorLog) => !isIgnorableErrorLog(item?.message));
      }
    }
  } catch {}
  return [];
};

const globalErrorLogs: GlobalErrorLog[] = getStoredGlobalErrorLogs();
if (typeof window !== "undefined") {
  (window as any).__GLOBAL_ERROR_LOGS__ = globalErrorLogs;
}

export function pushGlobalErrorLog(
  type: GlobalErrorLog["type"],
  message: string,
  stack?: string,
  details?: string
) {
  if (isIgnorableErrorLog(message)) return;
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  
  // Deduplicate exact duplicate logs within 1 second
  if (globalErrorLogs.length > 0) {
    const latest = globalErrorLogs[0];
    if (latest.message === message && latest.type === type) {
      return;
    }
  }

  const logEntry: GlobalErrorLog = {
    id: "err_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp,
    type,
    message,
    stack,
    details
  };

  globalErrorLogs.unshift(logEntry);
  if (globalErrorLogs.length > MAX_ERROR_LOGS) {
    globalErrorLogs.length = MAX_ERROR_LOGS;
  }

  try {
    localStorage.setItem("global_error_logs", JSON.stringify(globalErrorLogs));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("global-error-log-updated", { detail: [...globalErrorLogs] }));
  }
}

if (typeof window !== "undefined") {
  (window as any).pushGlobalErrorLog = pushGlobalErrorLog;

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => typeof a === "object" ? (a?.message || JSON.stringify(a)) : String(a)).join(" ");
    const lower = msg.toLowerCase();
    if (
      lower.includes('failed to connect to websocket') ||
      lower.includes('failed to fetch') ||
      lower.includes('load failed') ||
      lower.includes('networkerror') ||
      lower.includes('login error') ||
      lower.includes('incompatible react versions')
    ) {
      originalConsoleError(...args);
      return; // Ignore Vite HMR, auth/login user notifications, and expected offline fetch network noise
    }
    pushGlobalErrorLog("console_error", msg);
    originalConsoleError(...args);
  };

  // Global safety net for unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (event && typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    const rawReason = event?.reason;
    const reasonStr = (rawReason && (rawReason instanceof Error ? rawReason.message : (typeof rawReason === 'object' ? (rawReason.message || JSON.stringify(rawReason)) : String(rawReason)))) || '';
    const lowerReason = reasonStr.toLowerCase();

    const stack = rawReason && rawReason instanceof Error ? rawReason.stack : undefined;
    const isTimeoutOrNetwork =
      !reasonStr ||
      reasonStr === '{}' ||
      reasonStr === 'undefined' ||
      isIgnorableErrorLog(reasonStr) ||
      lowerReason.includes('upstream connect error') ||
      lowerReason.includes('connection timeout') ||
      lowerReason.includes('disconnect/reset') ||
      lowerReason.includes('timeout') ||
      lowerReason.includes('failed to fetch') ||
      lowerReason.includes('load failed') ||
      lowerReason.includes('network error') ||
      lowerReason.includes('networkerror') ||
      lowerReason.includes('fetch failed') ||
      lowerReason.includes('aborted') ||
      lowerReason.includes('abort error');

    if (!isTimeoutOrNetwork && reasonStr && reasonStr !== '{}' && !lowerReason.includes('login error')) {
      pushGlobalErrorLog(
        "unhandledrejection",
        reasonStr,
        stack
      );
    }

    if (reasonStr && !isTimeoutOrNetwork) {
      console.warn('[UnhandledRejection prevented]', reasonStr);
    }
    return true;
  };

  window.onunhandledrejection = handleRejection;
  window.addEventListener('unhandledrejection', handleRejection, true);

  // Global safety net for raw uncaught exceptions
  window.addEventListener('error', (event) => {
    const errorStr = event.error && event.error instanceof Error ? event.error.message : String(event.message || 'Uncaught Script Error');
    const stack = event.error && event.error instanceof Error ? event.error.stack : undefined;
    const lowerError = errorStr.toLowerCase();

    if (
      lowerError.includes('websocket closed') ||
      lowerError.includes('failed to connect to websocket') ||
      lowerError.includes('failed to fetch') ||
      lowerError.includes('load failed') ||
      lowerError.includes('network error') ||
      lowerError.includes('networkerror')
    ) {
      event.preventDefault(); // Silently handle Vite HMR and network connection drops
      event.stopImmediatePropagation();
      return;
    }
    pushGlobalErrorLog("uncaught_error", errorStr, stack);
    console.log('[UncaughtError]', event.error || event.message);
  }, true);
}

if ('serviceWorker' in navigator) {
  if (
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname === '127.0.0.1'
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { type: 'module' }).then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
);
