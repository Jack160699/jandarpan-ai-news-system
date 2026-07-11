import { typography, type TypographyRole } from "@/design-system/tokens/typography";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

const ROLES: TypographyRole[] = [
  "display",
  "hero",
  "h1",
  "h2",
  "h3",
  "title",
  "body",
  "caption",
  "meta",
  "label",
  "button",
];

const SAMPLE = "Jan Darpan — trusted news for every district.";

export function TypographySection() {
  return (
    <PreviewSection
      id="typography"
      title="Typography"
      description="Editorial hierarchy using Playfair Display, Source Serif 4, DM Mono, and UI sans. All sizes use fluid clamp() where noted."
    >
      <PreviewPanel label="Type roles">
        {ROLES.map((role) => {
          const style = typography[role];
          return (
            <div key={role} className="jds-preview__type-sample">
              <p style={style}>{SAMPLE}</p>
              <p className="jds-preview__type-meta">
                {role} · {style.fontSize} · weight {style.fontWeight}
              </p>
            </div>
          );
        })}
      </PreviewPanel>
    </PreviewSection>
  );
}
