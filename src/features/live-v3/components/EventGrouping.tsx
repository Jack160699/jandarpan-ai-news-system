"use client";

import Link from "next/link";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { LiveV3EventGroup } from "../types";
import { LiveBadge } from "./LiveBadge";

export type EventGroupingProps = {
  groups: LiveV3EventGroup[];
  freshIds?: ReadonlySet<string>;
};

export function EventGrouping({ groups, freshIds }: EventGroupingProps) {
  const { language } = useLanguage();

  if (groups.length === 0) return null;

  return (
    <div className="lv3-event-groups" role="list" aria-label="Grouped live events">
      {groups.map((group) => (
        <article
          key={group.id}
          className="lv3-event-group lv3-enter"
          role="listitem"
        >
          <header className="lv3-event-group__header">
            <div className="lv3-event-group__badges">
              {group.isBreaking ? (
                <LiveBadge label="Breaking" variant="breaking" />
              ) : null}
              {group.isLive ? <LiveBadge /> : null}
              {group.updateCount > 1 ? (
                <span className="lv3-event-group__count">
                  {group.updateCount} updates
                </span>
              ) : null}
            </div>
            <time
              className="lv3-event-group__time"
              dateTime={group.latestAt}
            >
              {formatHomeTime(group.latestAt, language)}
            </time>
          </header>

          <h3 className="lv3-event-group__title">{group.title}</h3>

          {group.items.length > 1 ? (
            <ul className="lv3-event-group__updates" role="list">
              {group.items.slice(1).map((item) => {
                const isFresh = freshIds?.has(item.id) ?? false;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/story/${item.slug}`}
                      className={`lv3-event-group__link${isFresh ? " lv3-event-group__link--fresh" : ""}`}
                    >
                      <span className="lv3-event-group__headline">
                        {item.headline}
                      </span>
                      <time dateTime={item.publishedAt}>
                        {formatHomeTime(item.publishedAt, language)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Link
              href={`/story/${group.items[0].slug}`}
              className="lv3-event-group__cta tap-target"
            >
              Read full story
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
