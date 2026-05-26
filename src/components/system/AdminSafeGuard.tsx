"use client";

import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
} from "react";

type AdminSafeGuardProps = {
  children: ReactNode;
  title?: string;
};

type BoundaryState = {
  error: Error | null;
  retryKey: number;
};

class AdminSafeBoundary extends Component<AdminSafeGuardProps, BoundaryState> {
  state: BoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AdminSafeGuard]", error, info.componentStack);
    if (typeof window !== "undefined") {
      void fetch("/api/admin/ops/errors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "admin_safe_guard",
          message: error.message,
          severity: "high",
          metadata: {
            stack: error.stack?.slice(0, 800),
            componentStack: info.componentStack?.slice(0, 500),
          },
        }),
      }).catch(() => null);
    }
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    if (!this.state.error) {
      return (
        <div key={this.state.retryKey} className="admin-safe-guard__content">
          {this.props.children}
        </div>
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    const message =
      this.state.error.message || "An unexpected error stopped this view.";

    return (
      <div className="admin-safe-guard" role="alert">
        <div className="admin-safe-guard__card">
          <p className="admin-safe-guard__eyebrow">Newsroom recovery</p>
          <h2 className="admin-safe-guard__title">
            {this.props.title ?? "Admin panel interrupted"}
          </h2>
          <p className="admin-safe-guard__message">
            Your session is preserved. Retry to reload this section, or use the
            sidebar to navigate elsewhere.
          </p>
          {isDev ? (
            <pre className="admin-safe-guard__debug">{message}</pre>
          ) : null}
          <div className="admin-safe-guard__actions">
            <button
              type="button"
              className="anr-btn anr-btn--primary"
              onClick={this.handleRetry}
            >
              Retry
            </button>
            <a href="/admin/editorial" className="anr-btn anr-btn--ghost">
              Editorial home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

function AdminLoadingFallback() {
  return (
    <div className="admin-safe-guard admin-safe-guard--loading" aria-busy>
      <div className="admin-safe-guard__card">
        <p className="admin-safe-guard__eyebrow">Newsroom</p>
        <p className="admin-safe-guard__message">Loading admin workspace…</p>
      </div>
    </div>
  );
}

export function AdminSafeGuard({
  children,
  title = "Admin panel interrupted",
}: AdminSafeGuardProps) {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminSafeBoundary title={title}>{children}</AdminSafeBoundary>
    </Suspense>
  );
}
