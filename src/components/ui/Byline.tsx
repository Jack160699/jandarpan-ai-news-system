import { cn } from "@/lib/cn";

type BylineProps = {
  author: string;
  role?: string;
  className?: string;
};

export function Byline({ author, role, className }: BylineProps) {
  return (
    <p className={cn("meta-label text-[var(--ink-muted)]", className)}>
      <span className="text-[var(--ink-primary)]">{author}</span>
      {role ? ` · ${role}` : null}
    </p>
  );
}
