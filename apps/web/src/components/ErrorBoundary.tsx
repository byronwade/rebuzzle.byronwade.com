"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component */
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Keys that trigger reset when changed */
  resetKeys?: unknown[];
  /** Variant for different contexts */
  variant?: "full" | "inline" | "minimal";
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire app.
 *
 * @example
 * ```tsx
 * // Full page error boundary
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Inline error boundary for a section
 * <ErrorBoundary variant="inline">
 *   <WidgetThatMightFail />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={CustomErrorComponent}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !areArraysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Use variant-specific fallback
      const variant = this.props.variant || "full";

      if (variant === "minimal") {
        return <MinimalErrorFallback error={this.state.error} resetError={this.resetError} />;
      }

      if (variant === "inline") {
        return <InlineErrorFallback error={this.state.error} resetError={this.resetError} />;
      }

      return <FullPageErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/** Props for error fallback components */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Full page error fallback (default)
 */
function FullPageErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="space-y-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
          >
            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="mb-2 font-semibold text-2xl text-red-600 dark:text-red-400">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              We encountered an unexpected error. Please try again or refresh the page.
            </p>
          </div>
          {isDev && (
            <details className="rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-800 dark:bg-red-900/20">
              <summary className="cursor-pointer font-medium text-red-700 text-sm dark:text-red-400">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 overflow-auto text-red-600 text-xs dark:text-red-300">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={resetError} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Inline error fallback for smaller sections
 */
function InlineErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4" role="alert">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-medium text-sm text-foreground">Failed to load this section</p>
          <p className="text-muted-foreground text-xs">
            {isDev ? error.message : "An unexpected error occurred."}
          </p>
          <Button onClick={resetError} size="sm" variant="outline">
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal error fallback for tight spaces
 */
function MinimalErrorFallback({ resetError }: ErrorFallbackProps) {
  return (
    <div className="flex items-center gap-2 text-destructive text-sm">
      <AlertTriangle className="h-4 w-4" />
      <span>Error loading content</span>
      <button className="underline hover:no-underline" onClick={resetError} type="button">
        Retry
      </button>
    </div>
  );
}

/**
 * Helper to compare arrays for resetKeys
 */
function areArraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => Object.is(item, b[index]));
}

/**
 * Higher-order component to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
