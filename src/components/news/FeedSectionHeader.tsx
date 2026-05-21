import Link from "next/link";

type FeedSectionHeaderProps = {
  title: string;
  titleHi?: string;
  href?: string;
  actionLabel?: string;
};

export function FeedSectionHeader({
  title,
  titleHi,
  href,
  actionLabel = "सभी",
}: FeedSectionHeaderProps) {
  return (
    <div className="feed-section-header">
      <div className="feed-section-header__titles">
        {titleHi ? (
          <span className="feed-section-header__hi">{titleHi}</span>
        ) : null}
        <h2 className="feed-section-header__title">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="feed-section-header__more tap-target">
          {actionLabel} →
        </Link>
      ) : null}
    </div>
  );
}
