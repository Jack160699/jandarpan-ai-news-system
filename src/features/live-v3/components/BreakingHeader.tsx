"use client";

import Link from "next/link";
import type { HomeArticle } from "@/lib/homepage/types";
import { LiveBadge } from "./LiveBadge";

export type BreakingHeaderProps = {
  items: HomeArticle[];
};

export function BreakingHeader({ items }: BreakingHeaderProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="lv3-breaking-header lv3-enter"
      aria-labelledby="lv3-breaking-title"
    >
      <div className="lv3-breaking-header__top">
        <LiveBadge label="Breaking" variant="breaking" />
        <h2 id="lv3-breaking-title" className="lv3-breaking-header__title">
          Breaking now
        </h2>
      </div>
      <ul className="lv3-breaking-header__list" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/story/${item.slug}`} className="lv3-breaking-header__link">
              <span className="lv3-breaking-header__headline">{item.headline}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
