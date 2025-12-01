"use client";

import { AlertTriangle } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (never expose sensitive details in production UI)
    console.error("Error caught by boundary:", error, errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Send to error tracking service
      // Vercel Analytics automatically captures errors
      // For additional tracking, integrate Sentry or similar:
      //
      // if (typeof window !== "undefined" && window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     contexts: {
      //       react: {
      //         componentStack: errorInfo.componentStack,
      //       },
      //     },
      //   });
      // }

      // Log to structured logger (will be captured by Vercel Logs)
      try {
        // Use dynamic import to avoid bundling logger in client if not needed
        import("@/lib/logger").then(({ logger }) => {
          logger.error("React Error Boundary caught error", error, {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
          });
        });
      } catch (logError) {
        // Fallback if logger fails
        console.error("Failed to log error:", logError);
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-8">
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-10 w-10 text-red-600"
                />
              </div>
              <div>
                <h1 className="mb-2 font-semibold text-2xl text-red-600">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Please try again or
                  refresh the page.
                </p>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left">
                  <p className="mb-2 font-medium text-red-700 text-sm">
                    Error Details (Development Only):
                  </p>
                  <pre className="overflow-auto text-red-600 text-xs">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </div>
              )}
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={this.resetError} variant="default">
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
