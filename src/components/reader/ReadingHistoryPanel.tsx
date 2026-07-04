"use client";

import Link from "next/link";
import { getContinueTarget } from "@/lib/reading-memory";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLanguage } from "@/providers/LanguageProvider";

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ReadingHistoryPanel() {
  const ctx = useEditorialIntelligenceOptional();
  const { t } = useLanguage();

  if (!ctx) return null;

  const target = getContinueTarget(ctx.memory);
  const recent = Object.entries(ctx.memory.articles)
    .filter(([, data]) => data.lastRead)
    .sort((a, b) => b[1].lastRead - a[1].lastRead)
    .slice(0, 6);

  if (!target && recent.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--ink-muted)]">
        Stories you read will appear here so you can pick up where you left off.
      </p>
    );
  }

  return (
    <div className="reading-history-panel mt-4">
      {target ? (
        <div className="rounded-xl border border-[var(--rule)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {t.ribbon.continue}
          </p>
          <Link
            href={target.href}
            className="mt-2 block font-[family-name:var(--font-display)] text-lg leading-snug"
          >
            {target.label}
          </Link>
          <div
            className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--rule)]"
            role="progressbar"
            aria-valuenow={Math.round(target.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[var(--ink-primary)]"
              style={{ width: `${Math.round(target.progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <ul className="mt-6 divide-y divide-[var(--rule)]">
          {recent.map(([slug, data]) => (
            <li key={slug} className="py-3">
              <Link
                href={`/story/${slug}`}
                className="block text-sm font-medium hover:opacity-70"
              >
                {data.title || slugToLabel(slug)}
              </Link>
              <p className="mt-1 text-xs text-[var(--ink-faint)]">
                {Math.round(data.progress * 100)}% read
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
