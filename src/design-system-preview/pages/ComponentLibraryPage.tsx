"use client";

import { PreviewShell } from "../PreviewShell";
import { ButtonsSection } from "../sections/ButtonsSection";
import { InputsSection } from "../sections/InputsSection";
import { CardsSection } from "../sections/CardsSection";
import { NavigationSection } from "../sections/NavigationSection";
import { AllComponentsSection } from "../sections/AllComponentsSection";
import { AccessibilitySection } from "../sections/AccessibilitySection";

const NAV = [
  { id: "buttons", label: "Buttons" },
  { id: "inputs", label: "Inputs" },
  { id: "cards", label: "Cards" },
  { id: "navigation", label: "Navigation" },
  { id: "all-components", label: "All Components" },
  { id: "accessibility", label: "Accessibility" },
];

export function ComponentLibraryPage() {
  return (
    <PreviewShell
      title="Component Library"
      subtitle="Components"
      navItems={NAV}
      frameContent
    >
      <p className="jds-preview__notice">
        Complete JDP-001 inventory — 17 primitives. Use header controls to preview light/dark mode
        and responsive breakpoints.
      </p>
      <ButtonsSection />
      <InputsSection />
      <CardsSection />
      <NavigationSection />
      <AllComponentsSection />
      <AccessibilitySection />
    </PreviewShell>
  );
}
