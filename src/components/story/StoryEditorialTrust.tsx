import { StoryQualityBadges } from "@/components/story/StoryQualityBadges";
import type { EditorialTrustVm } from "@/lib/story/editorial-trust";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

type StoryEditorialTrustProps = {
  vm: EditorialTrustVm;
  displayLanguage: NewsroomLanguage;
};

export function StoryEditorialTrust({
  vm,
  displayLanguage: _displayLanguage,
}: StoryEditorialTrustProps) {
  if (!vm.hasLayer) return null;

  return (
    <section
      className="story-editorial-trust"
      aria-label="Editorial trust and transparency"
    >
      <header className="story-editorial-trust__header">
        <h2
          id="story-editorial-trust-title"
          className="story-editorial-intel__section-title story-editorial-trust__title"
        >
          Editorial trust
        </h2>
        {vm.trustLevel ? (
          <span className="story-editorial-intel__badge story-editorial-trust__level">
            {vm.trustLevel}
          </span>
        ) : null}
      </header>

      <StoryQualityBadges badges={vm.badges} />

      {vm.sourceSummaryLines.length ? (
        <div
          className="story-editorial-trust__source-summary"
          aria-labelledby="story-trust-source-summary-title"
        >
          <h3
            id="story-trust-source-summary-title"
            className="story-editorial-intel__section-title"
          >
            Source summary
          </h3>
          <ul className="story-editorial-trust__summary-list">
            {vm.sourceSummaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {vm.showUpdateHistory ? (
        <div
          className="story-editorial-trust__history"
          aria-labelledby="story-trust-history-title"
        >
          <h3
            id="story-trust-history-title"
            className="story-editorial-intel__section-title"
          >
            Update history
          </h3>
          <dl className="story-editorial-intel__reading-info">
            {vm.publishedAtLabel ? (
              <div className="story-editorial-intel__reading-item">
                <dt className="story-editorial-intel__reading-label">
                  Originally published
                </dt>
                <dd className="story-editorial-intel__reading-value">
                  {vm.publishedAtIso ? (
                    <time dateTime={vm.publishedAtIso}>
                      {vm.publishedAtLabel}
                    </time>
                  ) : (
                    vm.publishedAtLabel
                  )}
                </dd>
              </div>
            ) : null}
            {vm.lastUpdatedLabel ? (
              <div className="story-editorial-intel__reading-item">
                <dt className="story-editorial-intel__reading-label">
                  Last updated
                </dt>
                <dd className="story-editorial-intel__reading-value">
                  {vm.lastUpdatedIso ? (
                    <time dateTime={vm.lastUpdatedIso}>
                      {vm.lastUpdatedLabel}
                    </time>
                  ) : (
                    vm.lastUpdatedLabel
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {vm.aiDisclosureLines.length ? (
        <div
          className="story-editorial-trust__ai"
          aria-labelledby="story-trust-ai-title"
        >
          <h3
            id="story-trust-ai-title"
            className="story-editorial-intel__section-title"
          >
            How this was produced
          </h3>
          <ul className="story-editorial-trust__ai-list">
            {vm.aiDisclosureLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {(vm.confidenceLabel ||
        vm.clusterConfidenceLabel ||
        vm.verificationState ||
        vm.changeHistorySummary) && (
        <dl className="story-editorial-intel__reading-info story-editorial-trust__meta">
          {vm.confidenceLabel ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">Confidence</dt>
              <dd className="story-editorial-intel__reading-value">
                {vm.confidenceLabel}
              </dd>
            </div>
          ) : null}
          {vm.clusterConfidenceLabel ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">
                Cluster confidence
              </dt>
              <dd className="story-editorial-intel__reading-value">
                {vm.clusterConfidenceLabel}
              </dd>
            </div>
          ) : null}
          {vm.verificationState ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">
                Verification
              </dt>
              <dd className="story-editorial-intel__reading-value">
                {vm.verificationState}
              </dd>
            </div>
          ) : null}
          {vm.reviewStatus ? (
            <div className="story-editorial-intel__reading-item">
              <dt className="story-editorial-intel__reading-label">Review</dt>
              <dd className="story-editorial-intel__reading-value">
                {vm.reviewStatus}
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      {vm.changeHistorySummary ? (
        <p className="story-editorial-trust__change-summary">
          {vm.changeHistorySummary}
        </p>
      ) : null}
    </section>
  );
}
