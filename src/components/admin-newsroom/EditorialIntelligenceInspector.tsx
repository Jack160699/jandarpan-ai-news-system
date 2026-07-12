"use client";

import Link from "next/link";
import type { EditorialIntelligenceInspectorVm } from "@/lib/admin/editorial-intelligence-inspector";
import type {
  IntelligenceNavLink,
  IntelligenceSectionNav,
} from "@/lib/admin/intelligence-navigation";
import {
  formatClusterConfidenceLabel,
  formatUpdateTypeLabel,
} from "@/lib/events/event-story-adapter";
import type { EventViewModel } from "@/lib/events/event-view-model";
import { formatNewsDate, formatRelativeTime } from "@/lib/i18n/format";

type EditorialIntelligenceInspectorProps = {
  vm: EditorialIntelligenceInspectorVm;
};

type InspectorSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function InspectorSection({
  id,
  title,
  children,
  defaultOpen = false,
}: InspectorSectionProps) {
  return (
    <details
      className="anr-intel-inspector__section"
      open={defaultOpen}
    >
      <summary
        className="anr-intel-inspector__summary"
        id={`${id}-summary`}
        aria-controls={`${id}-panel`}
      >
        {title}
      </summary>
      <div
        id={`${id}-panel`}
        className="anr-intel-inspector__body"
        role="region"
        aria-labelledby={`${id}-summary`}
      >
        {children}
      </div>
    </details>
  );
}

function InspectorRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;

  return (
    <div className="anr-intel-inspector__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function InspectorChipList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="anr-intel-inspector__chip-block">
      <p className="anr-intel-inspector__chip-label">{label}</p>
      <ul className="anr-intel-inspector__chips">
        {items.map((item) => (
          <li key={`${label}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function InspectorNavActions({ nav }: { nav: IntelligenceSectionNav | null | undefined }) {
  if (!nav?.links.length) return null;

  return (
    <nav
      className="anr-intel-inspector__actions"
      aria-label="Section navigation"
    >
      <ul className="anr-intel-inspector__actions-list">
        {nav.links.map((entry) => (
          <li key={`${entry.href}-${entry.label}`}>
            <InspectorNavLinkItem link={entry} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function InspectorNavLinkItem({ link: navLink }: { link: IntelligenceNavLink }) {
  if (navLink.external) {
    return (
      <a
        href={navLink.href}
        className="anr-intel-inspector__action-link"
        aria-label={navLink.ariaLabel}
        target="_blank"
        rel="noopener noreferrer"
      >
        {navLink.label}
      </a>
    );
  }

  return (
    <Link
      href={navLink.href}
      className="anr-intel-inspector__action-link"
      aria-label={navLink.ariaLabel}
    >
      {navLink.label}
    </Link>
  );
}

function InspectorList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="anr-intel-inspector__list-block">
      <p className="anr-intel-inspector__chip-label">{label}</p>
      <ul className="anr-intel-inspector__list">
        {items.map((item) => (
          <li key={`${label}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatCoverageStatus(event: EventViewModel): string | null {
  const status = event.status?.trim();
  if (!status) return null;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatClusterConfidenceValue(event: EventViewModel): string | null {
  const label = formatClusterConfidenceLabel(event);
  const score =
    event.coverage_statistics.cluster_confidence_score ??
    event.cluster_confidence;
  if (label && score != null) {
    return `${label} (${Math.round(score * 100)}%)`;
  }
  return label ?? (score != null ? `${Math.round(score * 100)}%` : null);
}

function InspectorEventSection({
  event,
  nav,
}: {
  event: EventViewModel;
  nav: IntelligenceSectionNav | null | undefined;
}) {
  const stats = event.coverage_statistics;
  const sourceCount =
    stats.source_count > 0 ? stats.source_count : event.signal_count || null;
  const trackingSince = event.tracked_since
    ? formatNewsDate(event.tracked_since, "en", "medium")
    : null;
  const latestUpdate = event.latest_update;
  const coverageSlug = event.coverage_slug?.trim() || null;

  const statRows: Array<{ label: string; value: string | number }> = [];
  if (stats.update_count > 0) {
    statRows.push({ label: "Updates", value: stats.update_count });
  }
  if (stats.breaking_update_count > 0) {
    statRows.push({
      label: "Breaking updates",
      value: stats.breaking_update_count,
    });
  }
  if (stats.signal_count > 0) {
    statRows.push({ label: "Signals", value: stats.signal_count });
  }
  if (stats.provider_count > 0) {
    statRows.push({ label: "Providers", value: stats.provider_count });
  }
  if (stats.unique_source_count > 0) {
    statRows.push({
      label: "Unique sources",
      value: stats.unique_source_count,
    });
  }
  if (stats.first_update_at) {
    statRows.push({
      label: "First update",
      value: formatNewsDate(stats.first_update_at, "en", "medium"),
    });
  }
  if (stats.last_update_at) {
    statRows.push({
      label: "Last update",
      value: formatRelativeTime(stats.last_update_at, "en"),
    });
  }

  return (
    <InspectorSection id="inspector-event" title="Event">
      <InspectorNavActions nav={nav} />
      <InspectorRow label="Event title" value={event.canonical_title} />
      <InspectorRow label="Coverage status" value={formatCoverageStatus(event)} />
      <InspectorRow
        label="Live status"
        value={event.is_live ? "Live coverage" : null}
      />
      <InspectorRow
        label="Cluster confidence"
        value={formatClusterConfidenceValue(event)}
      />
      <InspectorRow label="Source count" value={sourceCount ?? undefined} />
      <InspectorRow
        label="Update count"
        value={stats.update_count > 0 ? stats.update_count : null}
      />
      <InspectorRow label="Tracking since" value={trackingSince} />
      {latestUpdate ? (
        <>
          <InspectorRow label="Latest update" value={latestUpdate.headline} />
          <InspectorRow
            label="Update type"
            value={formatUpdateTypeLabel(latestUpdate.update_type)}
          />
          <InspectorRow
            label="Latest published"
            value={formatRelativeTime(latestUpdate.published_at, "en")}
          />
        </>
      ) : null}
      <InspectorRow
        label="Coverage slug"
        value={coverageSlug ? `/live/${coverageSlug}` : null}
      />
      {statRows.length ? (
        <dl className="anr-intel-inspector__metrics">
          <p className="anr-intel-inspector__chip-label">Coverage statistics</p>
          {statRows.map((row) => (
            <div key={row.label} className="anr-intel-inspector__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <InspectorRow label="Event summary" value={event.summary?.trim() || null} />
      {event.source_attribution.length > 0 ? (
        <InspectorRow
          label="Attributed sources"
          value={event.source_attribution.length}
        />
      ) : null}
    </InspectorSection>
  );
}

export function EditorialIntelligenceInspector({
  vm,
}: EditorialIntelligenceInspectorProps) {
  if (!vm.hasContent) return null;

  const {
    editorial,
    trust,
    knowledge,
    generation,
    event,
    decision,
    workflow,
    version,
    navigation,
  } = vm;

  return (
    <section
      className="jd-editor-panel anr-intel-inspector"
      aria-label="Editorial intelligence inspector"
    >
      <h3>Intelligence inspector</h3>
      <p className="anr-intel-inspector__hint">Read-only metadata</p>

      {editorial ? (
        <InspectorSection
          id="inspector-editorial"
          title="Editorial intelligence"
          defaultOpen
        >
          <InspectorNavActions nav={navigation?.editorial} />
          <InspectorRow label="AI summary" value={editorial.aiSummary} />
          <InspectorList label="Takeaways" items={editorial.takeaways} />
          <InspectorRow
            label="Why this matters"
            value={editorial.whyThisMatters}
          />
          <InspectorChipList
            label="Entities"
            items={editorial.entities.map(
              (entity) => `${entity.name} (${entity.type})`
            )}
          />
          <InspectorChipList label="Topics" items={editorial.topicChips} />
          <InspectorRow
            label="Sources"
            value={
              editorial.sourceCount
                ? `${editorial.sourceCount} attributed`
                : null
            }
          />
          <InspectorRow
            label="Confidence"
            value={editorial.confidenceLabel}
          />
        </InspectorSection>
      ) : null}

      {trust?.hasLayer ? (
        <InspectorSection id="inspector-trust" title="Trust">
          <InspectorNavActions nav={navigation?.trust} />
          <InspectorRow label="Trust level" value={trust.trustLevel} />
          <InspectorRow label="Editorial status" value={trust.editorialStatus} />
          <InspectorRow label="Review status" value={trust.reviewStatus} />
          <InspectorRow
            label="Verification"
            value={trust.verificationState}
          />
          <InspectorRow label="Confidence" value={trust.confidenceLabel} />
          <InspectorList
            label="Source summary"
            items={trust.sourceSummaryLines}
          />
          <InspectorList
            label="AI disclosure"
            items={trust.aiDisclosureLines}
          />
          <InspectorChipList label="Badges" items={trust.badges} />
        </InspectorSection>
      ) : null}

      {knowledge ? (
        <InspectorSection id="inspector-knowledge" title="Knowledge">
          <InspectorNavActions nav={navigation?.knowledge} />
          <InspectorRow label="Category" value={knowledge.category} />
          <InspectorRow label="District" value={knowledge.district} />
          <InspectorChipList label="People" items={knowledge.people} />
          <InspectorChipList
            label="Organizations"
            items={knowledge.organizations}
          />
          <InspectorChipList label="Places" items={knowledge.locations} />
          <InspectorChipList label="Topics" items={knowledge.topics} />
          <InspectorChipList
            label="Reader keywords"
            items={knowledge.readerKeywords}
          />
        </InspectorSection>
      ) : null}

      {event ? (
        <InspectorEventSection event={event} nav={navigation?.event} />
      ) : null}

      {decision ? (
        <InspectorSection id="inspector-decision" title="Decision intelligence">
          <InspectorNavActions nav={navigation?.decision} />
          <InspectorList label="Why this decision" items={decision.explanations} />
        </InspectorSection>
      ) : null}

      {workflow ? (
        <InspectorSection id="inspector-workflow" title="Workflow intelligence">
          <InspectorNavActions nav={navigation?.workflow} />
          <InspectorRow label="Current stage" value={workflow.currentStage} />
          <InspectorRow
            label="Editorial status"
            value={workflow.editorialStatus}
          />
          <InspectorRow label="Publish state" value={workflow.publishState} />
          <InspectorRow
            label="Event-linked state"
            value={workflow.eventLinkedState}
          />
          <InspectorRow
            label="AI generation state"
            value={workflow.aiGenerationState}
          />
          <InspectorRow label="Review state" value={workflow.reviewState} />
          <InspectorRow label="Repair state" value={workflow.repairState} />
          <InspectorRow label="Fallback state" value={workflow.fallbackState} />
          <InspectorRow
            label="Last workflow timestamp"
            value={workflow.lastWorkflowTimestamp}
          />
          <InspectorRow
            label="Recommended next step"
            value={workflow.recommendedNextStep}
          />
        </InspectorSection>
      ) : null}

      {version ? (
        <InspectorSection id="inspector-version" title="Version intelligence">
          <InspectorNavActions nav={navigation?.version} />
          <InspectorRow
            label="Original generation"
            value={version.originalGeneration}
          />
          <InspectorRow
            label="Regeneration"
            value={version.regenerationDetected}
          />
          <InspectorRow
            label="Editorial repair"
            value={version.editorialRepair}
          />
          <InspectorRow
            label="Translation update"
            value={version.translationUpdate}
          />
          <InspectorRow
            label="AI confidence evolution"
            value={version.confidenceEvolution}
          />
          <InspectorRow label="Event linkage" value={version.eventLinkage} />
          <InspectorRow
            label="Current version state"
            value={version.currentVersionState}
          />
          <InspectorRow
            label="Latest modification"
            value={version.latestModification}
          />
          <InspectorRow label="Version summary" value={version.versionSummary} />
        </InspectorSection>
      ) : null}

      {generation ? (
        <InspectorSection id="inspector-generation" title="Generation metadata">
          <InspectorNavActions nav={navigation?.generation} />
          <InspectorRow label="Model" value={generation.model} />
          <InspectorRow label="Generated at" value={generation.generatedAt} />
          <InspectorRow
            label="Publish decision"
            value={generation.publishDecision}
          />
          <InspectorRow label="Desk template" value={generation.deskTemplate} />
          <InspectorRow label="Cost tier" value={generation.costTier} />
          <InspectorRow
            label="Source count"
            value={generation.sourceCount ?? undefined}
          />
          <InspectorRow
            label="Repaired"
            value={generation.repaired ? "Yes" : null}
          />
          <InspectorRow
            label="Used fallback"
            value={generation.usedFallback ? "Yes" : null}
          />
          <InspectorList
            label="Rejection reasons"
            items={generation.rejectionReasons}
          />
          {generation.qualityBreakdown ? (
            <dl className="anr-intel-inspector__metrics">
              {Object.entries(generation.qualityBreakdown).map(([key, value]) => (
                <div key={key} className="anr-intel-inspector__row">
                  <dt>{key.replace(/_/g, " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </InspectorSection>
      ) : null}
    </section>
  );
}
