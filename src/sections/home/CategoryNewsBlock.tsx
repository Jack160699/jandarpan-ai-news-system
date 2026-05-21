import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { CATEGORY_BLOCKS, getFeedStory, type CategoryBlock } from "@/lib/home-feed";

type CategoryNewsBlockProps = {
  block: CategoryBlock;
};

export function CategoryNewsBlock({ block }: CategoryNewsBlockProps) {
  const stories = block.slugs
    .map((slug) => getFeedStory(slug))
    .filter(Boolean);

  if (!stories.length) return null;

  const sectionId = block.id === "sports" ? "sports" : undefined;

  return (
    <section
      id={sectionId}
      className="feed-section bg-[var(--paper-elevated)]"
      data-category={block.id}
    >
      <div className="feed-section__inner">
        <FeedSectionHeader
          title={block.title}
          titleHi={block.titleHi}
          href={block.href}
        />
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
