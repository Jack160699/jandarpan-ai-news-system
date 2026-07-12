import { memo, type ReactNode } from "react";
import { cn } from "@/design-system/utils/cn";

export type AtlasFactBoxVariant = "facts" | "timeline" | "numbers" | "explainer";

type AtlasFactBoxProps = {
  title: string;
  variant?: AtlasFactBoxVariant;
  children: ReactNode;
  className?: string;
};

export const AtlasFactBox = memo(function AtlasFactBox({
  title,
  variant = "facts",
  children,
  className,
}: AtlasFactBoxProps) {
  return (
    <aside
      className={cn("atlas-fact-box", `atlas-fact-box--${variant}`, className)}
      aria-label={title}
    >
      <h2 className="atlas-fact-box__title">{title}</h2>
      <div className="atlas-fact-box__body">{children}</div>
    </aside>
  );
});
