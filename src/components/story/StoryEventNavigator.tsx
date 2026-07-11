import Link from "next/link";
import { StoryTimeline } from "@/components/story/StoryTimeline";
import {
  buildEventProgressLines,
  formatClusterConfidenceLabel,
  formatEventStatusLabel,
  formatUpdateTypeLabel,
} from "@/lib/events/event-story-adapter";
import type { EventViewModel } from "@/lib/events/event-view-model";
import { formatRelativeTime } from "@/lib/i18n/format";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";

type StoryEventNavigatorProps = {
  vm: EventViewModel;
  displayLanguage: NewsroomLanguage;
  timeline?: StoryTimelineEvent[];
  timelineTitle?: string;
  showEventTimeline?: boolean;
};

function DevelopmentItem({
  update,
  liveHref,
  displayLanguage,
}: {
  update: EventViewModel["recent_updates"][number];
  liveHref: string | null;
  displayLanguage: NewsroomLanguage;
}) {
  const meta = (
    <>
      <time
        className="story-event-intel__development-time"
        dateTime={update.published_at}
      >
        {formatRelativeTime(update.published_at, displayLanguage)}
      </time>
      <span className="story-event-intel__development-type">
        {formatUpdateTypeLabel(update.update_type)}
      </span>
      {update.is_breaking ? (
        <span className="story-event-intel__development-breaking">Breaking</span>
      ) : null}
    </>
  );

  if (liveHref) {
    return (
      <Link href={liveHref} className="story-event-intel__development-link">
        <span className="story-event-intel__development-headline">
          {update.headline}
        </span>
        <span className="story-event-intel__development-meta">{meta}</span>
      </Link>
    );
  }

  return (
    <div className="story-event-intel__development-item">
      <p className="story-event-intel__development-headline">{update.headline}</p>
      <div className="story-event-intel__development-meta">{meta}</div>
    </div>
  );
}

export function StoryEventNavigator({
  vm,
  displayLanguage,
  timeline = [],
  timelineTitle = "Event timeline",
  showEventTimeline = false,
}: StoryEventNavigatorProps) {
  const statusLabel = formatEventStatusLabel(vm);
  const confidenceLabel = formatClusterConfidenceLabel(vm);
  const progressLines = buildEventProgressLines(vm, displayLanguage);
  const stats = vm.coverage_statistics;
  const liveHref = vm.coverage_slug ? `/live/${vm.coverage_slug}` : null;
  const showLiveCta = vm.is_live && Boolean(vm.coverage_slug);
  const recentDevelopments =
    vm.recent_updates.length > 1 ? vm.recent_updates.slice(0, 5) : [];

  return (
    <section
      className="story-event-intel"
      aria-label="Event intelligence"
    >
      <header className="story-event-intel__header">
        <h2
          id="story-event-intel-title"
          className="story-editorial-intel__section-title story-event-intel__title"
        >
          Event coverage
        </h2>
        {statusLabel ? (
          <span
            className={`story-editorial-intel__badge story-event-intel__status${
              vm.is_live ? " story-event-intel__status--live" : ""
            }`}
          >
            {statusLabel}
          </span>
        ) : null}
      </header>

      <div
        className="story-event-intel__overview"
        aria-labelledby="story-event-intel-title"
      >
        <p className="story-event-intel__event-title">{vm.canonical_title}</p>

        {vm.summary?.trim() ? (
          <p className="story-event-intel__summary">{vm.summary.trim()}</p>
        ) : null}

        <dl className="story-editorial-intel__reading-info story-event-intel__meta">
          {stats.update_count > 0 ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">
                Developments
              </dt>
              <dd className="story-editorial-intel__reading-value">
                {stats.update_count}
              </dd>
            </div>
          ) : null}
          {vm.latest_update?.published_at ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">
                Latest update
              </dt>
              <dd className="story-editorial-intel__reading-value">
                <time dateTime={vm.latest_update.published_at}>
                  {formatRelativeTime(
                    vm.latest_update.published_at,
                    displayLanguage
                  )}
                </time>
              </dd>
            </div>
          ) : null}
          {vm.signal_count > 0 ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">Sources</dt>
              <dd className="story-editorial-intel__reading-value">
                {vm.signal_count}
              </dd>
            </div>
          ) : null}
          {confidenceLabel ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">
                Cluster confidence
              </dt>
              <dd className="story-editorial-intel__reading-value">
                {confidenceLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {progressLines.length ? (
        <p className="story-event-intel__progress">
          {progressLines.join(" · ")}
        </p>
      ) : null}

      {recentDevelopments.length ? (
        <section
          className="story-event-intel__developments"
          aria-labelledby="story-event-developments-title"
        >
          <h3
            id="story-event-developments-title"
            className="story-editorial-intel__section-title"
          >
            Latest developments
          </h3>
          <ol className="story-event-intel__development-list">
            {recentDevelopments.map((update) => (
              <li key={update.id} className="story-event-intel__development-row">
                <DevelopmentItem
                  update={update}
                  liveHref={liveHref}
                  displayLanguage={displayLanguage}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : vm.latest_update ? (
        <section
          className="story-event-intel__developments"
          aria-labelledby="story-event-latest-title"
        >
          <h3
            id="story-event-latest-title"
            className="story-editorial-intel__section-title"
          >
            Latest update
          </h3>
          <DevelopmentItem
            update={vm.latest_update}
            liveHref={liveHref}
            displayLanguage={displayLanguage}
          />
        </section>
      ) : null}

      {showLiveCta && liveHref ? (
        <p className="story-event-intel__live-cta-wrap">
          <Link href={liveHref} className="story-event-intel__live-cta">
            Follow Live Coverage
          </Link>
        </p>
      ) : null}

      {!showLiveCta && liveHref ? (
        <p className="story-event-intel__secondary-cta">
          <Link href={liveHref} className="story-event-intel__link">
            {vm.related_metadata.coverage_headline?.trim() ||
              "View live coverage"}
          </Link>
        </p>
      ) : null}

      {showEventTimeline && timeline.length ? (
        <StoryTimeline events={timeline} title={timelineTitle} />
      ) : null}
    </section>
  );
}
