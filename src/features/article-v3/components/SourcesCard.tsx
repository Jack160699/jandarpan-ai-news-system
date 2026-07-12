import { Card, CardBody, EmptyState, SectionHeader } from "@/design-system";
import type { EditorialSourceItem } from "@/lib/story/editorial-intelligence";

type SourcesCardProps = {
  sources: EditorialSourceItem[];
  sourceSummaryLines?: string[];
  title?: string;
};

function sourceKindLabel(kind: EditorialSourceItem["kind"]): string {
  if (kind === "official") return "Official";
  if (kind === "primary") return "Primary";
  return "Supporting";
}

export function SourcesCard({
  sources,
  sourceSummaryLines = [],
  title = "Sources",
}: SourcesCardProps) {
  if (!sources.length && !sourceSummaryLines.length) return null;

  return (
    <section
      className="article-v3-sources article-v3__section"
      aria-labelledby="article-v3-sources-title"
    >
      <SectionHeader title={title} />
      {sourceSummaryLines.length > 0 ? (
        <p className="article-v3-sources__summary">{sourceSummaryLines.join(" ")}</p>
      ) : null}
      {sources.length > 0 ? (
        <Card elevation="flat">
          <CardBody>
            <ul className="article-v3-sources__list">
              {sources.map((source) => (
                <li key={source.id} className="article-v3-sources__item">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-v3-sources__name"
                  >
                    {source.name}
                  </a>
                  <span className="article-v3-sources__kind">
                    {sourceKindLabel(source.kind)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}

export function SourcesCardEmpty({ title = "Sources" }: { title?: string }) {
  return (
    <section className="article-v3__section" aria-labelledby="article-v3-sources-empty">
      <SectionHeader title={title} />
      <EmptyState
        title="No sources listed"
        description="Source transparency details will appear here when available."
      />
    </section>
  );
}
