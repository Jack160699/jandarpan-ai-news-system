"use client";

import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import {
  CATEGORY_BLOCKS,
  getFeedStory,
  type CategoryBlock,
} from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

type CategoryNewsBlockProps = {
  block: CategoryBlock;
};

const CATEGORY_KEYS = {
  politics: "politics",
  chhattisgarh: "chhattisgarh",
  sports: "sports",
  business: "business",
} as const;

export function CategoryNewsBlock({ block }: CategoryNewsBlockProps) {
  const { t } = useLanguage();
  const stories = block.slugs.map((slug) => getFeedStory(slug)).filter(Boolean);

  if (!stories.length) return null;

  const sectionId = block.id === "sports" ? "sports" : undefined;
  const catKey = CATEGORY_KEYS[block.id as keyof typeof CATEGORY_KEYS];
  const title = catKey ? t.home.categories[catKey] : block.title;

  return (
    <section
      id={sectionId}
      className="feed-section bg-[var(--paper-elevated)]"
      data-category={block.id}
    >
      <div className="feed-section__inner">
        <FeedSectionHeader title={title} href={block.href} />
        <div
          className={`category-feed-grid ${
            stories.length > 1 ? "category-feed-grid--2" : ""
          }`}
        >
          {stories.map((story) => (
            <NewsCard
              key={story!.slug}
              story={story!}
              variant="horizontal"
              showExcerpt={stories.length === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryNewsSections() {
  return (
    <>
      {CATEGORY_BLOCKS.map((block) => (
        <CategoryNewsBlock key={block.id} block={block} />
      ))}
    </>
  );
}
