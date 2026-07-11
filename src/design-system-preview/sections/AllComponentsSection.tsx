import { Badge } from "@/design-system/components/Badge";
import { Chip } from "@/design-system/components/Chip";
import { Avatar } from "@/design-system/components/Avatar";
import { ArticleMeta } from "@/design-system/components/ArticleMeta";
import { AISummary } from "@/design-system/components/AISummary";
import { Loading } from "@/design-system/components/Loading";
import { Skeleton } from "@/design-system/components/Skeleton";
import { EmptyState } from "@/design-system/components/EmptyState";
import { ErrorState } from "@/design-system/components/ErrorState";
import { Button } from "@/design-system/components/Button";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";
import { SAMPLE_AUTHOR, SAMPLE_DATE, SAMPLE_READ_TIME, SAMPLE_SUMMARY } from "../sample-data";

const BADGE_VARIANTS = [
  "default",
  "brand",
  "breaking",
  "ai",
  "success",
  "warning",
  "danger",
] as const;

export function AllComponentsSection() {
  return (
    <PreviewSection
      id="all-components"
      title="All Components"
      description="Complete JDP-001 component inventory — 17 primitives."
    >
      <div className="jds-preview__grid jds-preview__grid--2">
        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">Badge</p>
          <div className="jds-preview__badge-row">
            {BADGE_VARIANTS.map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">Chip</p>
          <div className="jds-preview__badge-row">
            <Chip>Politics</Chip>
            <Chip selected>Raipur</Chip>
            <Chip topic="sports">Sports</Chip>
          </div>
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">Avatar</p>
          <div className="jds-preview__row">
            <Avatar initials="PS" size="sm" />
            <Avatar initials="PS" size="md" />
            <Avatar initials="PS" size="lg" />
            <Avatar
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
              alt="Reporter"
              size="md"
            />
          </div>
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">ArticleMeta</p>
          <ArticleMeta
            author={SAMPLE_AUTHOR}
            publishedAt={SAMPLE_DATE}
            readTime={SAMPLE_READ_TIME}
          />
        </div>

        <div className="jds-preview__component-card" style={{ gridColumn: "1 / -1" }}>
          <p className="jds-preview__component-name">AISummary</p>
          <AISummary summary={SAMPLE_SUMMARY} />
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">Loading</p>
          <Loading label="Fetching stories…" />
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">Skeleton</p>
          <div style={{ display: "grid", gap: "var(--jds-space-sm)" }}>
            <Skeleton variant="title" />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </div>
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">EmptyState</p>
          <EmptyState
            title="No saved stories"
            description="Stories you bookmark will appear here."
          >
            <Button variant="outline" size="sm">
              Browse news
            </Button>
          </EmptyState>
        </div>

        <div className="jds-preview__component-card">
          <p className="jds-preview__component-name">ErrorState</p>
          <ErrorState
            title="Unable to load"
            description="Check your connection and try again."
            actions={
              <Button variant="outline" size="sm">
                Retry
              </Button>
            }
          />
        </div>
      </div>
    </PreviewSection>
  );
}
