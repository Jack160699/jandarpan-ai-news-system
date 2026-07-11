"use client";

import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { Button } from "@/design-system/components/Button";

type SearchErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function SearchError({ message, onRetry }: SearchErrorProps) {
  return (
    <EmptyState
      className="search-v3-error"
      title="Search unavailable"
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
