"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { ContinuingCoverageVm } from "@/lib/events/continuing-coverage";
import {
  getEventLastReadAt,
  getStoryReadState,
  markStoryRead,
} from "@/lib/engagement/story-state";
import { buildWhatChanged } from "@/lib/engagement/what-changed";
import { useSyncExternalStore } from "react";
import { useJdDsT } from "../i18n";

type WhatChangedPanelProps = {
  articleId: string;
  eventId?: string | null;
  coverage: ContinuingCoverageVm | null;
};

/** Session cache so we capture the prior cursor before writing the new visit. */
const priorVisitCache = new Map<string, string | null>();

function priorKey(articleId: string, eventId?: string | null) {
  return `${articleId}::${eventId ?? ""}`;
}

function readPriorCursor(articleId: string, eventId?: string | null): string | null {
  if (!articleId) return null;
  const key = priorKey(articleId, eventId);
  if (priorVisitCache.has(key)) return priorVisitCache.get(key) ?? null;
  const priorEvent = eventId ? getEventLastReadAt(eventId) : null;
  const priorArticle = getStoryReadState(articleId)?.lastReadAt ?? null;
  const prior = priorEvent ?? priorArticle;
  priorVisitCache.set(key, prior);
  return prior;
}

const emptySubscribe = () => () => {};

/**
 * “इस खबर में क्या बदला?” — shown when returning to a developing story.
 * Captures the prior cursor once, then records the current visit.
 */
export function WhatChangedPanel({
  articleId,
  eventId,
  coverage,
}: WhatChangedPanelProps) {
  const { t } = useJdDsT();

  const prior = useSyncExternalStore(
    emptySubscribe,
    () => readPriorCursor(articleId, eventId),
    () => null
  );

  const model = useMemo(
    () => buildWhatChanged(coverage, prior),
    [coverage, prior]
  );

  useEffect(() => {
    if (!articleId) return;
    markStoryRead({
      articleId,
      eventId: eventId ?? coverage?.eventId ?? null,
    });
  }, [articleId, eventId, coverage?.eventId]);

  if (!model || model.updateCount < 1) return null;

  return (
    <section
      className="jd-what-changed"
      data-testid="jd-what-changed"
      aria-label={t("changed.title")}
    >
      <h2 className="jd-serif jd-what-changed__title">{t("changed.title")}</h2>
      <p className="jd-ui jd-what-changed__count">
        {t("changed.count", { n: model.updateCount })}
      </p>
      <ol className="jd-what-changed__list">
        {model.updates.map((u) => (
          <li key={u.id}>
            <Link href={u.href} className="jd-what-changed__row">
              <time className="jd-ui" dateTime={u.sortAt}>
                {u.timeLabel}
              </time>
              <span className="jd-serif">
                {u.whatChanged?.trim() || u.headline}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {model.timelineHref ? (
        <Link href={model.timelineHref} className="jd-ui jd-what-changed__cta">
          {t("changed.seeTimeline")} →
        </Link>
      ) : null}
    </section>
  );
}
