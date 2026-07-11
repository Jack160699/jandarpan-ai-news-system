import { breakpointsPx } from "@/design-system/tokens/breakpoints";
import { NewsCard } from "@/design-system/components/NewsCard";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";
import {
  SAMPLE_AUTHOR,
  SAMPLE_DATE,
  SAMPLE_EXCERPT,
  SAMPLE_HEADLINE,
  SAMPLE_IMAGE,
  SAMPLE_READ_TIME,
} from "../sample-data";

export function ResponsiveSection() {
  return (
    <PreviewSection
      id="responsive"
      title="Responsive"
      description="Mobile-first breakpoints. Use the viewport toggle in the header to preview at 375px, 768px, or full width."
    >
      <PreviewPanel label="Breakpoint scale">
        <div className="jds-preview__grid jds-preview__grid--2">
          {Object.entries(breakpointsPx).map(([name, px]) => (
            <div key={name} className="jds-preview__component-card">
              <p className="jds-preview__component-name">{name}</p>
              <p>{px === 0 ? "< 768px (default)" : `≥ ${px}px`}</p>
            </div>
          ))}
        </div>
      </PreviewPanel>

      <PreviewPanel label="Component reflow — NewsCard">
        <NewsCard
          headline={SAMPLE_HEADLINE}
          excerpt={SAMPLE_EXCERPT}
          imageUrl={SAMPLE_IMAGE}
          category="Politics"
          categoryVariant="politics"
          author={SAMPLE_AUTHOR}
          publishedAt={SAMPLE_DATE}
          readTime={SAMPLE_READ_TIME}
          layout="vertical"
        />
      </PreviewPanel>
    </PreviewSection>
  );
}
