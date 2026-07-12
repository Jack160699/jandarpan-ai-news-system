"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useLanguage } from "@/providers/LanguageProvider";

type ReelsErrorProps = {
  message?: string;
  onRetry?: () => void;
};

/**
 * JDP-017 — Reels error state with optional retry
 */
export function ReelsError({ message, onRetry }: ReelsErrorProps) {
  const { t } = useLanguage();

  return (
    <EmptyState
      className="reels-v3-error"
      title={t.common.error}
      description={message ?? t.common.error}
      icon={<AlertCircle size={28} aria-hidden />}
      role="alert"
    >
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t.common.retry}
        </Button>
      ) : null}
    </EmptyState>
  );
}
