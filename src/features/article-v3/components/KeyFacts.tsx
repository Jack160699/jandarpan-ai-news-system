import { EmptyState, SectionHeader } from "@/design-system";

type KeyFactsProps = {
  facts: string[];
  title?: string;
};

export function KeyFacts({ facts, title = "Key facts" }: KeyFactsProps) {
  const items = facts.filter((f) => f.trim());
  if (!items.length) return null;

  return (
    <section className="article-v3-facts article-v3__section" aria-labelledby="article-v3-facts-title">
      <SectionHeader title={title} />
      <ul className="article-v3-facts__list">
        {items.map((fact, i) => (
          <li key={i} className="article-v3-facts__item">
            <span className="article-v3-facts__marker" aria-hidden />
            <span>{fact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KeyFactsEmpty({ title = "Key facts" }: { title?: string }) {
  return (
    <section className="article-v3__section" aria-labelledby="article-v3-facts-empty">
      <SectionHeader title={title} />
      <EmptyState
        title="No key facts available"
        description="Editorial highlights will appear here when available."
      />
    </section>
  );
}
