import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

export function AccessibilitySection() {
  return (
    <PreviewSection
      id="accessibility"
      title="Accessibility"
      description="Focus rings, ARIA patterns, semantic HTML, and reduced-motion support built into JDS primitives."
    >
      <PreviewPanel label="Patterns">
        <div className="jds-preview__a11y-list">
          <div className="jds-preview__a11y-item">
            <strong>Focus visible rings</strong>
            <p>Tab to any interactive element — buttons, inputs, and links use --jds-focus-ring.</p>
            <div className="jds-preview__row" style={{ marginTop: "var(--jds-space-md)" }}>
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </div>
          <div className="jds-preview__a11y-item">
            <strong>Form labels &amp; errors</strong>
            <p>Inputs associate label, hint, and error via aria-describedby and aria-invalid.</p>
            <Input
              label="Email address"
              hint="We'll never share your email."
              placeholder="you@example.com"
              style={{ marginTop: "var(--jds-space-md)", maxWidth: 320 }}
            />
            <Input
              label="Password"
              error="Password must be at least 8 characters."
              defaultValue="short"
              style={{ marginTop: "var(--jds-space-md)", maxWidth: 320 }}
            />
          </div>
          <div className="jds-preview__a11y-item">
            <strong>Loading states</strong>
            <p>Buttons expose aria-busy and disable interaction while loading.</p>
            <Button isLoading style={{ marginTop: "var(--jds-space-md)" }}>
              Submitting…
            </Button>
          </div>
          <div className="jds-preview__a11y-item">
            <strong>Reduced motion</strong>
            <p>
              Motion presets check prefers-reduced-motion. Enable it in OS settings to verify instant
              transitions.
            </p>
          </div>
          <div className="jds-preview__a11y-item">
            <strong>Live regions &amp; status</strong>
            <p>EmptyState, Loading, and ErrorState use role=&quot;status&quot; or role=&quot;alert&quot; appropriately.</p>
          </div>
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
