import {
  CategoryNewsSections,
  CityUpdatesStrip,
  HomeHeroBlock,
  HomeInvestigations,
  HomeNewsGrid,
  HomeOpinion,
  LiveDeskFeed,
  QuickReadList,
} from "@/sections/home";

/**
 * Static regional editorial desk — shown below live wire or as fallback.
 */
export function EditorialHomeSections() {
  return (
    <>
      <div className="feed-section border-t border-[var(--rule)] bg-[var(--paper)]">
        <div className="feed-section__inner py-3">
          <p className="meta-label text-[var(--ink-faint)]">
            हमार छत्तीसगढ़ · क्षेत्रीय अंक
          </p>
        </div>
      </div>
      <HomeHeroBlock />
      <LiveDeskFeed />
      <HomeNewsGrid />
      <CityUpdatesStrip />
      <CategoryNewsSections />
      <QuickReadList />
      <HomeInvestigations />
      <HomeOpinion />
    </>
  );
}
