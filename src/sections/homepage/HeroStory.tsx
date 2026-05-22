import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import type { HomeArticle } from "@/lib/homepage/types";

type HeroStoryProps = {
  article: HomeArticle;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function HeroStory({ article }: HeroStoryProps) {
  return (
    <section className="hp-hero hp__inner" aria-labelledby="hp-hero-title">
      <Link href={`/story/${article.slug}`} className="hp-hero__link">
        <div className="hp-hero__visual">
          <HomeArticleImage
            src={article.imageUrl}
            alt=""
            priority
            sizes="(max-width: 768px) 100vw, 58vw"
          />
        </div>
        <div className="hp-hero__content">
          <p className="hp__kicker">Lead story · {article.section}</p>
          {article.isLive ? <LiveBadge /> : null}
          <h1 id="hp-hero-title" className="hp-hero__headline">
            {article.headline}
          </h1>
          {article.summary ? (
            <p className="hp-hero__deck">{article.summary}</p>
          ) : null}
          <div className="hp-hero__meta">
            <span>{article.readingTime}</span>
            <span aria-hidden>·</span>
            <time dateTime={article.publishedAt}>
              {formatTime(article.publishedAt)}
            </time>
          </div>
        </div>
      </Link>
    </section>
  );
}
