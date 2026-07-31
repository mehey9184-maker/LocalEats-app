import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('failed to connect to websocket')) {
      return; // Ignore Vite HMR errors
    }
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
    const reasonStr = (event?.reason && (event.reason instanceof Error ? event.reason.message : String(event.reason))) || '';
    if (reasonStr) {
      console.warn('[UnhandledRejection prevented]', reasonStr);
    }
    return true;
  };

  window.onunhandledrejection = handleRejection;
  window.addEventListener('unhandledrejection', handleRejection, true);

  // Global safety net for raw uncaught exceptions
  window.addEventListener('error', (event) => {
    const errorStr = event.error && event.error instanceof Error ? event.error.message : String(event.message || '');
    if (errorStr.includes('WebSocket closed without opened') || errorStr.includes('failed to connect to websocket')) {
      event.preventDefault(); // Silently handle Vite HMR connection drops
      event.stopImmediatePropagation();
      return;
    }
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
