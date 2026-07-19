import Link from "next/link";
import { ArticleImage } from "./ArticleImage";
import { AiSummary, ActionRow, Tag } from "./primitives";
import { JdIcon } from "./icons";
import { hindiRelativeTime, storyHref, type ReaderStory } from "../utils";

/** The single strong lead story on discovery surfaces. */
export function LeadStory({ story, priority = true }: { story: ReaderStory; priority?: boolean }) {
  const time = story.timeLabel ?? hindiRelativeTime(story.publishedAt);
  return (
    <article style={{ padding: "10px 14px 4px" }}>
      <Link href={storyHref(story.slug)} style={{ display: "block", color: "inherit" }}>
        <ArticleImage
          src={story.imageUrl}
          alt={story.headline}
          ratio="lead"
          caption={story.kicker}
          priority={priority}
          sizes="(max-width: 640px) 100vw, 620px"
        />
        <div style={{ display: "flex", gap: 7, alignItems: "center", margin: "9px 0 4px", flexWrap: "wrap" }}>
          <Tag>{story.kicker ?? "प्रमुख"}</Tag>
          {time ? (
            <span
              className="jd-ui"
              style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--jd-muted)" }}
            >
              <JdIcon name="clock" size={11} stroke={1.7} color="var(--jd-muted)" />
              {time}
            </span>
          ) : null}
        </div>
        <h2
          className="jd-serif"
          style={{ margin: "0 0 4px", fontSize: 22, lineHeight: "29px", fontWeight: 700, color: "var(--jd-ink)" }}
        >
          {story.headline}
        </h2>
      </Link>
      {story.summary ? <AiSummary>{story.summary}</AiSummary> : null}
      <ActionRow slug={story.slug} />
    </article>
  );
}
