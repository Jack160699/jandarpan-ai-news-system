import { FeedSectionHeader } from "@/components/news/FeedSectionHeader";
import { NewsCard } from "@/components/news/NewsCard";
import { getFeedStory, HERO_FEED } from "@/lib/home-feed";

const SIDE_SLUGS = ["coal-auction-transparency", "bastar-health-camp", "raipur-metro-debate"];

export function HomeHeroBlock() {
  const sideStories = SIDE_SLUGS.map((slug) => getFeedStory(slug)!).filter(Boolean);

  return (
    <section id="top-news" className="news-scroll-target feed-section feed-section--flush">
      <div className="feed-section__inner">
        <FeedSectionHeader title="Top headlines" titleHi="मुख्य खबरें" href="#editorial" />
        <div className="home-hero">
          <div className="home-hero__main px-0">
            <NewsCard story={HERO_FEED} variant="featured" priority showExcerpt />
          </div>
          <div className="home-hero__side">
            {sideStories.map((story) => (
              <NewsCard key={story.slug} story={story} variant="horizontal" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
