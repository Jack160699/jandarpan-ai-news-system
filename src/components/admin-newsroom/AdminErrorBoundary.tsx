"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AdminErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const message = this.state.error.message ?? "Something went wrong";

    return (
      <div className="admin-error-boundary" role="alert">
        <p className="admin-error-boundary__title">
          {this.props.title ?? "This panel could not load"}
        </p>
        <p className="admin-error-boundary__message">{message}</p>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={this.handleRetry}
        >
          Retry
        </button>
      </div>
    );
  }
}
