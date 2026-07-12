"use client";

import { Mic } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { focusRingClass } from "@/design-system/utils/aria";
import { cn } from "@/lib/cn";

export function VoiceSearchPlaceholder() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      className={cn("search-v3-voice", focusRingClass)}
      disabled
      aria-disabled="true"
      aria-label={`${t.search.title} — voice search coming soon`}
      title="Voice search coming soon"
    >
      <Mic size={18} aria-hidden />
      <span className="search-v3-voice__label">Voice</span>
      <span className="search-v3-voice__badge" aria-hidden>
        Soon
      </span>
    </button>
  );
}
