"use client";

import React from "react";
import { traceDashboardRender } from "@/lib/observability/dashboard-render-trace";

type Props = {
  name: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AdminWidgetBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : "Widget crashed";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown): void {
    const message = err instanceof Error ? err.message : "Widget crashed";
    traceDashboardRender("WIDGET_ERROR", this.props.name, { message });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="anr-card" role="status">
          <div className="anr-card__head">
            <strong>{this.props.name}</strong>
            <span className="anr-meta">Widget disabled</span>
          </div>
          <div className="anr-card__body">
            <p className="anr-meta">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

