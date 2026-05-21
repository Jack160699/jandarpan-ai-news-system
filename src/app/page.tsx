import { PageShell } from "@/components/layout/PageShell";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { ContinueRibbon } from "@/components/editorial";
import { BreakingNews } from "@/sections/BreakingNews";
import { Footer } from "@/sections/Footer";
import {
  CategoryNewsSections,
  CityUpdatesStrip,
  HomeHeroBlock,
  HomeInvestigations,
  HomeNewsGrid,
  HomeOpinion,
  LiveDeskFeed,
  QuickReadList,
  TrendingStrip,
} from "@/sections/home";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `${BRAND.nameEn} — Today's Edition`,
  description:
    "Top headlines, live desk, city updates, and investigations from Chhattisgarh — CG Bhaskar concept digital edition.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell variant="news">
      <LanguageGate />
      <ConceptBanner />
      <ContinueRibbon />
      <main
        id="main-content"
        data-narrative-root
        className="home-news-flow mobile-comfort thumb-zone relative z-[2]"
        role="main"
      >
        <BreakingNews />
        <HomeHeroBlock />
        <TrendingStrip />
        <LiveDeskFeed />
        <HomeNewsGrid />
        <CityUpdatesStrip />
        <CategoryNewsSections />
        <QuickReadList />
        <HomeInvestigations />
        <HomeOpinion />
        <Footer />
      </main>
    </PageShell>
  );
}
