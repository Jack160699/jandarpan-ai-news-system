import { spacingPx } from "@/design-system/tokens/spacing";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

export function SpacingSection() {
  return (
    <PreviewSection
      id="spacing"
      title="Spacing"
      description="4px base grid — consistent rhythm from xs (4px) through 5xl (96px)."
    >
      <PreviewPanel label="Scale">
        {Object.entries(spacingPx).map(([token, px]) => (
          <div key={token} className="jds-preview__spacing-bar">
            <span className="jds-preview__spacing-label">{token}</span>
            <div className="jds-preview__spacing-block" style={{ width: px, height: 16 }} />
            <span className="jds-preview__type-meta">{px}px · --jds-space-{token}</span>
          </div>
        ))}
      </PreviewPanel>
    </PreviewSection>
  );
}
