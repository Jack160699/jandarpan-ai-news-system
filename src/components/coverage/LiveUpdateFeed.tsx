import type { LiveUpdateBlock } from "@/lib/news/coverage/read";
import { formatPublishedAt } from "@/lib/news-db";

type LiveUpdateFeedProps = {
  blocks: LiveUpdateBlock[];
  title?: string;
};

export function LiveUpdateFeed({
  blocks,
  title = "Live updates",
}: LiveUpdateFeedProps) {
  if (!blocks.length) return null;

  return (
    <section className="live-updates" aria-labelledby="live-updates-title">
      <h2 id="live-updates-title" className="live-updates__title">
        {title}
      </h2>
      <ol className="live-updates__list">
        {blocks.map((block) => (
          <li
            key={block.id}
            className={`live-updates__item${block.isBreaking ? " live-updates__item--breaking" : ""}`}
          >
            <header className="live-updates__meta">
              {block.isBreaking ? (
                <span className="live-updates__badge">Breaking</span>
              ) : null}
              <time dateTime={block.publishedAt}>
                {formatPublishedAt(block.publishedAt)}
              </time>
              {block.clusterConfidence != null ? (
                <span className="live-updates__conf">
                  {Math.round(block.clusterConfidence * 100)}% match
                </span>
              ) : null}
            </header>
            <h3 className="live-updates__headline">{block.headline}</h3>
            {block.summary ? (
              <p className="live-updates__summary">{block.summary}</p>
            ) : null}
            {block.sources.length > 0 ? (
              <ul className="live-updates__sources">
                {block.sources.map((src, i) => (
                  <li key={`${block.id}-src-${i}`}>
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {src.name}
                      </a>
                    ) : (
                      <span>{src.name}</span>
                    )}
                    <span className="live-updates__src-conf">
                      {Math.round(src.confidence * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
