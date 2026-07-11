import { ArticleMeta } from "@/design-system";

type ArticleFooterProps = {
  publishedAtLabel: string | null;
  updatedAtLabel: string | null;
  readTime: string;
  sourceCount: number;
  aiDisclosureLines?: string[];
};

export function ArticleFooter({
  publishedAtLabel,
  updatedAtLabel,
  readTime,
  sourceCount,
  aiDisclosureLines = [],
}: ArticleFooterProps) {
  const disclosures = aiDisclosureLines.filter((l) => l.trim());

  return (
    <footer className="article-v3-footer">
      <ArticleMeta
        publishedAt={publishedAtLabel ?? undefined}
        readTime={readTime}
        source={
          sourceCount > 0 ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}` : undefined
        }
      />
      {updatedAtLabel ? (
        <p className="article-v3-footer__meta">Updated {updatedAtLabel}</p>
      ) : null}
      {disclosures.length > 0 ? (
        <div>
          {disclosures.map((line, i) => (
            <p key={i} className="article-v3-footer__disclaimer">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="article-v3-footer__disclaimer">
          This article was produced by the Jan Darpan newsroom. AI-assisted summaries
          and editorial tools may have been used in preparation. Always verify critical
          information with primary sources.
        </p>
      )}
    </footer>
  );
}
