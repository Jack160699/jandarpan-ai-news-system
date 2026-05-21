"use client";

import Link from "next/link";
import { phaseToRitual, RITUAL_COPY, NEWSROOM_DESKS } from "@/lib/institution";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

export function EditionClosure() {
  const ctx = useEditorialIntelligenceOptional();
  const ritual = ctx ? phaseToRitual(ctx.live.phase) : "evening";
  const copy = RITUAL_COPY[ritual];

  return (
    <section className="edition-closure editorial-container" data-section="closure">
      <p className="archive-marker">End of edition</p>
      <p className="mt-6 font-[family-name:var(--font-display)] text-xl tracking-tight md:text-2xl max-w-[22ch] mx-auto">
        {copy.closure}
      </p>
      <div className="institution-rule mx-auto my-10 max-w-sm" />
      <p className="meta-label text-[var(--ink-muted)]">Newsroom credits</p>
      <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {NEWSROOM_DESKS.map((d) => (
          <li key={d.id} className="meta-label text-[var(--ink-faint)]">
            {d.name} · {d.editor}
          </li>
        ))}
      </ul>
      <Link
        href="/archive"
        className="meta-label mt-10 inline-block border-b border-[var(--rule)] pb-1 transition-opacity hover:opacity-60"
      >
        Enter the living archive →
      </Link>
    </section>
  );
}
