import { cn } from "@/lib/cn";

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "breaking" | "muted";
};

export function SectionLabel({
  children,
  className,
  variant = "default",
}: SectionLabelProps) {
  return (
    <span
      className={cn(
        "meta-label inline-block",
        variant === "breaking" && "!text-[var(--ds-live)]",
        variant === "muted" && "meta-label--muted",
        className
      )}
    >
      {children}
    </span>
  );
}
