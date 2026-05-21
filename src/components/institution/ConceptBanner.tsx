import { BRAND } from "@/lib/brand";

export function ConceptBanner() {
  return (
    <div className="concept-banner" role="note">
      <p className="concept-banner__text">
        {BRAND.conceptLabel} — Not affiliated with CG Bhaskar. A speculative next-generation
        regional news experience for presentation purposes.
      </p>
    </div>
  );
}
