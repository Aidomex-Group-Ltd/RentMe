"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary caught (${this.props.sectionName || "component"}):`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {this.props.sectionName
              ? `${this.props.sectionName} Failed to Load`
              : "Something Went Wrong"}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            An unexpected error occurred. You can try again or navigate away.
          </p>
          {this.state.error?.message && (
            <p className="mt-2 font-mono text-xs text-gray-400">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
