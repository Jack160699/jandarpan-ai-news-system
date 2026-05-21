"use client";

import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";

type FeedSectionHeaderProps = {
  title: string;
  href?: string;
  actionLabel?: string;
};

export function FeedSectionHeader({
  title,
  href,
  actionLabel,
}: FeedSectionHeaderProps) {
  const { t } = useLanguage();
  const more = actionLabel ?? t.common.all;

  return (
    <div className="feed-section-header">
      <div className="feed-section-header__titles">
        <h2 className="feed-section-header__title">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="feed-section-header__more tap-target">
          {more} →
        </Link>
      ) : null}
    </div>
  );
}
