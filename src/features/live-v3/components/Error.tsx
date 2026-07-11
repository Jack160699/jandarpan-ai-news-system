"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/components/EmptyState";

export type ErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function Error({
  title = "Live desk unavailable",
  message = "Something went wrong loading live updates. Please try again.",
  onRetry,
}: ErrorProps) {
  return (
    <EmptyState
      className="lv3-error"
      title={title}
      description={message}
      icon={<AlertCircle size={28} aria-hidden />}
      role="alert"
    >
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </EmptyState>
  );
}
