"use client";

import { lightColors, darkColors } from "@/design-system/tokens/colors";
import { useTheme } from "@/design-system/hooks/useTheme";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

function flattenColors(
  colors: Record<string, unknown>,
  prefix = ""
): { name: string; value: string }[] {
  const entries: { name: string; value: string }[] = [];
  for (const [key, val] of Object.entries(colors)) {
    if (typeof val === "string") {
      entries.push({ name: prefix ? `${prefix}.${key}` : key, value: val });
    } else if (val && typeof val === "object") {
      entries.push(
        ...flattenColors(val as Record<string, unknown>, prefix ? `${prefix}.${key}` : key)
      );
    }
  }
  return entries;
}

export function ColorsSection() {
  const { resolved } = useTheme();
  const colors = resolved === "dark" ? darkColors : lightColors;
  const swatches = flattenColors(colors as unknown as Record<string, unknown>);

  return (
    <PreviewSection
      id="colors"
      title="Colors"
      description="Semantic tokens for backgrounds, surfaces, text, borders, brand, status, and editorial categories. Swatches reflect the active theme."
    >
      <PreviewPanel label={`Semantic palette (${resolved} mode)`}>
        <div className="jds-preview__grid jds-preview__grid--3">
          {swatches.map(({ name, value }) => (
            <div key={name} className="jds-preview__swatch">
              <div className="jds-preview__swatch-color" style={{ background: value }} />
              <span className="jds-preview__swatch-name">{name}</span>
              <span className="jds-preview__swatch-value">{value}</span>
            </div>
          ))}
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
