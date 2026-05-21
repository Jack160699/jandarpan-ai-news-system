"use client";

import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

export function LiveDeskMarker() {
  const ctx = useEditorialIntelligenceOptional();
  if (!ctx) return null;

  const { live } = ctx;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {live.liveMarker ? (
        <span className="flex items-center gap-2">
          <span className="live-desk-pulse" aria-hidden />
          <span className="meta-label text-[var(--accent-breaking)]">Live</span>
        </span>
      ) : null}
      <span className="meta-label text-[var(--ink-muted)]">
        {live.editionLabel} · Updated {live.updatedAt}
      </span>
      <span className="meta-label hidden text-[var(--ink-faint)] sm:inline">
        {live.deskStatus}
      </span>
    </div>
  );
}
