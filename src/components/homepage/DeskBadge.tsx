import type { NewsDeskLabel } from "@/lib/newsroom/desk-branding";

type DeskBadgeProps = {
  desk: NewsDeskLabel;
  variant?: "editorial" | "wire" | "breaking";
};

export function DeskBadge({ desk, variant = "editorial" }: DeskBadgeProps) {
  return (
    <span className={`nr-desk nr-desk--${variant}`} title={desk.nameHi}>
      {desk.name}
    </span>
  );
}
