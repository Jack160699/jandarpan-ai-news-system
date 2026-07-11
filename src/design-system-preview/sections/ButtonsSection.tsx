import { Button } from "@/design-system/components/Button";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

const VARIANTS = ["primary", "secondary", "outline", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;

export function ButtonsSection() {
  return (
    <PreviewSection
      id="buttons"
      title="Buttons"
      description="Primary interactive primitive with variant, size, loading, and disabled states."
    >
      <PreviewPanel label="Variants">
        <div className="jds-preview__row">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </PreviewPanel>

      <PreviewPanel label="Sizes">
        <div className="jds-preview__row">
          {SIZES.map((size) => (
            <Button key={size} size={size}>
              Size {size}
            </Button>
          ))}
        </div>
      </PreviewPanel>

      <PreviewPanel label="States">
        <div className="jds-preview__row">
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
