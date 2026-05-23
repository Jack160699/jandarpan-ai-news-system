import { StoryCardSkeleton } from "@/components/loading/HomepageLoadingView";

/**
 * Immersive story page skeleton — headline, hero, body, related
 */
export function StoryLoadingView() {
  return (
    <div
      className="immersive-story pl-story-page pl-stagger"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="immersive-story__shell">
        <div className="pl-shimmer-block pl-story-page__chrome pl-stagger-item" />

        <header className="immersive-story__header pt-6 pl-stagger-item">
          <div className="pl-shimmer-block pl-story-page__kicker" />
          <div className="pl-shimmer-block pl-story-page__headline" />
          <div className="pl-shimmer-block pl-story-page__headline pl-story-page__headline--2" />
          <div className="pl-shimmer-block pl-story-page__dek" />
        </header>

        <div className="pl-shimmer-block pl-story-page__hero pl-stagger-item" />

        <div className="pl-shimmer-block pl-story-page__summary pl-stagger-item" />

        <div className="mt-8 space-y-0 pl-stagger-item" aria-hidden>
          <div className="pl-shimmer-block pl-story-page__para" />
          <div className="pl-shimmer-block pl-story-page__para" />
          <div className="pl-shimmer-block pl-story-page__para" />
          <div className="pl-shimmer-block pl-story-page__para pl-story-page__para--short" />
          <div className="pl-shimmer-block pl-story-page__para" />
          <div className="pl-shimmer-block pl-story-page__para" />
          <div className="pl-shimmer-block pl-story-page__para pl-story-page__para--short" />
        </div>

        <aside className="pl-story-related pl-stagger-item" aria-hidden>
          <div className="pl-shimmer-block pl-story-related__title" />
          <StoryCardSkeleton compact />
          <StoryCardSkeleton compact />
          <StoryCardSkeleton compact />
        </aside>
      </div>
    </div>
  );
}
