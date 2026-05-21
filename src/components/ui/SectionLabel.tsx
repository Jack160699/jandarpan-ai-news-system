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
        "meta-label inline-block tracking-[0.28em] uppercase",
        variant === "breaking" && "text-[var(--accent-breaking)]",
        variant === "muted" && "text-[var(--ink-muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}
