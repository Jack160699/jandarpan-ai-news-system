"use client";

import { PreviewShell } from "../PreviewShell";
import { TypographySection } from "../sections/TypographySection";
import { SpacingSection } from "../sections/SpacingSection";
import { ColorsSection } from "../sections/ColorsSection";
import { MotionSection } from "../sections/MotionSection";
import { ResponsiveSection } from "../sections/ResponsiveSection";
import { ThemeModesSection } from "../sections/ThemeModesSection";
import { AccessibilitySection } from "../sections/AccessibilitySection";

const NAV = [
  { id: "theme-modes", label: "Light & Dark" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "colors", label: "Colors" },
  { id: "motion", label: "Motion" },
  { id: "responsive", label: "Responsive" },
  { id: "accessibility", label: "Accessibility" },
];

export function DesignSystemPage() {
  return (
    <PreviewShell
      title="Design System"
      subtitle="Foundations"
      navItems={NAV}
      frameContent
    >
      <p className="jds-preview__notice">
        JDP-011 preview — isolated from production routes. Toggle light/dark mode and viewport
        width using the header controls.
      </p>
      <ThemeModesSection />
      <TypographySection />
      <SpacingSection />
      <ColorsSection />
      <MotionSection />
      <ResponsiveSection />
      <AccessibilitySection />
    </PreviewShell>
  );
}
