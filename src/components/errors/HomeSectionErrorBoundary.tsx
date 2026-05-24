"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { homeDebug } from "@/lib/homepage/feed-safety";

type Props = {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/** Isolates a homepage section — one failure must not take down the whole page */
export class HomeSectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    homeDebug(`section error: ${this.props.name}`, {
      message: error.message,
      componentStack: info.componentStack,
    });
    console.error(`[HomeSection:${this.props.name}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="home-section-fallback"
            role="status"
            aria-label={`${this.props.name} unavailable`}
          />
        )
      );
    }
    return this.props.children;
  }
}
