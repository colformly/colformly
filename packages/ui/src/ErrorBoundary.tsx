import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export interface ErrorBoundaryProps {
  appName?: string;
  workerUrl?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Non-blocking report to Cloudflare Worker Telemetry
    try {
      const workerUrl =
        this.props.workerUrl ||
        (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLOUDFLARE_WORKER_URL) ||
        'https://colformly-worker.colformly.workers.dev';

      const payload = {
        source: this.props.appName || 'frontend-app',
        severity: 'CRITICAL',
        category: 'WORKER_CRASH',
        message: error?.message || 'React Runtime Rendering Error',
        stack: errorInfo?.componentStack || error?.stack || '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      };

      fetch(`${workerUrl.replace(/\/$/, '')}/api/telemetry/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((reportErr) => {
        console.warn('Telemetry error reporting failed:', reportErr);
      });
    } catch (e) {
      console.warn('Could not fire telemetry error event:', e);
    }
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;
      const appTitle = this.props.appName
        ? this.props.appName.charAt(0).toUpperCase() + this.props.appName.slice(1).replace('-', ' ')
        : 'Colformly Platform';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Application Encountered an Issue
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {appTitle} caught an unexpected runtime error and notified engineering.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-rose-900 font-mono break-words leading-relaxed">
              {error?.message || 'Unknown runtime error occurred.'}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                <span>{showDetails ? 'Hide Diagnostics Stack' : 'Show Diagnostics Stack'}</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <pre className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-48 leading-normal">
                  {errorInfo?.componentStack || error?.stack || 'No component stack trace available.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
