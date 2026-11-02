import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Antigravity Clinical Portal - Uncaught Component Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('chc_auth_token');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-100 text-stone-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border-2 border-stone-900 p-6 md:p-8 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 border-2 border-amber-900 text-amber-900 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-xl font-display font-bold text-stone-900 uppercase tracking-tight">
              Clinical Workspace Error
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              An unexpected render issue occurred within this view. The portal has preserved your network state and intercepted the failure to prevent unexpected data corruption.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 bg-stone-50 border border-stone-300 font-mono-tabular text-xs text-stone-700 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Portal</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Reset Session</span>
              </button>
            </div>

            <p className="mt-4 text-[11px] text-stone-400 text-center font-mono-tabular">
              Republic of the Philippines · Community Health Center Information System
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

