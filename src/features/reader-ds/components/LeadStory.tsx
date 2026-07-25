import Link from "next/link";
import { ArticleImage } from "./ArticleImage";
import { AiSummary, ActionRow, Tag } from "./primitives";
import { hindiRelativeTime, storyHref, type ReaderStory } from "../utils";

/** Single strong lead — image, Hindi-safe lead type, AI summary, action row. */
export function LeadStory({ story, priority = true }: { story: ReaderStory; priority?: boolean }) {
  const time = story.timeLabel ?? hindiRelativeTime(story.publishedAt);
  return (
    <article style={{ padding: "10px 14px 4px" }}>
      <Link href={storyHref(story.slug)} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
        <ArticleImage
          src={story.imageUrl}
          alt={story.headline}
          altIsPhotoDescription={false}
          ratio="lead"
          caption={story.kicker ?? undefined}
          priority={priority}
          sizes="(max-width: 640px) 100vw, 620px"
          tone="city"
          category={story.kicker ?? "general"}
        />
        <div style={{ display: "flex", gap: 7, alignItems: "center", margin: "10px 0 6px", flexWrap: "wrap" }}>
          <Tag>{story.kicker ?? "प्रमुख"}</Tag>
          {time ? (
            <span className="jd-ui jd-type-meta" style={{ color: "var(--jd-muted)" }}>
              · {time}
            </span>
          ) : null}
        </div>
        <h2
          className="jd-serif jd-lead-title jd-type-lead"
          style={{
            margin: "0 0 6px",
            color: "var(--jd-ink)",
          }}
          title={story.headline}
        >
          {story.headline}
        </h2>
      </Link>
      {story.summary ? <AiSummary>{story.summary}</AiSummary> : null}
      <ActionRow slug={story.slug} title={story.headline} />
    </article>
  );
}
