import { Input } from "@/design-system/components/Input";
import { Search } from "@/design-system/components/Search";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

export function InputsSection() {
  return (
    <PreviewSection
      id="inputs"
      title="Inputs"
      description="Form inputs and search with labels, hints, errors, and clear affordances."
    >
      <PreviewPanel label="Input — default">
        <Input label="Full name" placeholder="Enter your name" style={{ maxWidth: 360 }} />
      </PreviewPanel>

      <PreviewPanel label="Input — with hint">
        <Input
          label="Phone number"
          hint="Include country code."
          placeholder="+91 98765 43210"
          style={{ maxWidth: 360 }}
        />
      </PreviewPanel>

      <PreviewPanel label="Input — error">
        <Input
          label="Username"
          error="Username is already taken."
          defaultValue="jan_darpan"
          style={{ maxWidth: 360 }}
        />
      </PreviewPanel>

      <PreviewPanel label="Input — disabled">
        <Input label="Account ID" defaultValue="JD-2026-011" disabled style={{ maxWidth: 360 }} />
      </PreviewPanel>

      <PreviewPanel label="Search">
        <Search placeholder="Search news, topics, districts…" style={{ maxWidth: 420 }} />
      </PreviewPanel>
    </PreviewSection>
  );
}
