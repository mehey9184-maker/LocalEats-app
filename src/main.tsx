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
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = (event.reason && (event.reason instanceof Error ? event.reason.message : String(event.reason))) || '';
    
    // Silence network fetch rejections, HMR, and empty rejections
    if (
      !event.reason || 
      reasonStr === '' || 
      reasonStr === 'undefined' ||
      reasonStr === 'null' ||
      reasonStr.includes('WebSocket closed without opened') || 
      reasonStr.includes('failed to connect to websocket') ||
      reasonStr.includes('Failed to fetch') ||
      reasonStr.includes('NetworkError') ||
      reasonStr.includes('Load failed') ||
      reasonStr.includes('CircuitBreaker')
    ) {
      event.preventDefault(); 
      event.stopImmediatePropagation();
      return;
    }
    
    // Prevent platform's error popup for benign issues
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('[UnhandledRejection caught]', event.reason);
  }, true); // useCapture = true to catch it before other listeners

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
