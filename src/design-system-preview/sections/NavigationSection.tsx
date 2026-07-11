import { Navigation } from "@/design-system/components/Navigation";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";
import { NAV_ITEMS } from "../sample-data";

export function NavigationSection() {
  return (
    <PreviewSection
      id="navigation"
      title="Navigation"
      description="Horizontal nav items with active state, icons, and section headers for page structure."
    >
      <PreviewPanel label="Navigation">
        <Navigation items={NAV_ITEMS} ariaLabel="Primary navigation demo" />
      </PreviewPanel>

      <PreviewPanel label="SectionHeader">
        <SectionHeader
          title="Top Stories"
          kicker="Curated from your district and statewide desks"
          actionLabel="View all"
          actionHref="#"
        />
      </PreviewPanel>
    </PreviewSection>
  );
}
