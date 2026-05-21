import { PageShell } from "@/components/layout/PageShell";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import {
  ContinueRibbon,
  CuriosityTrail,
  ReadingJourneyTracker,
} from "@/components/editorial";
import {
  EditionClosure,
  EditionOpening,
  RitualEntry,
} from "@/components/institution";
import {
  AtmosphereController,
  CinematicBridge,
  EditorialFrame,
  FolioSequence,
  NarrativeSection,
  VisualDecompression,
} from "@/components/cinema";
import { folioChapters } from "@/lib/folio-chapters";
import {
  BreakingNews,
  EditorialGrid,
  Footer,
  Investigations,
  LivingArchive,
  Masthead,
  OpinionSection,
  PinnedNarrativeHero,
} from "@/sections";

export default function Home() {
  return (
    <PageShell>
      <LanguageGate />
      <ConceptBanner />
      <EditionOpening />
      <AtmosphereController />
      <ReadingJourneyTracker />
      <ContinueRibbon />
      <main
        data-narrative-root
        className="mobile-story-flow mobile-comfort thumb-zone relative z-[2] touch-scroll-zone pb-28"
      >
        <NarrativeSection atmosphere="neutral" dissolve={false}>
          <Masthead />
        </NarrativeSection>

        <RitualEntry />

        <CinematicBridge variant="light" />

        <NarrativeSection atmosphere="warm">
          <BreakingNews />
        </NarrativeSection>

        <PinnedNarrativeHero />

        <CinematicBridge />

        <VisualDecompression />

        <EditorialFrame
          statement="छत्तीसगढ़ के लिए, रिकॉर्ड के लिए।"
          subline="For Chhattisgarh · For the record · Since 1958"
        />

        <FolioSequence chapters={folioChapters} />

        <CinematicBridge />

        <NarrativeSection atmosphere="editorial">
          <EditorialGrid />
        </NarrativeSection>

        <VisualDecompression />

        <NarrativeSection atmosphere="warm">
          <OpinionSection />
        </NarrativeSection>

        <CinematicBridge variant="light" />

        <NarrativeSection atmosphere="warm">
          <Investigations />
        </NarrativeSection>

        <LivingArchive preview />

        <CuriosityTrail variant="home" title="Editorial trails" />

        <EditionClosure />

        <CinematicBridge />

        <NarrativeSection atmosphere="neutral">
          <Footer />
        </NarrativeSection>
      </main>
    </PageShell>
  );
}
