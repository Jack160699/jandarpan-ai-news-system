import Link from "next/link";
import { ArchiveTimeline } from "@/components/institution/ArchiveTimeline";
import { DeskOf } from "@/components/institution/DeskOf";
import { getOngoingInvestigations } from "@/lib/archive";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Rule } from "@/components/ui/Rule";

type LivingArchiveProps = {
  preview?: boolean;
};

export function LivingArchive({ preview = false }: LivingArchiveProps) {
  const ongoing = getOngoingInvestigations();

  return (
    <section
      id="archive"
      data-section="archive"
      data-atmosphere="cool"
      className={`${preview ? "section-pad-tight" : "section-gravitas"} border-t border-[var(--rule)] bg-[var(--paper-warm)]`}
    >
      <div className="editorial-container">
        <SectionLabel>Living archive</SectionLabel>
        <h2 className="headline-md mt-4 max-w-[22ch]">
          CG Bhaskar remembers what it files
        </h2>
        <p className="deck mt-6 max-w-xl text-[var(--ink-secondary)]">
          Investigations persist across editions. Dispatches return when the desk
          reopens a thread. The record belongs to Chhattisgarh — not to a feed.
        </p>

        {!preview ? (
          <DeskOf
            className="mt-12"
            desk="Archive & Record"
            editor="H. Castellano"
            note="Every filing is indexed, cross-referenced, and held in the public chronology. The present edition is one chapter in a longer obligation."
          />
        ) : null}

        {ongoing.length > 0 ? (
          <div className="mt-12 border-t border-[var(--rule)] pt-10">
            <p className="archive-marker">Active in the record</p>
            <ul className="mt-6 space-y-4">
              {ongoing.map((e) => (
                <li key={e.id}>
                  <Link
                    href={e.slug ? `/story/${e.slug}` : "/archive"}
                    className="headline-sm story-link"
                  >
                    {e.title}
                  </Link>
                  <p className="meta-label mt-1 text-[var(--ink-faint)]">
                    {e.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Rule className="my-14" />

        <ArchiveTimeline />

        {preview ? (
          <p className="meta-label mt-12 text-center">
            <Link href="/archive" className="underline hover:opacity-60">
              View full chronology →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
