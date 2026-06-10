import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  if (
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')
  ) {
    // Self-cleaning: Unregister old/active service workers in development/preview environments to prevent dynamic chunk loading crashes
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Cleaned up active service worker in development environment to maintain HMR stability.');
          }
        });
      }
    });
  } else {
    // Register Service Worker in production
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
}

import { LanguageProvider } from './contexts/LanguageContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
        <Analytics />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
