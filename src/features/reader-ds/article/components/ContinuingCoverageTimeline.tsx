import Link from "next/link";
import type { ContinuingCoverageVm } from "@/lib/events/continuing-coverage";
import { formatNewsDateTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { jdDsT, type JdDsLocale, type JdDsStringKey } from "../../i18n";

type ContinuingCoverageTimelineProps = {
  coverage: ContinuingCoverageVm;
  locale: JdDsLocale;
  language?: NewsroomLanguage;
};

function TimelineItem({
  item,
  locale,
  language,
  t,
}: {
  item: ContinuingCoverageVm["items"][number];
  locale: JdDsLocale;
  language: NewsroomLanguage;
  t: (key: JdDsStringKey, vars?: Record<string, string | number>) => string;
}) {
  const statusLabel = locale === "en" ? item.statusLabelEn : item.statusLabelHi;
  const timeIso = item.eventAt ?? item.publishedAt;
  const timeLabel = formatNewsDateTime(timeIso, language);
  const className = [
    "jd-coverage-timeline__item",
    item.isCurrent ? "is-current" : "",
    item.isLatest ? "is-latest" : "",
    !item.isCurrent && !item.isLatest ? "is-past" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div className="jd-coverage-timeline__rail" aria-hidden>
        <span className="jd-coverage-timeline__dot" />
      </div>
      <div className="jd-coverage-timeline__body">
        <div className="jd-coverage-timeline__meta">
          <time className="jd-ui jd-coverage-timeline__time" dateTime={timeIso}>
            {timeLabel}
          </time>
          <span className="jd-ui jd-coverage-timeline__status">{statusLabel}</span>
          {item.isLatest ? (
            <span className="jd-ui jd-coverage-timeline__latest-badge">
              {t("article.coverageLatest")}
            </span>
          ) : null}
          {item.isCurrent ? (
            <span className="jd-ui jd-coverage-timeline__current-badge">
              {t("article.coverageCurrent")}
            </span>
          ) : null}
        </div>
        <p className="jd-serif jd-coverage-timeline__headline">{item.headline}</p>
        {item.whatChanged ? (
          <p className="jd-ui jd-coverage-timeline__change">{item.whatChanged}</p>
        ) : null}
      </div>
    </>
  );

  if (item.isCurrent) {
    return (
      <li className={className} aria-current="true">
        <div className="jd-coverage-timeline__row">{body}</div>
      </li>
    );
  }

  return (
    <li className={className}>
      <Link
        href={item.href}
        className="jd-coverage-timeline__row jd-coverage-timeline__row--link"
      >
        {body}
      </Link>
    </li>
  );
}

function NavChip({
  href,
  label,
  muted,
}: {
  href: string | null;
  label: string;
  muted?: boolean;
}) {
  if (!href) {
    return (
      <span
        className={`jd-ui jd-coverage-timeline__nav-chip${muted ? " is-muted" : ""}`}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="jd-ui jd-coverage-timeline__nav-chip">
      {label}
    </Link>
  );
}

/**
 * Premium continuing-coverage module for multi-story event clusters.
 * Hierarchy: current article → this timeline → related → recommendations.
 */
export function ContinuingCoverageTimeline({
  coverage,
  locale,
  language = locale === "en" ? "en" : "hi",
}: ContinuingCoverageTimelineProps) {
  if (!coverage.showTimeline || coverage.items.length < 2) return null;

  const t = (key: JdDsStringKey, vars?: Record<string, string | number>) =>
    jdDsT(locale, key, vars);

  const { nav, collapsedItems, visibleItems, collapsedCount } = coverage;

  return (
    <section
      className="jd-coverage-timeline"
      aria-labelledby="jd-coverage-timeline-title"
      data-event-id={coverage.eventId}
    >
      <header className="jd-coverage-timeline__header">
        <h2 id="jd-coverage-timeline-title" className="jd-ui jd-coverage-timeline__title">
          {t("article.coverageTitle")}
        </h2>
        {coverage.eventTitle ? (
          <p className="jd-serif jd-coverage-timeline__event-title">
            {coverage.eventTitle}
          </p>
        ) : null}
        {coverage.clusterStatus === "ongoing" ? (
          <span className="jd-ui jd-coverage-timeline__cluster-status">
            {t("article.coverageOngoing")}
          </span>
        ) : coverage.clusterStatus === "resolved" ? (
          <span className="jd-ui jd-coverage-timeline__cluster-status is-resolved">
            {t("article.coverageResolved")}
          </span>
        ) : null}
      </header>

      <nav
        className="jd-coverage-timeline__nav"
        aria-label={t("article.coverageNavAria")}
      >
        <NavChip
          href={nav.previous?.href ?? null}
          label={t("article.coveragePrevious")}
          muted={!nav.previous}
        />
        <NavChip
          href={nav.next?.href ?? nav.latest?.href ?? null}
          label={
            nav.next
              ? t("article.coverageNext")
              : t("article.coverageLatestNav")
          }
          muted={!nav.next && !nav.latest}
        />
        {nav.overviewHref ? (
          <NavChip href={nav.overviewHref} label={t("article.coverageOverview")} />
        ) : null}
        {nav.districtHref ? (
          <NavChip href={nav.districtHref} label={t("article.coverageDistrict")} />
        ) : null}
        {nav.categoryHref ? (
          <NavChip href={nav.categoryHref} label={t("article.coverageTopic")} />
        ) : null}
      </nav>

      {collapsedCount > 0 ? (
        <details className="jd-coverage-timeline__older">
          <summary className="jd-ui jd-coverage-timeline__older-summary">
            {t("article.coverageOlder", { n: collapsedCount })}
          </summary>
          <ol className="jd-coverage-timeline__list">
            {collapsedItems.map((item) => (
              <TimelineItem
                key={item.id}
                item={item}
                locale={locale}
                language={language}
                t={t}
              />
            ))}
          </ol>
        </details>
      ) : null}

      <ol className="jd-coverage-timeline__list">
        {visibleItems.map((item) => (
          <TimelineItem
            key={item.id}
            item={item}
            locale={locale}
            language={language}
            t={t}
          />
        ))}
      </ol>

      {nav.overviewHref ? (
        <p className="jd-coverage-timeline__all">
          <Link href={nav.overviewHref} className="jd-ui jd-coverage-timeline__all-link">
            {t("article.coverageSeeAll")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
