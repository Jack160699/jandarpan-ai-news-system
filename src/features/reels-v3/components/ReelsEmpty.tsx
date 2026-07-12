"use client";

import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * JDP-017 — Empty reels feed state
 */
export function ReelsEmpty() {
  const { t } = useLanguage();

  return (
    <div className="reels-v3-empty">
      <EmptyState
        title={t.shorts.title}
        description={t.shorts.empty}
        icon={<Clapperboard size={28} aria-hidden />}
      />
      <Link href="/" className="reels-v3-empty__home tap-target">
        ← {t.shorts.backHome}
      </Link>
    </div>
  );
}
