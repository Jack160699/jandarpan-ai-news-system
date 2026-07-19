"use client";

import React from "react";
import { AdminEditorialErrorFallback } from "@/components/admin-newsroom/AdminEditorialErrorFallback";
import { captureOpsException } from "@/lib/observability/sentry";

type AdminPageErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
};

type AdminPageErrorBoundaryState = {
  error: (Error & { digest?: string }) | null;
};

export class AdminPageErrorBoundary extends React.Component<
  AdminPageErrorBoundaryProps,
  AdminPageErrorBoundaryState
> {
  state: AdminPageErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error & { digest?: string }) {
    return { error };
  }

  componentDidCatch(error: Error & { digest?: string }, info: React.ErrorInfo) {
    console.error("[AdminPageErrorBoundary]", error, info.componentStack);
    void captureOpsException(error, {
      boundary: "AdminPageErrorBoundary",
      digest: error.digest,
      componentStack: info.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <AdminEditorialErrorFallback
          title={this.props.title ?? "This section couldn't load"}
          error={this.state.error}
          reset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
