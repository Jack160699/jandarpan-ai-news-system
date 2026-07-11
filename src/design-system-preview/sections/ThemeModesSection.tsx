"use client";

import { useTheme } from "@/design-system/hooks/useTheme";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

export function ThemeModesSection() {
  const { resolved } = useTheme();

  return (
    <PreviewSection
      id="theme-modes"
      title="Light & Dark Mode"
      description="Toggle between light (warm paper) and dark (AMOLED) themes using the control in the header. Currently active: the mode shown below."
    >
      <PreviewPanel label={`Active theme: ${resolved}`}>
        <div
          style={{
            padding: "var(--jds-space-xl)",
            borderRadius: "var(--jds-radius-md)",
            background: "var(--jds-color-surface-primary)",
            border: "1px solid var(--jds-color-border-subtle)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--jds-font-display)",
              fontSize: "var(--jds-text-h3)",
              fontWeight: 700,
              color: "var(--jds-color-text-primary)",
            }}
          >
            Editorial surfaces adapt to theme
          </p>
          <p
            style={{
              marginTop: "var(--jds-space-sm)",
              color: "var(--jds-color-text-secondary)",
              fontSize: "var(--jds-text-body)",
            }}
          >
            Background, surface, text, and border tokens all switch via{" "}
            <code>html[data-theme]</code> and <code>html[data-jds-theme]</code>.
          </p>
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
