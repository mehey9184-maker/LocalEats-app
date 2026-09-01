import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export interface GlobalErrorLog {
  id: string;
  timestamp: string;
  type: "unhandledrejection" | "uncaught_error" | "console_error" | "network_timeout";
  message: string;
  stack?: string;
  details?: string;
}

const MAX_ERROR_LOGS = 50;

export const isIgnorableErrorLog = (msg?: string) => {
  if (!msg) return true;
  const trimmed = msg.trim();
  if (
    !trimmed ||
    trimmed === '{}' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '[object Object]' ||
    trimmed === 'Unhandled Promise Rejection, Reason:' ||
    trimmed.startsWith('Unhandled Promise Rejection, Reason:') ||
    trimmed.toLowerCase().startsWith('unhandled promise rejection') ||
    trimmed.toLowerCase().includes('failed to request notification permission') ||
    trimmed.toLowerCase().includes('[push] subscription failed') ||
    trimmed.toLowerCase().includes('push service not available') ||
    trimmed.toLowerCase().includes('permission denied') ||
    trimmed.toLowerCase().includes('push_subscriptions')
  ) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes('lock broken by another request') ||
    lower.includes('lock broken') ||
    lower.includes('lock acquired') ||
    lower.includes('navigator.locks') ||
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
    lower.includes('aborterror') ||
    lower.includes('circuit breaker') ||
    lower.includes('schema cache') ||
    lower.includes('error fetching shops') ||
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt')
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
    const msg = args.map(a => typeof a === "object" ? (a?.message || (a ? JSON.stringify(a) : "")) : String(a)).join(" ");
    if (isIgnorableErrorLog(msg)) {
      console.debug("[Ignored log]", ...args);
      return; // Ignore Vite HMR, auth locks, notification prompts, empty objects, and expected offline fetch network noise
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
    const stack = rawReason && rawReason instanceof Error ? rawReason.stack : undefined;

    if (!reasonStr || reasonStr === "{}" || isIgnorableErrorLog(reasonStr)) {
      return true;
    }

    pushGlobalErrorLog(
      "unhandledrejection",
      reasonStr,
      stack
    );

    console.debug('[UnhandledRejection prevented]', reasonStr);
    return true;
  };

  window.onunhandledrejection = handleRejection;
  window.addEventListener('unhandledrejection', handleRejection, true);

  // Global safety net for raw uncaught exceptions
  window.addEventListener('error', (event) => {
    const errorStr = event.error && event.error instanceof Error ? event.error.message : String(event.message || 'Uncaught Script Error');
    const stack = event.error && event.error instanceof Error ? event.error.stack : undefined;

    if (isIgnorableErrorLog(errorStr)) {
      event.preventDefault(); // Silently handle Vite HMR, locks, and network connection drops
      event.stopImmediatePropagation();
      return;
    }
    pushGlobalErrorLog("uncaught_error", errorStr, stack);
    console.log('[UncaughtError]', event.error || event.message);
  }, true);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
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
    </ErrorBoundary>
  </StrictMode>,
);
