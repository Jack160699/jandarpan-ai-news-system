"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getContinueTarget } from "@/lib/reading-memory";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePathname } from "next/navigation";

export function ContinueRibbon() {
  const ctx = useEditorialIntelligenceOptional();
  const { t } = useLanguage();
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
  const slug = target.href.replace(/^\/story\//, "");
  const lastOpened = ctx?.memory.articles[slug]?.lastRead;

  return (
    <aside
      className="continue-ribbon is-visible thumb-zone"
      aria-label={t.ribbon.continue}
    >
      <div className="continue-ribbon__card">
        <div className="continue-ribbon__content">
          <p className="continue-ribbon__label">{t.ribbon.continue}</p>
          <p className="continue-ribbon__title">{target.label}</p>
          {lastOpened ? (
            <p className="continue-ribbon__meta">
              {new Date(lastOpened).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          ) : null}
          <div
            className="continue-ribbon__progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.ribbon.continue}
          >
            <span className="continue-ribbon__progress-pct" aria-hidden>
              {pct}%
            </span>
            <div
              className="continue-ribbon__progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="continue-ribbon__actions">
          <Link
            href={target.href}
            className="continue-ribbon__resume tap-target"
          >
            {t.ribbon.resume}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="continue-ribbon__dismiss tap-target"
            aria-label={t.ribbon.dismiss}
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}
