import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WidgetErrorBoundary] Caught error in ${this.props.fallbackName || 'widget'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/30 text-center min-h-[150px]">
          <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {this.props.fallbackName || 'Widget'} failed to load
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 max-w-[200px]">
            There was a problem rendering this part of the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
