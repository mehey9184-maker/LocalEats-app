import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2, Wrench } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorStr: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, errorStr: '' };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorStr: error.toString() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleSoftRecover = () => {
    try {
      const keys = Object.keys(localStorage);
      const safeKeys = ["userProfile", "supabase.auth.token"]; // Keep these
      for (const key of keys) {
        if (!safeKeys.some(safe => key.includes(safe))) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e) {
      console.error('Soft recovery failed:', e);
      window.location.href = '/';
    }
  };

  private handleDeepReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.error('Deep recovery clean failed:', e);
    } finally {
      window.location.href = '/';
    }
  };

  public render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 rounded-3xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
              <AlertCircle className="w-8 h-8 animate-bounce" />
            </div>
            
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Something went wrong
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-8 max-w-sm leading-relaxed">
              We encountered a rare startup or state loading complication. Try a soft recovery to repair corrupted data without losing your account.
            </p>
            
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleSoftRecover}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-600/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                Soft Recover (Keep Login)
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-slate-200/50 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Quick Refresh
              </button>
              
              <button
                type="button"
                onClick={this.handleDeepReset}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-slate-200/50 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Hard Reset & Clear All
              </button>
            </div>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

export default ErrorBoundary;
