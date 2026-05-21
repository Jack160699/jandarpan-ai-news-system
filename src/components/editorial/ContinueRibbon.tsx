"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getContinueTarget } from "@/lib/reading-memory";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { usePathname } from "next/navigation";

export function ContinueRibbon() {
  const ctx = useEditorialIntelligenceOptional();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const target = ctx ? getContinueTarget(ctx.memory) : null;

  useEffect(() => {
    if (!target || dismissed) {
      setVisible(false);
      return;
    }
    const onStory = pathname?.startsWith("/story/");
    const isSameStory = onStory && pathname === target.href;
    setVisible(!isSameStory && target.progress > 0.05);
  }, [target, pathname, dismissed]);

  if (!target || !visible) return null;

  const pct = Math.round(target.progress * 100);

  return (
    <aside
      className={`continue-ribbon is-visible thumb-zone`}
      aria-label="Continue reading"
    >
      <div className="continue-ribbon__inner flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="meta-label text-[var(--ink-faint)]">Continue where you left off</p>
          <p className="mt-1 truncate font-[family-name:var(--font-display)] text-base tracking-tight">
            {target.label}
          </p>
          <div
            className="mt-2 h-px w-full max-w-[8rem] bg-[var(--rule)]"
            role="presentation"
          >
            <div
              className="h-full bg-[var(--ink-primary)] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={target.href}
            className="meta-label border border-[var(--rule-strong)] px-4 py-2 transition-opacity hover:opacity-60"
          >
            Resume
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="meta-label text-[var(--ink-faint)] hover:opacity-60"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}
