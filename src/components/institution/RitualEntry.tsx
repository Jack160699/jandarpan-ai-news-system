"use client";

import { phaseToRitual, RITUAL_COPY } from "@/lib/institution";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { EditionLineage } from "./EditionLineage";

export function RitualEntry() {
  const ctx = useEditorialIntelligenceOptional();
  const ritual = ctx ? phaseToRitual(ctx.live.phase) : "morning";
  const copy = RITUAL_COPY[ritual];

  return (
    <div className="ritual-entry editorial-container" data-section="ritual-entry">
      <p className="archive-marker">Edition arrival</p>
      <p className="ritual-entry__greeting mt-4">{copy.greeting}</p>
      <p className="meta-label mt-4 text-[var(--ink-muted)]">{copy.subline}</p>
      <div className="institution-rule mx-auto my-8 max-w-xs" />
      <EditionLineage compact />
    </div>
  );
}
