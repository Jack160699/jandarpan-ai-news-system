import { formatRelativeTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type ThreadEntryTrust = {
  showLive: boolean;
  showBreaking: boolean;
  verified: boolean;
  sourceLine: string | null;
  timeLabel: string | null;
};

type DeriveThreadEntryTrustInput = {
  timestamp: string | null;
  isLive: boolean;
  isBreaking: boolean;
  sourceLine?: string | null;
  confidence?: number | null;
  language: NewsroomLanguage;
};

export function deriveThreadEntryTrust({
  timestamp,
  isLive,
  isBreaking,
  sourceLine,
  confidence,
  language,
}: DeriveThreadEntryTrustInput): ThreadEntryTrust {
  const timeLabel = timestamp
    ? formatRelativeTime(timestamp, language)
    : null;

  return {
    showLive: isLive,
    showBreaking: isBreaking && !isLive,
    verified: false,
    sourceLine: sourceLine?.trim() || null,
    timeLabel,
  };
}
