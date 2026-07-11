import Link from "next/link";
import { Chip, EmptyState, SectionHeader } from "@/design-system";

type DistrictContextProps = {
  district: string | null;
  districtSlug: string | null;
  topics: string[];
  title?: string;
};

export function DistrictContext({
  district,
  districtSlug,
  topics,
  title = "Local context",
}: DistrictContextProps) {
  const hasDistrict = Boolean(district?.trim());
  const topicItems = topics.filter((t) => t.trim());

  if (!hasDistrict && !topicItems.length) return null;

  return (
    <section
      className="article-v3-district article-v3__section"
      aria-labelledby="article-v3-district-title"
    >
      <SectionHeader title={title} />
      {hasDistrict && districtSlug ? (
        <Link href={`/district/${districtSlug}`} className="article-v3-district__link">
          <span aria-hidden>📍</span>
          {district}
        </Link>
      ) : hasDistrict ? (
        <p className="article-v3-district__link">{district}</p>
      ) : null}
      {topicItems.length > 0 ? (
        <ul className="article-v3-district__topics">
          {topicItems.slice(0, 8).map((topic) => (
            <li key={topic}>
              <Chip disabled>{topic}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function DistrictContextEmpty({ title = "Local context" }: { title?: string }) {
  return (
    <section className="article-v3__section" aria-labelledby="article-v3-district-empty">
      <SectionHeader title={title} />
      <EmptyState
        title="No local context"
        description="District and topic context will appear for regional stories."
      />
    </section>
  );
}
