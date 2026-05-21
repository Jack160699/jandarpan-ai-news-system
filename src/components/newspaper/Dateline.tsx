import { cn } from "@/lib/cn";

type DatelineProps = {
  date: string;
  edition?: string;
  className?: string;
};

export function Dateline({ date, edition, className }: DatelineProps) {
  return (
    <div
      className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1", className)}
    >
      <time className="meta-label">{date}</time>
      {edition ? (
        <span className="meta-label text-[var(--ink-muted)]">{edition}</span>
      ) : null}
    </div>
  );
}
